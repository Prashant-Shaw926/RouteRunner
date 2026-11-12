# NEXU RouteRunner (React Native + Expo + TypeScript)
## Prerequisites / Setup / Run: pending
## Architecture: domain (pure rules) / sync (queue + mock server) / store (Zustand + persist) / app (UI)
## State management choice: pending
## AI usage disclosure: pending
## Known limitations: pending

## Implementation notes
- Recipient names and `Other` failure notes are trimmed before length validation.
- Urgent `Customer absent` is blocked strictly before the demo window start,
  including for retries; it is allowed at the window start.
- A second failure becomes Returned in its existing route position. Route order
  remains unique and gap-free; only a first-failure retry is moved and
  renumbered.
- `deliver()` requires demo-clock minutes as its sixth argument and records
  them separately from the real epoch timestamp.
- Demo credentials: agent `Asha`, PIN `1234`.
- Success rate is `Delivered / (Delivered + Failed + Returned) * 100`, with
  zero when there are no outcome stops. On-time rate is delivered stops at or
  before their window end divided by all delivered stops, with zero when none
  are delivered.
- A `Needs attention` action blocks later actions for that stop while online
  until manually retried. Switching offline mode off resets every non-synced
  action to Pending with zero attempts and automatically syncs the queue.
