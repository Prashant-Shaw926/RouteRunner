import { QueuedAction, SyncState } from '../domain/types';

const SYNC_PRIORITY: Record<SyncState, number> = {
  Synced: 0,
  Pending: 1,
  Retrying: 2,
  'Needs attention': 3,
};

export const syncStateByStop = (stopId: string, queue: QueuedAction[]): SyncState => {
  const states = queue
    .filter((action) => action.stopId === stopId)
    .map((action) => action.state);
  if (states.length === 0) return 'Synced';
  return states.reduce((worst, state) =>
    SYNC_PRIORITY[state] > SYNC_PRIORITY[worst] ? state : worst,
  );
};
