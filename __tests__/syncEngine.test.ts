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
  it('resumes persisted Pending work with the same requestId', async () => {
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
    await Promise.resolve();

    expect(server.appliedLog).toEqual(['request-1']);
    expect(engine.getHistory()[0].requestId).toBe('request-1');
  });
});
