# Decisions

## 1. R4 retry placement versus Section B urgent/time ordering

- **Problem:** R4 says a first-failure retry goes to the end of the route,
  while Section B says to sort by delivery window with Urgent first. Those
  rules conflict when a retry has an earlier or urgent window.
- **Options:** Keep the stop in place; always sort only by time and priority;
  or mark it as a retry and place it after non-retry stops while retaining
  normal window/priority ordering for all other stops.
- **Choice:** A first failure sets `status: Failed`, marks `isRetry: true`,
  moves the stop to the end of the route, and renumbers route positions.
  Retry arrival is allowed from `Pending` or `Failed`. A second failure becomes
  `Returned` in its existing position.
- **Reason:** The agent can see that the stop needs attention without losing a
  stable route order for all other stops. Keeping Returned stops in place
  preserves a gap-free, auditable route.

## 2. Undo versus a delivered action already synced or in flight

- **Problem:** Delivery is optimistic and may already be synchronized, or may
  be in flight, when the agent taps Undo. A later Undo must not create an
  invalid second active stop or silently erase a server-side delivery.
- **Options:** Allow Undo only locally; send a compensating Undo action; or
  disallow Undo after the short local correction window.
- **Choice:** Undo is a separate queued `UNDO_DELIVER` action and is allowed
  only while less than 60 seconds have elapsed since delivery. It is also
  rejected while another stop is Arrived. Delivered stops are otherwise
  locked, and Returned stops reject Undo.
- **Reason:** The short window supports correcting an immediate entry mistake.
  Queueing the compensating action preserves ordering and idempotent request
  handling. The active-stop guard prevents Undo from creating two Arrived
  stops.

## 3. Needs-attention actions block later actions for the same stop

- **Problem:** If an earlier action cannot synchronize, sending later actions
  for the same stop can make server state appear out of order.
- **Options:** Continue sending later actions; block the whole route; or block
  only later actions for the affected stop until recovery.
- **Choice:** A `Needs attention` action acts as a per-stop circuit breaker.
  Later actions for that stop remain queued until the action is manually
  retried. Other stops may continue synchronizing. As an S6 recovery
  interpretation, switching Offline mode off also clears retry state and
  resumes all non-synced actions automatically.
- **Reason:** Per-stop blocking preserves FIFO semantics without allowing one
  problematic stop to halt the entire route. The manual retry remains
  available for an online Needs-attention item; automatic reset on Offline
  recovery is a deliberate demo behavior rather than a separate domain rule.
