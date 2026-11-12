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

  async enqueue(action: EnqueueAction): Promise<QueuedAction> {
    const queued: QueuedAction = {
      ...action,
      requestId: action.requestId || this.requestId(),
      seq: this.nextSeq++,
      state: 'Pending',
      attempts: 0,
      createdAt: action.createdAt === undefined ? this.clock() : action.createdAt,
    };
    this.queue = [...this.queue, queued];
    this.emit();

    // Persist the optimistic action before allowing processing to send it.
    await this.persist();
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

    action.state = 'Pending';
    action.attempts = 0;
    action.nextAttemptAt = undefined;
    this.emit();
    await this.persist();
    this.processWaiting();
  }

  setOffline(offline: boolean): void {
    this.server.offline = offline;
    if (!offline) this.processWaiting();
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
    void this.persist();
  }

  private failed(action: QueuedAction): void {
    const attempts = action.attempts + 1;
    action.attempts = attempts;
    if (attempts > BACKOFF_MS.length) {
      action.state = 'Needs attention';
      action.nextAttemptAt = undefined;
      this.emit();
      void this.persist();
      return;
    }

    action.state = 'Retrying';
    action.nextAttemptAt = this.clock() + BACKOFF_MS[attempts - 1];
    this.emit();
    void this.persist();
    this.scheduleRetry(action, BACKOFF_MS[attempts - 1]);
  }

  private scheduleRetry(action: QueuedAction, delayMs: number): void {
    const timer = this.schedule(() => {
      this.timers.delete(action.requestId);
      if (action.state === 'Retrying') {
        action.state = 'Pending';
        action.nextAttemptAt = undefined;
        this.emit();
        this.processWaiting();
      }
    }, delayMs);
    this.timers.set(action.requestId, timer);
  }

  private persist(): Promise<void> {
    const snapshot = this.queue.map((action) => ({ ...action }));
    this.saveChain = this.saveChain.then(() => this.save(snapshot));
    return this.saveChain;
  }

  private emit(): void {
    const queue = this.getQueue();
    const history = this.getHistory();
    this.listeners.forEach((listener) => listener(queue, history));
  }
}
