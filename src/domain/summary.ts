import { Stop } from './types';
import { toMinutes } from './timeWindow';

export interface RouteSummary {
  delivered: number;
  failed: number;
  returned: number;
  remaining: number;
  successRate: number;
  onTimeRate: number;
}

export function buildSummary(stops: Stop[]): RouteSummary {
  const deliveredStops = stops.filter((stop) => stop.status === 'Delivered');
  const delivered = deliveredStops.length;
  const failed = stops.filter((stop) => stop.status === 'Failed').length;
  const returned = stops.filter((stop) => stop.status === 'Returned').length;
  const remaining = stops.filter(
    (stop) => stop.status === 'Pending' || stop.status === 'Arrived' || stop.status === 'Failed',
  ).length;
  const completed = delivered + failed + returned;
  // successRate = Delivered / (Delivered + Failed + Returned) * 100; zero when no outcomes exist.
  const successRate = completed === 0 ? 0 : (delivered / completed) * 100;
  const onTime = deliveredStops.filter(
    (stop) => stop.deliveredAtDemo !== undefined &&
      stop.deliveredAtDemo <= toMinutes(stop.window.end),
  ).length;
  // onTimeRate = Delivered stops at or before window end / all Delivered stops * 100; zero when none delivered.
  const onTimeRate = delivered === 0 ? 0 : (onTime / delivered) * 100;

  return { delivered, failed, returned, remaining, successRate, onTimeRate };
}
