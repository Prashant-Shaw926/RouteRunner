import {
  arrive,
  deliver,
  fail,
  undoDeliver,
  undoSecondsLeft,
} from '../src/domain/rules';
import { ERROR_MESSAGES } from '../src/domain/messages';
import { Stop } from '../src/domain/types';

const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
  id: 'S01',
  customer: 'Meera Iyer',
  address: '12 Park St',
  expectedPackages: 2,
  window: { start: '09:00', end: '10:00' },
  priority: 'Normal',
  status: 'Pending',
  failCount: 0,
  isRetry: false,
  order: 0,
  ...overrides,
});

describe('Workflow rules R1-R6', () => {
  it('allows one Arrived stop and blocks a second with the active customer', () => {
    const stops = [makeStop(), makeStop({ id: 'S02', customer: 'Rohan Das', order: 1 })];
    const arrived = arrive(stops, 'S01');
    expect(arrived.ok).toBe(true);

    const second = arrive(arrived.ok ? arrived.value : stops, 'S02');
    expect(second).toEqual({ ok: false, error: 'Finish Meera Iyer first' });
    expect(second).toEqual({ ok: false, error: ERROR_MESSAGES.activeStop('Meera Iyer') });
  });

  it('allows arrival from Failed for a retry and never mutates the input', () => {
    const stops = [makeStop({ status: 'Failed', failCount: 1, isRetry: true })];
    const result = arrive(stops, 'S01');
    expect(result).toEqual({ ok: true, value: [{ ...stops[0], status: 'Arrived' }] });
    expect(stops[0].status).toBe('Failed');
  });

  it.each([1, 3, 2.5, Number.NaN])('rejects invalid confirmed package count %j when expected is 2', (confirmed) => {
    const result = deliver([makeStop({ status: 'Arrived' })], 'S01', 'AB', confirmed, 1000, 575);
    expect(result).toEqual({ ok: false, error: ERROR_MESSAGES.packageCountMismatch });
  });

  it('trims recipient names and records real and demo delivery times', () => {
    const result = deliver([makeStop({ status: 'Arrived' })], 'S01', ' AB ', 2, 1000, 575);
    expect(result).toEqual({
      ok: true,
      value: [{
        ...makeStop({ status: 'Arrived' }),
        status: 'Delivered',
        recipientName: 'AB',
        confirmedPackages: 2,
        deliveredAt: 1000,
        deliveredAtDemo: 575,
      }],
    });

  });

  it('clears stale failure details when delivering a retry', () => {
    const retry = makeStop({
      status: 'Arrived',
      failCount: 1,
      isRetry: true,
      failReason: 'Refused',
      failNote: 'Original failure',
    });
    const result = deliver([retry], 'S01', 'AB', 2, 1000, 575);
    const { failReason: _failReason, failNote: _failNote, ...retryWithoutFailure } = retry;
    expect(result.ok && result.value[0]).toEqual({
      ...retryWithoutFailure,
      status: 'Delivered',
      recipientName: 'AB',
      confirmedPackages: 2,
      deliveredAt: 1000,
      deliveredAtDemo: 575,
    });
    expect(result.ok && 'failReason' in result.value[0]).toBe(false);
    expect(result.ok && 'failNote' in result.value[0]).toBe(false);
  });

  it.each(['A', ' A '])('rejects recipient names shorter than 2 trimmed characters: %j', (recipient) => {
    expect(deliver([makeStop({ status: 'Arrived' })], 'S01', recipient, 2, 1000, 575)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.recipientRequired,
    });
  });

  it.each(['123456789', ' 123456789 '])('rejects Other notes shorter than 10 trimmed characters: %j', (note) => {
    expect(fail([makeStop({ status: 'Arrived' })], 'S01', 'Other', note, 600)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.otherNoteRequired,
    });
  });

  it('accepts a trimmed Other note of exactly 10 characters', () => {
    const result = fail([makeStop({ status: 'Arrived' })], 'S01', 'Other', ' 1234567890 ', 600);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value[0].failNote).toBe('1234567890');
  });

  it('blocks urgent Customer absent before its window but allows it at the start', () => {
    const stop = makeStop({ status: 'Arrived', priority: 'Urgent', window: { start: '10:00', end: '11:00' } });
    expect(fail([stop], 'S01', 'Customer absent', '', 599)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.urgentCustomerAbsent,
    });

    expect(fail([stop], 'S01', 'Customer absent', '', 600)).toEqual({
      ok: true,
      value: [{ ...stop, status: 'Failed', failCount: 1, isRetry: true, failReason: 'Customer absent' }],
    });
  });

  it('keeps R6 active for an Urgent retry before its window starts', () => {
    const first = makeStop({
      status: 'Arrived',
      priority: 'Urgent',
      window: { start: '10:00', end: '11:00' },
    });
    const failed = fail([first], 'S01', 'Refused', '', 600);
    const retry = failed.ok ? arrive(failed.value, 'S01') : failed;
    expect(retry.ok && fail(retry.value, 'S01', 'Customer absent', '', 599)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.urgentCustomerAbsent,
    });
  });

  it('allows Customer absent before the window for a non-urgent stop', () => {
    const stop = makeStop({ status: 'Arrived' });
    expect(fail([stop], 'S01', 'Customer absent', '', 0).ok).toBe(true);
  });

  it('moves the first failure to the end and renumbers the route', () => {
    const stops = [
      makeStop({ status: 'Arrived' }),
      makeStop({ id: 'S02', order: 1 }),
    ];
    const result = fail(stops, 'S01', 'Refused', '', 600);
    expect(result).toEqual({
      ok: true,
      value: [
        { ...stops[1], order: 0 },
        { ...stops[0], status: 'Failed', failCount: 1, isRetry: true, failReason: 'Refused', order: 1 },
      ],
    });
  });

  it('returns a stop to the hub on its second failure and rejects a third', () => {
    const first = makeStop({ status: 'Arrived' });
    const second = { ...first, status: 'Arrived' as const, failCount: 1, isRetry: true };
    const returned = fail([second], 'S01', 'Refused', '', 600);
    expect(returned).toEqual({
      ok: true,
      value: [{ ...second, status: 'Returned', failCount: 2, isRetry: false, failReason: 'Refused' }],
    });

    expect(fail(returned.ok ? returned.value : [], 'S01', 'Refused', '', 600)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.returnedLocked,
    });
  });

  it('keeps Returned in place with unique gap-free order values', () => {
    const stops = [
      makeStop({ id: 'S01', order: 0 }),
      makeStop({ id: 'S02', status: 'Arrived', failCount: 1, isRetry: true, order: 1 }),
      makeStop({ id: 'S03', order: 2 }),
    ];
    const result = fail(stops, 'S02', 'Refused', '', 600);
    expect(result.ok && result.value.map((stop) => stop.id)).toEqual(['S01', 'S02', 'S03']);
    expect(result.ok && result.value.map((stop) => stop.order)).toEqual([0, 1, 2]);
    expect(result.ok && result.value[1].status).toBe('Returned');
  });

  it('allows undo before 60 seconds, but rejects exactly 60 and 61 seconds', () => {
    const delivered = makeStop({ status: 'Delivered', deliveredAt: 1000 });
    expect(undoSecondsLeft(delivered, 61000)).toBe(0);
    expect(undoDeliver([delivered], 'S01', 59999).ok).toBe(true);
    expect(undoDeliver([delivered], 'S01', 61000)).toEqual({ ok: false, error: ERROR_MESSAGES.undoExpired });
    expect(undoDeliver([delivered], 'S01', 61001)).toEqual({ ok: false, error: ERROR_MESSAGES.undoExpired });
  });

  it('reverts an eligible delivery to Arrived without mutating input', () => {
    const delivered = makeStop({ status: 'Delivered', deliveredAt: 1000, deliveredAtDemo: 600 });
    const result = undoDeliver([delivered], 'S01', 1000);
    expect(result).toEqual({
      ok: true,
      value: [{ ...delivered, status: 'Arrived', deliveredAt: undefined, deliveredAtDemo: undefined }],
    });
    expect(delivered.status).toBe('Delivered');
  });

  it('does not mutate frozen arrays, stops, or nested windows', () => {
    const original = makeStop({ status: 'Arrived', failReason: 'Refused', failNote: 'Old failure' });
    const frozen = Object.freeze({
      ...original,
      window: Object.freeze({ ...original.window }),
    }) as Stop;
    const stops = Object.freeze([frozen]) as readonly Stop[] as Stop[];
    expect(deliver(stops, 'S01', 'AB', 2, 1000, 575).ok).toBe(true);
    expect(frozen.status).toBe('Arrived');
    expect(frozen.failReason).toBe('Refused');
    expect(stops).toHaveLength(1);
  });

  it('rejects undo when another stop is already Arrived', () => {
    const delivered = makeStop({ status: 'Delivered', deliveredAt: 1000 });
    const active = makeStop({ id: 'S02', customer: 'Asha Roy', status: 'Arrived', order: 1 });
    expect(undoDeliver([delivered, active], 'S01', 2000)).toEqual({
      ok: false,
      error: ERROR_MESSAGES.activeStopBeforeUndo('Asha Roy'),
    });
  });

  it('rejects every action on locked Delivered and Returned stops except eligible undo', () => {
    const delivered = makeStop({ status: 'Delivered', deliveredAt: 1000 });
    const returned = makeStop({ status: 'Returned', failCount: 2 });
    expect(arrive([delivered], 'S01')).toEqual({ ok: false, error: ERROR_MESSAGES.deliveredLocked });
    expect(deliver([delivered], 'S01', 'AB', 2, 1000, 575)).toEqual({ ok: false, error: ERROR_MESSAGES.deliveredLocked });
    expect(fail([delivered], 'S01', 'Refused', '', 600)).toEqual({ ok: false, error: ERROR_MESSAGES.deliveredLocked });
    expect(undoDeliver([returned], 'S01', 1000)).toEqual({ ok: false, error: ERROR_MESSAGES.returnedLocked });
    expect(arrive([returned], 'S01')).toEqual({ ok: false, error: ERROR_MESSAGES.returnedLocked });
    expect(deliver([returned], 'S01', 'AB', 2, 1000, 575)).toEqual({ ok: false, error: ERROR_MESSAGES.returnedLocked });
    expect(fail([returned], 'S01', 'Refused', '', 600)).toEqual({ ok: false, error: ERROR_MESSAGES.returnedLocked });
  });
});
