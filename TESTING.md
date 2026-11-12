# NEXU testing map

## Rule coverage

- **R1**: one Arrived stop; a second arrival is blocked with the active
  customer in the message.
- **R2**: delivery recipient and exact integer package-count validation.
- **R3**: all failure reasons, including `Other` with a 10+ character note.
- **R4**: first retry moves to the end; second failure becomes Returned.
- **R5**: deliver → undo within 60 seconds → Arrived, re-deliver, then expired
  undo; undo is also blocked while another stop is Arrived.
- **R6**: Urgent Customer absent is blocked before the demo window, including
  retries.

## Sync and persistence coverage

- **S1**: SyncEngine persists an enqueued action before processing it.
- **S2**: `syncStateByStop` and `SyncBadge` states cover Synced, Pending,
  Retrying, and Needs attention.
- **S3**: mock failure rate `1` drives deterministic 2s/4s/8s backoff.
  Airplane mode is not used because the server is a local mock.
- **S4**: same-stop actions remain FIFO by `seq`.
- **S5**: request IDs deduplicate, including while the first request is in
  flight.
- **S6**: the Offline toggle makes requests fail; switching it off resets
  non-synced actions and resumes processing automatically.
- **S7**: restart reloads persisted actions, keeps the same request ID, and
  applies each server request once.
- **H / persistence**: the persisted route state includes auth, stops,
  settings, and queue; hydration restores it before syncing resumes.
