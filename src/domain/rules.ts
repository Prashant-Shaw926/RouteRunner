// Pure functions only. NO React, NO storage, NO timers.
import { Stop, FailReason } from './types';
import { ERROR_MESSAGES } from './messages';
import { toMinutes } from './timeWindow';
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_FAILS = 2;            // R4 (single constant = easy live change)
export const UNDO_WINDOW_MS = 60_000;  // R5
export const FAIL_REASONS: FailReason[] = ['Customer absent','Wrong address','Refused','Access problem','Other'];

const success = (stops: Stop[]): Result<Stop[]> => ({ ok: true, value: stops });
const failure = (error: string): Result<Stop[]> => ({ ok: false, error });

const findStop = (stops: Stop[], id: string): Stop | undefined =>
  stops.find((stop) => stop.id === id);

const lockedError = (stop: Stop): string | undefined => {
  if (stop.status === 'Delivered') return ERROR_MESSAGES.deliveredLocked;
  if (stop.status === 'Returned') return ERROR_MESSAGES.returnedLocked;
  return undefined;
};

const updateStop = (stops: Stop[], id: string, update: (stop: Stop) => Stop): Stop[] =>
  stops.map((stop) => (stop.id === id ? update(stop) : stop));

export function arrive(stops: Stop[], id: string): Result<Stop[]> {
  const stop = findStop(stops, id);
  if (!stop) return failure(ERROR_MESSAGES.stopNotFound);

  const locked = lockedError(stop);
  if (locked) return failure(locked);
  if (stop.status === 'Arrived') {
    const active = stops.find((candidate) => candidate.status === 'Arrived');
    return failure(active ? ERROR_MESSAGES.activeStop(active.customer) : ERROR_MESSAGES.arriveStatus);
  }
  if (stop.status !== 'Pending' && stop.status !== 'Failed') {
    return failure(ERROR_MESSAGES.arriveStatus);
  }

  const active = stops.find((candidate) => candidate.status === 'Arrived');
  if (active) return failure(ERROR_MESSAGES.activeStop(active.customer));

  return success(updateStop(stops, id, (current) => ({ ...current, status: 'Arrived' })));
}

export function deliver(
  stops: Stop[],
  id: string,
  recipient: string,
  confirmed: number,
  nowMs: number,
  demoMinutes: number,
): Result<Stop[]> {
  const stop = findStop(stops, id);
  if (!stop) return failure(ERROR_MESSAGES.stopNotFound);
  const locked = lockedError(stop);
  if (locked) return failure(locked);
  if (stop.status !== 'Arrived') return failure(ERROR_MESSAGES.deliverStatus);

  const trimmedRecipient = recipient.trim();
  if (trimmedRecipient.length < 2) return failure(ERROR_MESSAGES.recipientRequired);
  if (
    !Number.isInteger(confirmed) ||
    confirmed < 0 ||
    confirmed !== stop.expectedPackages
  ) {
    return failure(ERROR_MESSAGES.packageCountMismatch);
  }

  return success(updateStop(stops, id, (current) => {
    const { failReason: _failReason, failNote: _failNote, ...withoutFailure } = current;
    return {
      ...withoutFailure,
      status: 'Delivered',
      recipientName: trimmedRecipient,
      confirmedPackages: confirmed,
      deliveredAt: nowMs,
      deliveredAtDemo: demoMinutes,
    };
  }));
}

export function fail(
  stops: Stop[],
  id: string,
  reason: FailReason,
  note: string,
  demoMinutes: number,
): Result<Stop[]> {
  const stop = findStop(stops, id);
  if (!stop) return failure(ERROR_MESSAGES.stopNotFound);
  const locked = lockedError(stop);
  if (locked) return failure(locked);
  if (stop.status !== 'Arrived') return failure(ERROR_MESSAGES.failStatus);
  if (!FAIL_REASONS.includes(reason)) return failure(ERROR_MESSAGES.invalidFailReason);

  const trimmedNote = note.trim();
  if (reason === 'Other' && trimmedNote.length < 10) {
    return failure(ERROR_MESSAGES.otherNoteRequired);
  }
  if (
    stop.priority === 'Urgent' &&
    reason === 'Customer absent' &&
    demoMinutes < toMinutes(stop.window.start)
  ) {
    return failure(ERROR_MESSAGES.urgentCustomerAbsent);
  }

  const failedStop: Stop = {
    ...stop,
    status: stop.failCount + 1 >= MAX_FAILS ? 'Returned' : 'Failed',
    failCount: stop.failCount + 1,
    isRetry: stop.failCount + 1 < MAX_FAILS,
    failReason: reason,
    ...(trimmedNote ? { failNote: trimmedNote } : {}),
  };

  if (failedStop.status === 'Returned') {
    return success(updateStop(stops, id, () => failedStop));
  }

  const remaining = stops.filter((candidate) => candidate.id !== id);
  return success(
    [...remaining, failedStop].map((candidate, index) => ({ ...candidate, order: index })),
  );
}

export function undoDeliver(stops: Stop[], id: string, nowMs: number): Result<Stop[]> {
  const stop = findStop(stops, id);
  if (!stop) return failure(ERROR_MESSAGES.stopNotFound);
  if (stop.status === 'Returned') return failure(ERROR_MESSAGES.returnedLocked);
  if (stop.status !== 'Delivered') return failure(ERROR_MESSAGES.undoStatus);
  const active = stops.find((candidate) => candidate.status === 'Arrived');
  if (active) return failure(ERROR_MESSAGES.activeStopBeforeUndo(active.customer));
  if (undoSecondsLeft(stop, nowMs) <= 0) return failure(ERROR_MESSAGES.undoExpired);

  return success(updateStop(stops, id, (current) => {
    const {
      deliveredAt: _deliveredAt,
      deliveredAtDemo: _deliveredAtDemo,
      recipientName: _recipientName,
      confirmedPackages: _confirmedPackages,
      ...withoutDelivery
    } = current;
    return { ...withoutDelivery, status: 'Arrived' };
  }));
}

export function undoSecondsLeft(stop: Stop, nowMs: number): number {
  if (stop.status !== 'Delivered' || stop.deliveredAt === undefined) return 0;
  const remainingMs = UNDO_WINDOW_MS - (nowMs - stop.deliveredAt);
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}
