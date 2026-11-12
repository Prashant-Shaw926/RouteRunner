# Testing

## What is tested

### Route rules

- R1: only one stop may be Arrived at a time.
- R2: recipient and exact package-count validation.
- R3: failure reasons and the `Other` note requirement.
- R4: first-failure retry placement and second-failure Returned behavior.
- R5: delivery undo before expiry, at expiry, and while another stop is active.
- R6: urgent Customer absent timing, including retries.
- Domain functions do not mutate their inputs, including frozen stops and
  nested window data.

### Synchronization and persistence

- S1: actions are persisted before processing starts.
- S2: sync badges and per-stop sync-state aggregation.
- S3: deterministic 2s/4s/8s retry backoff and Needs attention.
- S4: FIFO ordering for actions on the same stop.
- S5: stable request IDs prevent duplicate server application.
- S6: offline failures and automatic recovery when going online.
- S7: restart reloads queued actions and resumes them with the same request ID.
- Atomic optimistic stop-plus-queue snapshots.
- Targeted rollback preserves earlier successful stop actions when a later
  queue save fails.
- Per-stop action locking prevents a double-tap Deliver from creating two
  queue items.
- In-flight duplicate request IDs are applied at most once.
- Offline auto-resume preserves per-stop order.

The following is a manual check and is not claimed as automated coverage:
hydration of auth, stops, settings, and queue state in the full app.

### Other coverage

- Seed route size and field validation.
- Summary counts, success rate, and on-time rate.
- Mock-server delay, failure, offline, and deduplication behavior.
- Time-window alerts and route ordering.

## Results

Latest validation:

```text
TypeScript: passed
Jest: 12 suites passed
Tests: 56 passed
```

The suite is run with:

```bash
npx tsc --noEmit
npm test -- --runInBand
```

## Bugs found and addressed

1. **Queue persistence failure could leave an optimistic stop mutation without
   a durable action.** The atomic optimistic snapshot now writes the stop and
   queue together, and rollback restores only the affected stop.
2. **Repeated taps on stop actions could overlap UI submissions.** Stop
   actions now use both a UI submission guard and a per-stop store lock.
3. **Sync queue entries were mutated in place during retry and offline
   recovery.** Queue transitions now replace entries immutably.
4. **Needs-attention actions stayed blocked after Offline mode was switched
   off.** S6 recovery now resets non-synced actions and resumes them, with
   ordering preserved.
5. **Background persistence and UI async failures could become unhandled
   rejections.** Background saves are caught and logged; action, retry, reset,
   and sync-start paths surface or log failures explicitly.

The remaining persistence limitation is a storage write window: the combined
optimistic snapshot reduces the crash gap, but AsyncStorage cannot provide a
full transactional guarantee across process death or storage failure.

## Device test results

No device run has been recorded in this workspace, so these checks remain
unverified rather than being marked Pass.

| Check | Status | Notes |
|---|---|---|
| R1 | Not run | Requires device stop workflow. |
| R2 | Not run | Requires device input validation. |
| R3 | Not run | Requires device failure/retry flow. |
| R4 | Not run | Requires two-failure lifecycle check. |
| R5 | Not run | Requires timed undo check on device. |
| R6 | Not run | Requires demo-clock urgent-stop check. |
| S1 | Not run | Requires device queue visibility. |
| S2 | Not run | Requires device sync badge visibility. |
| S3 | Not run | Requires observing retry timing on device. |
| S4 | Not run | Requires device same-stop queue flow. |
| S5 | Not run | Requires restart/in-flight duplicate exercise. |
| S6 | Not run | Requires toggling Offline mode on device. |
| S7 | Not run | Requires force-close and restart recovery. |
| H | Not run | Requires full hydration check after relaunch. |

## Remaining test limitations

- React Native screen rendering and device navigation are not covered by the
  Jest suite.
- Real OS process-kill recovery, real connectivity changes, and native
  background behavior require manual device testing.
- The mock server cannot prove production backend ordering, authentication, or
  multi-device conflict behavior.
