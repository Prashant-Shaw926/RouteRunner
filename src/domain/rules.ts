// Pure functions only. NO React, NO storage, NO timers.
import { Stop, FailReason } from './types';
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_FAILS = 2;            // R4 (single constant = easy live change)
export const UNDO_WINDOW_MS = 60_000;  // R5
export const FAIL_REASONS: FailReason[] = ['Customer absent','Wrong address','Refused','Access problem','Other'];

export function arrive(stops: Stop[], id: string): Result<Stop[]> { throw new Error('TODO R1'); }
export function deliver(stops: Stop[], id: string, recipient: string, confirmed: number, nowMs: number): Result<Stop[]> { throw new Error('TODO R2'); }
export function fail(stops: Stop[], id: string, reason: FailReason, note: string, demoMinutes: number): Result<Stop[]> { throw new Error('TODO R3, R4, R6'); }
export function undoDeliver(stops: Stop[], id: string, nowMs: number): Result<Stop[]> { throw new Error('TODO R5'); }
export function undoSecondsLeft(stop: Stop, nowMs: number): number { throw new Error('TODO R5 countdown'); }
