import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Result } from '../domain/rules';
import {
  arrive as applyArrive,
  deliver as applyDeliver,
  fail as applyFail,
  undoDeliver as applyUndoDeliver,
} from '../domain/rules';
import { FailReason, QueuedAction, Stop, SyncState } from '../domain/types';
import { loadInitialRoute } from '../data/loadInitialRoute';
import { MockServer } from '../sync/MockServer';
import { SyncEngine } from '../sync/SyncEngine';
import { storage, waitForLastWrite } from './storage';
import { syncStateByStop as getSyncStateByStop } from './syncState';

export interface RouteAuth {
  agentName: string | null;
}

export interface RouteSettings {
  demoClockMinutes: number;
  offlineMode: boolean;
}

export interface RouteState {
  auth: RouteAuth;
  stops: Stop[];
  queue: QueuedAction[];
  settings: RouteSettings;
  startedAt: number;
  hasHydrated: boolean;
  signIn: (agentName: string) => void;
  signOut: () => void;
  arrive: (stopId: string) => Promise<string | undefined>;
  deliver: (
    stopId: string,
    recipient: string,
    confirmedPackages: number,
    nowMs?: number,
  ) => Promise<string | undefined>;
  fail: (
    stopId: string,
    reason: FailReason,
    note: string,
  ) => Promise<string | undefined>;
  undoDeliver: (stopId: string, nowMs?: number) => Promise<string | undefined>;
  retrySync: (requestId: string) => Promise<void>;
  setDemoClock: (demoClockMinutes: number) => void;
  setOffline: (offlineMode: boolean) => void;
  resetDemo: () => Promise<void>;
}

const initialStops = loadInitialRoute();
const defaultState = {
  auth: { agentName: null },
  stops: initialStops,
  queue: [] as QueuedAction[],
  settings: { demoClockMinutes: 9 * 60, offlineMode: false },
  startedAt: Date.now(),
  hasHydrated: false,
};

const server = new MockServer();
const actionLocks = new Set<string>();

const queuesEqual = (left: QueuedAction[], right: QueuedAction[]): boolean =>
  left.length === right.length &&
  left.every((action, index) => JSON.stringify(action) === JSON.stringify(right[index]));

export const syncEngine = new SyncEngine(
  server,
  async () => useRouteStore.getState().queue,
  async (queue) => {
    if (!queuesEqual(useRouteStore.getState().queue, queue)) {
      useRouteStore.setState({ queue });
    }
    await waitForLastWrite();
  },
);

const commitRule = async (
  result: Result<Stop[]>,
  previousStops: Stop[],
  stopId: string,
  type: QueuedAction['type'],
  payload: Record<string, unknown>,
): Promise<string | undefined> => {
  if (!result.ok) return result.error;

  const lockKey = stopId;
  if (actionLocks.has(lockKey)) return 'Action already in progress.';
  actionLocks.add(lockKey);
  const previousStop = previousStops.find((stop) => stop.id === stopId);
  try {
    await syncEngine.enqueue(
      {
        stopId,
        type,
        payload,
        createdAt: Date.now(),
      },
      {
        // The first persisted Zustand snapshot contains both sides of the
        // optimistic update, preventing a delivered stop without its queue item.
        onOptimistic: () => useRouteStore.setState({ stops: result.value, queue: syncEngine.getQueue() }),
        onRollback: () => {
          if (!previousStop) return;
          useRouteStore.setState((state) => ({
            stops: state.stops.map((stop) => (stop.id === stopId ? previousStop : stop)),
          }));
        },
      },
    );
  } catch (error) {
    console.error('Route action could not be queued', error);
    return 'Unable to save this action. Please try again.';
  } finally {
    actionLocks.delete(lockKey);
  }
  return undefined;
};

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      signIn: (agentName) => set({ auth: { agentName: agentName.trim() } }),

      signOut: () => set({ auth: { agentName: null } }),

      arrive: async (stopId) => {
        const previousStops = get().stops;
        const result = applyArrive(previousStops, stopId);
        return commitRule(result, previousStops, stopId, 'ARRIVE', {});
      },

      deliver: async (stopId, recipient, confirmedPackages, nowMs = Date.now()) => {
        const previousStops = get().stops;
        const demoMinutes = get().settings.demoClockMinutes;
        const result = applyDeliver(
          previousStops,
          stopId,
          recipient,
          confirmedPackages,
          nowMs,
          demoMinutes,
        );
        return commitRule(result, previousStops, stopId, 'DELIVER', {
          recipient,
          confirmedPackages,
          nowMs,
          demoMinutes,
        });
      },

      fail: async (stopId, reason, note) => {
        const previousStops = get().stops;
        const demoMinutes = get().settings.demoClockMinutes;
        const result = applyFail(previousStops, stopId, reason, note, demoMinutes);
        return commitRule(result, previousStops, stopId, 'FAIL', { reason, note, demoMinutes });
      },

      undoDeliver: async (stopId, nowMs = Date.now()) => {
        const previousStops = get().stops;
        const result = applyUndoDeliver(previousStops, stopId, nowMs);
        return commitRule(result, previousStops, stopId, 'UNDO_DELIVER', { nowMs });
      },

      retrySync: async (requestId) => {
        await syncEngine.retryManually(requestId);
      },

      setDemoClock: (demoClockMinutes) =>
        set((state) => ({ settings: { ...state.settings, demoClockMinutes } })),

      setOffline: (offlineMode) => {
        set((state) => ({ settings: { ...state.settings, offlineMode } }));
        syncEngine.setOffline(offlineMode);
      },

      resetDemo: async () => {
        await syncEngine.clear();
        set({
          auth: { agentName: null },
          stops: loadInitialRoute(),
          queue: [],
          settings: { demoClockMinutes: 9 * 60, offlineMode: false },
          startedAt: Date.now(),
        });
        syncEngine.setOffline(false);
      },
    }),
    {
      name: 'routerunner-route',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        auth: state.auth,
        stops: state.stops,
        queue: state.queue,
        settings: state.settings,
        startedAt: state.startedAt,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Route state hydration failed', error);
        }
        useRouteStore.setState({ hasHydrated: true });
        syncEngine.setOffline(useRouteStore.getState().settings.offlineMode);
        void syncEngine.start().catch((startError) => {
          console.error('Route sync start failed', startError);
        });
      },
    },
  ),
);

syncEngine.subscribe((queue) => {
  if (!queuesEqual(useRouteStore.getState().queue, queue)) {
    useRouteStore.setState({ queue });
  }
});

export const syncStateByStop = (
  stopId: string,
  queue: QueuedAction[] = useRouteStore.getState().queue,
): SyncState => getSyncStateByStop(stopId, queue);

export const selectSyncStateByStop =
  (stopId: string) =>
  (state: Pick<RouteState, 'queue'>): SyncState =>
    syncStateByStop(stopId, state.queue);

export const selectIsHydrated = (state: Pick<RouteState, 'hasHydrated'>): boolean =>
  state.hasHydrated;
