export type Priority = 'Normal' | 'Urgent';
export type StopStatus = 'Pending' | 'Arrived' | 'Delivered' | 'Failed' | 'Returned';
export type FailReason = 'Customer absent' | 'Wrong address' | 'Refused' | 'Access problem' | 'Other';
export type SyncState = 'Synced' | 'Pending' | 'Retrying' | 'Needs attention';
export type TimeAlert = 'OnTrack' | 'AtRisk' | 'Late';

export interface Stop {
  id: string;
  customer: string;
  address: string;
  expectedPackages: number;
  window: { start: string; end: string }; // "HH:mm"
  priority: Priority;
  status: StopStatus;
  failCount: number;          // R4: max 2
  isRetry: boolean;
  recipientName?: string;
  confirmedPackages?: number;
  failReason?: FailReason;
  failNote?: string;
  deliveredAt?: number;       // real epoch ms: R5 undo window
  deliveredAtDemo?: number;   // demo-clock minutes: on-time rate
  order: number;              // list position (retries go to end)
}

export type ActionType = 'ARRIVE' | 'DELIVER' | 'FAIL' | 'UNDO_DELIVER';

export interface QueuedAction {
  requestId: string;          // S5 unique id
  stopId: string;
  type: ActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  seq: number;                // global monotonic: S4 ordering
  state: SyncState;
  attempts: number;           // S3
  nextAttemptAt?: number;
}
