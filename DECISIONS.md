# Decisions

1. **R5 undo exception and R1 conflict:** Delivered stops are locked except for
   `undoDeliver` while the undo window is active; Returned stops reject every
   action. Undo is also rejected when another stop is Arrived, so undoing a
   delivery cannot create two Arrived stops.
2. **First failure model:** The first failure sets `status: Failed` and
   `isRetry: true`, then moves the stop to the end of the route. Retry arrival
   is allowed from either Pending or Failed.
3. **Undo boundary and countdown:** Undo is allowed only while elapsed time is
   less than 60,000 ms, so exactly 60,000 ms is rejected. `undoSecondsLeft`
   uses a ceiling countdown so the visible countdown and rule agree at the
   boundary.
