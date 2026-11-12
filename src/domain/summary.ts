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
  const completed = delivered + returned;
  // successRate = delivered / completed deliveries (Delivered + Returned) * 100.
  const successRate = completed === 0 ? 0 : (delivered / completed) * 100;
  const onTime = deliveredStops.filter(
    (stop) => stop.deliveredAtDemo !== undefined &&
      stop.deliveredAtDemo <= toMinutes(stop.window.end),
  ).length;
  // onTimeRate = on-time Delivered stops / all Delivered stops * 100.
  const onTimeRate = delivered === 0 ? 0 : (onTime / delivered) * 100;

  return { delivered, failed, returned, remaining, successRate, onTimeRate };
}
