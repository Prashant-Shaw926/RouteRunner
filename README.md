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
