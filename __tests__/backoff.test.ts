import { MockServer } from '../src/sync/MockServer';
import { SyncEngine } from '../src/sync/SyncEngine';
import { QueuedAction } from '../src/domain/types';

const action = (requestId: string, stopId = 'S01') => ({
  requestId,
  stopId,
  type: 'ARRIVE' as const,
  payload: {},
  createdAt: 0,
});

const flushPromises = async (): Promise<void> => {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
};

describe('Retry backoff S3', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('retries at exactly 2s, 4s, and 8s, then needs attention', async () => {
    const server = new MockServer({
      failureRate: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    const saved: QueuedAction[] = [];
    const engine = new SyncEngine(
      server,
      async () => saved,
      async (queue) => {
        saved.splice(0, saved.length, ...queue);
      },
      { schedule: (callback, delay) => setTimeout(callback, delay), clock: () => Date.now(), requestId: () => 'req-1' },
    );

    await engine.enqueue(action('req-1'));
    await engine.start();
    await flushPromises();

    for (const delay of [2000, 4000, 8000]) {
      await flushPromises();
      jest.advanceTimersByTime(delay);
      await flushPromises();
    }

    expect(engine.getQueue()[0].state).toBe('Needs attention');
    expect(engine.getQueue()[0].attempts).toBe(4);
  });
});
