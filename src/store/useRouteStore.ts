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
import { storage } from './storage';

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

export const syncEngine = new SyncEngine(
  server,
  async () => useRouteStore.getState().queue,
  async (queue) => {
    useRouteStore.setState({ queue });
  },
);

const commitRule = async (
  result: Result<Stop[]>,
  stopId: string,
  type: QueuedAction['type'],
  payload: Record<string, unknown>,
): Promise<string | undefined> => {
  if (!result.ok) return result.error;

  useRouteStore.setState({ stops: result.value });
  await syncEngine.enqueue({
    stopId,
    type,
    payload,
    createdAt: Date.now(),
  });
  return undefined;
};

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      signIn: (agentName) => set({ auth: { agentName: agentName.trim() } }),

      signOut: () => set({ auth: { agentName: null } }),

      arrive: async (stopId) => {
        const result = applyArrive(get().stops, stopId);
        return commitRule(result, stopId, 'ARRIVE', {});
      },

      deliver: async (stopId, recipient, confirmedPackages, nowMs = Date.now()) => {
        const demoMinutes = get().settings.demoClockMinutes;
        const result = applyDeliver(
          get().stops,
          stopId,
          recipient,
          confirmedPackages,
          nowMs,
          demoMinutes,
        );
        return commitRule(result, stopId, 'DELIVER', {
          recipient,
          confirmedPackages,
          nowMs,
          demoMinutes,
        });
      },

      fail: async (stopId, reason, note) => {
        const demoMinutes = get().settings.demoClockMinutes;
        const result = applyFail(get().stops, stopId, reason, note, demoMinutes);
        return commitRule(result, stopId, 'FAIL', { reason, note, demoMinutes });
      },

      undoDeliver: async (stopId, nowMs = Date.now()) => {
        const result = applyUndoDeliver(get().stops, stopId, nowMs);
        return commitRule(result, stopId, 'UNDO_DELIVER', { nowMs });
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
        void syncEngine.start();
      },
    },
  ),
);

syncEngine.subscribe((queue) => {
  useRouteStore.setState({ queue });
});

const SYNC_PRIORITY: Record<SyncState, number> = {
  Synced: 0,
  Pending: 1,
  Retrying: 2,
  'Needs attention': 3,
};

export const syncStateByStop = (
  stopId: string,
  queue: QueuedAction[] = useRouteStore.getState().queue,
): SyncState => {
  const states = queue
    .filter((action) => action.stopId === stopId)
    .map((action) => action.state);
  if (states.length === 0) return 'Synced';
  return states.reduce((worst, state) =>
    SYNC_PRIORITY[state] > SYNC_PRIORITY[worst] ? state : worst,
  );
};

export const selectSyncStateByStop =
  (stopId: string) =>
  (state: Pick<RouteState, 'queue'>): SyncState =>
    syncStateByStop(stopId, state.queue);

export const selectIsHydrated = (state: Pick<RouteState, 'hasHydrated'>): boolean =>
  state.hasHydrated;
