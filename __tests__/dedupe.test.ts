import { MockServer } from '../src/sync/MockServer';
import { SyncEngine } from '../src/sync/SyncEngine';
import { QueuedAction } from '../src/domain/types';

const action = (requestId: string): QueuedAction => ({
  requestId,
  stopId: requestId,
  type: 'ARRIVE' as const,
  payload: {},
  createdAt: 0,
  seq: 0,
  state: 'Pending',
  attempts: 0,
});

describe('Duplicate handling S5', () => {
  it('does not apply a duplicate after restart', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    let persisted = [action('req-1')];
    const makeEngine = () => new SyncEngine(
      server,
      async () => persisted,
      async (queue) => { persisted = queue; },
    );

    const first = makeEngine();
    await first.start();
    await Promise.resolve();
    expect(server.appliedLog).toEqual(['req-1']);

    persisted = [action('req-1')];
    const restarted = makeEngine();
    await restarted.start();
    await Promise.resolve();
    expect(server.appliedLog).toEqual(['req-1']);
  });
});
