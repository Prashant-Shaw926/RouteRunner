import { QueuedAction } from '../domain/types';
import { MockServer } from './MockServer';
export const BACKOFF_MS = [2000, 4000, 8000];   // S3
// Clock/timers/storage injected so it is unit-testable without real waiting.
export class SyncEngine {
  constructor(private server: MockServer, private load: () => Promise<QueuedAction[]>, private save: (q: QueuedAction[]) => Promise<void>) {}
  enqueue(a: QueuedAction) { /* S1: persist BEFORE sending */ }
  start() { /* S7: resume on app launch */ }
  retryManually(requestId: string) { /* S3: Needs attention -> Retrying */ }
  private processNext() { /* S4: per-stop FIFO; hold a stop's later actions until earlier is Synced */ }
}
