import { Stop, TimeAlert } from './types';
export const AT_RISK_MINUTES = 15;
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function alertFor(stop: Stop, demoMinutes: number): TimeAlert {
  if (stop.status === 'Delivered' || stop.status === 'Returned') return 'OnTrack';

  const minutesUntilEnd = toMinutes(stop.window.end) - demoMinutes;
  if (minutesUntilEnd < 0) return 'Late';
  if (minutesUntilEnd < AT_RISK_MINUTES) return 'AtRisk';
  return 'OnTrack';
}

export function sortRoute(stops: Stop[]): Stop[] {
  return stops
    .map((stop, index) => ({ stop, index }))
    .sort((left, right) => {
      // Retry placement overrides window ordering; otherwise earlier windows win,
      // with Urgent first only when the window starts at the same time.
      if (left.stop.isRetry !== right.stop.isRetry) {
        return left.stop.isRetry ? 1 : -1;
      }

      const windowDifference =
        toMinutes(left.stop.window.start) - toMinutes(right.stop.window.start);
      if (windowDifference !== 0) return windowDifference;

      if (left.stop.priority !== right.stop.priority) {
        return left.stop.priority === 'Urgent' ? -1 : 1;
      }

      const orderDifference = left.stop.order - right.stop.order;
      return orderDifference !== 0 ? orderDifference : left.index - right.index;
    })
    .map(({ stop }) => stop);
}
