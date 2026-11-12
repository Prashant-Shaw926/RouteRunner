import { QueuedAction } from '../src/domain/types';
import { syncStateByStop } from '../src/store/syncState';

const action = (state: QueuedAction['state'], seq: number): QueuedAction => ({
  requestId: `${state}-${seq}`,
  stopId: 'S01',
  type: 'ARRIVE',
  payload: {},
  createdAt: 0,
  seq,
  state,
  attempts: 0,
});

describe('S2 sync badge states', () => {
  it('shows the worst queued state for a stop and Synced when there is no queue', () => {
    expect(syncStateByStop('S01', [])).toBe('Synced');
    expect(syncStateByStop('S01', [action('Pending', 1)])).toBe('Pending');
    expect(syncStateByStop('S01', [action('Retrying', 1)])).toBe('Retrying');
    expect(syncStateByStop('S01', [action('Needs attention', 1)])).toBe('Needs attention');
    expect(syncStateByStop('S01', [
      action('Pending', 1),
      action('Needs attention', 2),
    ])).toBe('Needs attention');
  });
});
