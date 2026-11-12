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
  it('accepts the same requestId again after an in-flight request fails', async () => {
    const server = new MockServer({
      failureRate: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    const request = action('failed-then-retried');

    await expect(server.send(request)).rejects.toThrow('Network request failed');
    server.setFailureRate(0);

    await expect(server.send(request)).resolves.toEqual({ applied: true });
    expect(server.appliedLog).toEqual(['failed-then-retried']);
  });

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
