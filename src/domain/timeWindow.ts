import { Stop, TimeAlert } from './types';
export const AT_RISK_MINUTES = 15;
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function alertFor(stop: Stop, demoMinutes: number): TimeAlert { throw new Error('TODO D'); }
export function sortRoute(stops: Stop[]): Stop[] { throw new Error('TODO B: window start, Urgent first; Retries at end'); }
