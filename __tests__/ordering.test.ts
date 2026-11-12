import { MockServer } from '../src/sync/MockServer';
import { SyncEngine } from '../src/sync/SyncEngine';

const queued = (requestId: string, seqType: 'ARRIVE' | 'DELIVER') => ({
  requestId,
  stopId: 'S01',
  type: seqType,
  payload: {},
  createdAt: 0,
});

describe('Per-stop ordering S4', () => {
  it('never sends a later action before the earlier one succeeds', async () => {
    const sent: string[] = [];
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    const originalSend = server.send.bind(server);
    server.send = async (item) => {
      sent.push(item.requestId);
      return originalSend(item);
    };
    const engine = new SyncEngine(server, async () => [], async () => undefined, {
      requestId: (() => {
        const ids = ['req-1', 'req-2'];
        return () => ids.shift() || 'unexpected';
      })(),
    });

    await engine.start();
    const first = engine.enqueue(queued('req-1', 'ARRIVE'));
    const second = engine.enqueue(queued('req-2', 'DELIVER'));
    await Promise.all([first, second]);
    await Promise.resolve();
    await Promise.resolve();

    expect(sent).toEqual(['req-1', 'req-2']);
  });
});
