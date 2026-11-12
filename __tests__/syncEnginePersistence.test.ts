import { MockServer } from '../src/sync/MockServer';
import { SyncEngine } from '../src/sync/SyncEngine';

describe('SyncEngine persistence failures', () => {
  it('rolls back an action when its initial queue save fails', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    const engine = new SyncEngine(
      server,
      async () => [],
      async () => {
        throw new Error('storage unavailable');
      },
    );

    await expect(engine.enqueue({
      stopId: 'S01',
      type: 'DELIVER',
      payload: {},
      createdAt: 0,
    })).rejects.toThrow('storage unavailable');
    expect(engine.getQueue()).toEqual([]);
  });

  it('rolls back only the failed stop when another stop already changed', async () => {
    const server = new MockServer({
      failureRate: 0,
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => undefined,
      random: () => 0,
    });
    let saveCount = 0;
    let stops = [
      { id: 'S01', status: 'Pending' },
      { id: 'S02', status: 'Pending' },
    ];
    const engine = new SyncEngine(
      server,
      async () => [],
      async () => {
        saveCount += 1;
        if (saveCount === 2) throw new Error('storage unavailable');
      },
    );

    await engine.enqueue(
      { stopId: 'S01', type: 'ARRIVE', payload: {}, createdAt: 0 },
      {
        onOptimistic: () => { stops = stops.map((stop) => stop.id === 'S01' ? { ...stop, status: 'Arrived' } : stop); },
      },
    );
    await expect(engine.enqueue(
      { stopId: 'S02', type: 'ARRIVE', payload: {}, createdAt: 0 },
      {
        onOptimistic: () => { stops = stops.map((stop) => stop.id === 'S02' ? { ...stop, status: 'Arrived' } : stop); },
        onRollback: () => { stops = stops.map((stop) => stop.id === 'S02' ? { ...stop, status: 'Pending' } : stop); },
      },
    )).rejects.toThrow('storage unavailable');

    expect(stops).toEqual([
      { id: 'S01', status: 'Arrived' },
      { id: 'S02', status: 'Pending' },
    ]);
  });
});
