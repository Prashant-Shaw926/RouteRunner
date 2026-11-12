# Assignment section 10 answers

## 1. One stop from Pending to Delivered

A Pending stop is opened and marked Arrived. The domain rule checks that no
other stop is active, then the UI updates the stop locally. The agent enters a
recipient and package count and taps Deliver. The domain validates both values,
changes the stop to Delivered, and records the real and demo delivery times.
At the same time, a DELIVER action with a request ID and sequence number is
added to the queue. The action is persisted before sync starts. The mock server
then removes it from the active queue on success, or leaves it visible for
retry.

## 2. Where the business rules live and how they are tested

The rules live in the pure functions under `src/domain/`, not in the screens.
They cover arrival, delivery, failure, retry, return, undo, timing, ordering,
and summary calculations. Jest tests call those functions directly, including
invalid transitions, boundary times, frozen inputs, and retry cases.

## 3. How an action is never lost or applied twice

The client saves the optimistic stop and queue snapshot before sending. Each
action has a stable request ID and a per-stop sequence number. The server
deduplicates request IDs, while the client keeps later actions behind an
earlier action for the same stop. Failed actions remain queued and use retry
backoff or manual retry.

## 4. What happens if the app is killed during an in-flight request

The action was persisted before the request was sent, so it remains in the
queue after restart. On launch, the queue is loaded and the same request ID is
sent again. If the server accepted the original request, idempotency
deduplication prevents a second application. If it did not, the retry can
complete it. The remaining limitation is that asynchronous local storage
cannot make a process kill during a storage write fully transactional.

## 5. What would change for 5,000 agents and 100,000 stops per day

I would batch uploads and acknowledgements, use server-enforced idempotency
keys, and enforce per-stop ordering on the backend. The client would use delta
sync with cursors and push-triggered refresh, plus rate limiting and
exponential backoff with jitter. AsyncStorage would be replaced with SQLite
for indexed stops, an action ledger, cursors, and retry metadata. The backend
would need partitioning, observability, conflict handling, and replay tools.

## 6. What I built and where I used AI or third-party code

I made the product decisions, route model, workflow behavior, synchronization
design, tests, documentation, and final fixes. I used an AI coding assistant
for scaffolding, implementation suggestions, review, and documentation drafts,
then reviewed and verified the result. Expo, React Native, Zustand, AsyncStorage,
Jest, and other listed npm packages are third-party dependencies used under
their own licenses; they were not presented as my original code.
