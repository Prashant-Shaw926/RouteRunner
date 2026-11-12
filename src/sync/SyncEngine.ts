import { QueuedAction } from '../domain/types';
import { newRequestId } from '../utils/id';
import { MockServer } from './MockServer';

export const BACKOFF_MS = [2000, 4000, 8000] as const;

export type EnqueueAction = Omit<QueuedAction, 'requestId' | 'seq' | 'state' | 'attempts'> & {
  requestId?: string;
};

export type SyncListener = (queue: QueuedAction[], history: QueuedAction[]) => void;

export interface SyncEngineOptions {
  clock?: () => number;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  cancel?: (handle: unknown) => void;
  requestId?: () => string;
}

export interface EnqueueCallbacks {
  onOptimistic?: (queued: QueuedAction) => void;
  onRollback?: () => void;
}

const defaultSchedule = (callback: () => void, delayMs: number): ReturnType<typeof setTimeout> =>
  setTimeout(callback, delayMs);

const defaultCancel = (handle: unknown): void => {
  clearTimeout(handle as ReturnType<typeof setTimeout>);
};

export class SyncEngine {
  private queue: QueuedAction[] = [];
  private history: QueuedAction[] = [];
  private nextSeq = 0;
  private started = false;
  private readonly inFlightStops = new Set<string>();
  private readonly timers = new Map<string, unknown>();
  private readonly listeners = new Set<SyncListener>();
  private saveChain: Promise<void> = Promise.resolve();
  private readonly clock: () => number;
  private readonly schedule: (callback: () => void, delayMs: number) => unknown;
  private readonly cancel: (handle: unknown) => void;
  private readonly requestId: () => string;

  constructor(
    private readonly server: MockServer,
    private readonly load: () => Promise<QueuedAction[]>,
    private readonly save: (queue: QueuedAction[]) => Promise<void>,
    options: SyncEngineOptions = {},
  ) {
    this.clock = options.clock || Date.now;
    this.schedule = options.schedule || defaultSchedule;
    this.cancel = options.cancel || defaultCancel;
    this.requestId = options.requestId || newRequestId;
  }

  async enqueue(action: EnqueueAction, callbacks: EnqueueCallbacks = {}): Promise<QueuedAction> {
    const queued: QueuedAction = {
      ...action,
      requestId: action.requestId || this.requestId(),
      seq: this.nextSeq++,
      state: 'Pending',
      attempts: 0,
      createdAt: action.createdAt === undefined ? this.clock() : action.createdAt,
    };
    const previousQueue = this.queue;
    this.queue = [...this.queue, queued];
    callbacks.onOptimistic?.(queued);
    this.emit();

    // Persist the optimistic action before allowing processing to send it.
    try {
      await this.persist();
    } catch (error) {
      this.queue = previousQueue;
      callbacks.onRollback?.();
      this.emit();
      throw error;
    }
    if (this.started) this.processWaiting();
    return queued;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const persisted = await this.load();
    this.queue = persisted.map((action) => ({
      ...action,
      state: action.state === 'Needs attention' ? action.state : 'Pending',
      nextAttemptAt: undefined,
    }));
    this.nextSeq = this.queue.reduce((highest, action) => Math.max(highest, action.seq + 1), 0);
    this.emit();
    this.processWaiting();
  }

  async retryManually(requestId: string): Promise<void> {
    const action = this.queue.find((candidate) => candidate.requestId === requestId);
    if (!action || action.state !== 'Needs attention') return;

    this.queue = this.queue.map((candidate) =>
      candidate.requestId === requestId
        ? { ...candidate, state: 'Pending', attempts: 0, nextAttemptAt: undefined }
        : candidate,
    );
    this.emit();
    await this.persist();
    this.processWaiting();
  }

  async clear(): Promise<void> {
    this.timers.forEach((timer) => this.cancel(timer));
    this.timers.clear();
    this.queue = [];
    this.history = [];
    this.emit();
    await this.persist();
  }

