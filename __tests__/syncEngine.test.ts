import { MockServer } from '../src/sync/MockServer';
import { SyncEngine } from '../src/sync/SyncEngine';
import { QueuedAction } from '../src/domain/types';

const action = (requestId: string, stopId: string): QueuedAction => ({
  requestId,
  stopId,
  type: 'ARRIVE' as const,
  payload: {},
  createdAt: 0,
  seq: 0,
  state: 'Pending',
  attempts: 0,
});

describe('SyncEngine restart and persistence', () => {
  it('S7 resumes persisted Pending work with the same requestId', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    let persisted = [action('request-1', 'S01')];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );

    await engine.start();
    for (let flush = 0; flush < 6; flush += 1) {
      await Promise.resolve();
    }

    expect(server.appliedLog).toEqual(['request-1']);
    expect(engine.getHistory()[0].requestId).toBe('request-1');
  });

  it('keeps unsynced actions available to the Summary after restart', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 1000,
      maxDelayMs: 1000,
      sleep: () => new Promise<void>(() => undefined),
      random: () => 0,
    });
    const persisted = [action('summary-pending', 'S02')];
    const engine = new SyncEngine(server, async () => persisted, async () => undefined);

    await engine.start();

    expect(engine.getQueue()).toEqual([
      expect.objectContaining({ requestId: 'summary-pending', state: 'Pending' }),
    ]);
  });

  it('S6 automatically syncs retryable work when the Offline toggle is disabled', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    server.offline = true;
    let persisted = [action('offline-1', 'S01')];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );

    await engine.start();
    expect(server.appliedLog).toEqual([]);
    engine.setOffline(false);
    await Promise.resolve();
    await Promise.resolve();

    expect(server.appliedLog).toEqual(['offline-1']);
  });

  it('keeps Needs attention blocked until manual retry', async () => {
    jest.useFakeTimers();
    const server = new MockServer({
      failureRate: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    let persisted = [action('blocked-1', 'S01')];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
      { schedule: (callback, delay) => setTimeout(callback, delay) },
    );

    try {
      await engine.start();
      for (let flush = 0; flush < 6; flush += 1) {
        await Promise.resolve();
      }
      for (const delay of [2000, 4000, 8000]) {
        jest.advanceTimersByTime(delay);
        for (let flush = 0; flush < 6; flush += 1) {
          await Promise.resolve();
        }
      }
      expect(engine.getQueue()[0].state).toBe('Needs attention');
      engine.setOffline(false);
      expect(engine.getQueue()[0].state).toBe('Needs attention');
    } finally {
      jest.useRealTimers();
    }
  });

  it('resets Needs attention and all retry state when switching offline off', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    server.offline = true;
    let persisted: QueuedAction[] = [
      { ...action('reset-1', 'S01'), state: 'Needs attention', attempts: 4 },
    ];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );
    const snapshots: string[] = [];
    engine.subscribe((queue) => {
      const current = queue.find((item) => item.requestId === 'reset-1');
      if (current) snapshots.push(`${current.state}:${current.attempts}`);
    });

    await engine.start();
    engine.setOffline(false);
    for (let flush = 0; flush < 6; flush += 1) {
      await Promise.resolve();
    }

    expect(snapshots).toContain('Pending:0');
    expect(server.appliedLog).toEqual(['reset-1']);
  });

  it('resets only on a true-to-false transition and preserves sequence order', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    server.offline = true;
    const first = { ...action('ordered-1', 'S01'), seq: 4, state: 'Needs attention' as const, attempts: 4 };
    const second = { ...action('ordered-2', 'S01'), seq: 5, state: 'Pending' as const, attempts: 0 };
    let persisted: QueuedAction[] = [first, second];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );

    await engine.start();
    engine.setOffline(false);
    for (let flush = 0; flush < 8; flush += 1) {
      await Promise.resolve();
    }

    expect(server.appliedLog).toEqual(['ordered-1', 'ordered-2']);
    expect(engine.getHistory().map((item) => item.requestId)).toEqual(['ordered-1', 'ordered-2']);
    expect(engine.getHistory().map((item) => item.seq)).toEqual([4, 5]);
  });

  it('does not reset when starting online or toggling offline on', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    let persisted: QueuedAction[] = [
      { ...action('no-reset', 'S01'), state: 'Needs attention', attempts: 4 },
    ];
    const engine = new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );

    await engine.start();
    expect(engine.getQueue()[0]).toMatchObject({ state: 'Needs attention', attempts: 4 });
    engine.setOffline(false);
    expect(engine.getQueue()[0]).toMatchObject({ state: 'Needs attention', attempts: 4 });
    engine.setOffline(true);
    expect(engine.getQueue()[0]).toMatchObject({ state: 'Needs attention', attempts: 4 });
  });

  it('cancels the old retry timer after offline recovery', async () => {
    jest.useFakeTimers();
    try {
      const server = new MockServer({
        failureRate: 1,
        minDelayMs: 0,
        maxDelayMs: 0,
        sleep: async () => undefined,
        random: () => 0,
      });
      let sendCount = 0;
      const send = server.send.bind(server);
      server.send = async (item) => {
        sendCount += 1;
        return send(item);
      };
      const engine = new SyncEngine(
        server,
        async () => [],
        async () => undefined,
        { schedule: (callback, delay) => setTimeout(callback, delay) },
      );

      await engine.start();
      await engine.enqueue(action('timer-reset', 'S01'));
      for (let flush = 0; flush < 6; flush += 1) await Promise.resolve();
      server.setFailureRate(0);
      engine.setOffline(true);
      engine.setOffline(false);
      for (let flush = 0; flush < 6; flush += 1) await Promise.resolve();
      jest.advanceTimersByTime(2000);
      for (let flush = 0; flush < 6; flush += 1) await Promise.resolve();

      expect(sendCount).toBe(2);
      expect(server.appliedLog).toEqual(['timer-reset']);
    } finally {
      jest.useRealTimers();
    }
  });
});