  setOffline(offline: boolean): void {
    const switchedOnline = this.server.offline && !offline;
    this.server.offline = offline;
    if (!switchedOnline) return;

    this.timers.forEach((timer) => this.cancel(timer));
    this.timers.clear();
    this.queue = this.queue.map((action) =>
      action.state === 'Synced'
        ? action
        : { ...action, state: 'Pending', attempts: 0, nextAttemptAt: undefined },
    );
    // Coming back online is an explicit recovery action: even Needs attention
    // items re-enter the queue, while online failures still require manual retry.
    this.emit();
    this.persistInBackground();
    this.processWaiting();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getQueue(): QueuedAction[] {
    return this.queue.map((action) => ({ ...action }));
  }

  getHistory(): QueuedAction[] {
    return this.history.map((action) => ({ ...action }));
  }

  private processWaiting(): void {
    if (!this.started || this.server.offline) return;

    const stopIds = new Set(this.queue.map((action) => action.stopId));
    stopIds.forEach((stopId) => {
      if (this.inFlightStops.has(stopId)) return;
      const next = this.nextActionForStop(stopId);
      if (next && next.state === 'Pending') {
        this.send(next);
      }
    });
  }

  private nextActionForStop(stopId: string): QueuedAction | undefined {
    const actions = this.queue
      .filter((action) => action.stopId === stopId)
      .sort((left, right) => left.seq - right.seq);
    const first = actions[0];
    // Needs attention is a per-stop circuit breaker while online; switching
    // offline mode off explicitly resets it before processing resumes.
    if (!first || first.state === 'Needs attention') return undefined;
    return first;
  }

  private send(action: QueuedAction): void {
    this.inFlightStops.add(action.stopId);
    void this.server.send(action)
      .then(() => this.succeeded(action))
      .catch(() => this.failed(action))
      .finally(() => {
        this.inFlightStops.delete(action.stopId);
        this.processWaiting();
      });
  }

  private succeeded(action: QueuedAction): void {
    const synced = { ...action, state: 'Synced' as const, nextAttemptAt: undefined };
    this.queue = this.queue.filter((candidate) => candidate.requestId !== action.requestId);
    this.history = [...this.history, synced];
    this.emit();
    this.persistInBackground();
  }

  private failed(action: QueuedAction): void {
    const attempts = action.attempts + 1;
    if (attempts > BACKOFF_MS.length) {
      this.queue = this.queue.map((candidate) =>
        candidate.requestId === action.requestId
          ? { ...candidate, state: 'Needs attention', attempts, nextAttemptAt: undefined }
          : candidate,
      );
      this.emit();
      this.persistInBackground();
      return;
    }

    const retryingAction = {
      ...action,
      state: 'Retrying' as const,
      attempts,
      nextAttemptAt: this.clock() + BACKOFF_MS[attempts - 1],
    };
    this.queue = this.queue.map((candidate) =>
      candidate.requestId === action.requestId ? retryingAction : candidate,
    );
    this.emit();
    this.persistInBackground();
    this.scheduleRetry(retryingAction, BACKOFF_MS[attempts - 1]);
  }

  private scheduleRetry(action: QueuedAction, delayMs: number): void {
    const timer = this.schedule(() => {
      this.timers.delete(action.requestId);
      const current = this.queue.find((candidate) => candidate.requestId === action.requestId);
      if (current && current.state === 'Retrying') {
        this.queue = this.queue.map((candidate) =>
          candidate.requestId === action.requestId
            ? { ...candidate, state: 'Pending', nextAttemptAt: undefined }
            : candidate,
        );
        this.emit();
        this.processWaiting();
      }
    }, delayMs);
    this.timers.set(action.requestId, timer);
  }

  private persist(): Promise<void> {
    const snapshot = this.queue.map((action) => ({ ...action }));
    // A failed write must not poison later persistence attempts (including
    // rollback cleanup or a subsequent action).
    this.saveChain = this.saveChain.catch(() => undefined).then(() => this.save(snapshot));
    return this.saveChain;
  }

  private persistInBackground(): void {
    void this.persist().catch((error) => {
      console.error('Route sync persistence failed', error);
    });
  }

  private emit(): void {
    const queue = this.getQueue();
    const history = this.getHistory();
    this.listeners.forEach((listener) => listener(queue, history));
  }
}
