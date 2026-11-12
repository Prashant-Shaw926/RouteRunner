import routeData from './route.json';
import { Priority, Stop } from '../domain/types';

type RouteRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RouteRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTime = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60;
};

const getWindowMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const invalid = (message: string): never => {
  throw new Error(`Invalid route data: ${message}`);
};

const validateStop = (value: unknown, index: number): Stop => {
  if (!isRecord(value)) {
    return invalid(`stop ${index} must be an object`);
  }

  const path = `stop ${index}`;
  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return invalid(`${path}.id must be a non-empty string`);
  }
  if (typeof value.customer !== 'string' || value.customer.trim() === '') {
    return invalid(`${path}.customer must be a non-empty string`);
  }
  if (typeof value.address !== 'string' || value.address.trim() === '') {
    return invalid(`${path}.address must be a non-empty string`);
  }
  if (
    typeof value.expectedPackages !== 'number' ||
    !Number.isInteger(value.expectedPackages) ||
    value.expectedPackages < 1
  ) {
    return invalid(`${path}.expectedPackages must be a positive integer`);
  }
  if (!isRecord(value.window) || !isTime(value.window.start) || !isTime(value.window.end)) {
    return invalid(`${path}.window.start and .end must use HH:mm`);
  }
  if (getWindowMinutes(value.window.start) >= getWindowMinutes(value.window.end)) {
    return invalid(`${path}.window.start must be before .end`);
  }
  if (value.priority !== 'Normal' && value.priority !== 'Urgent') {
    return invalid(`${path}.priority must be Normal or Urgent`);
  }

  return {
    id: value.id,
    customer: value.customer,
    address: value.address,
    expectedPackages: value.expectedPackages,
    window: {
      start: value.window.start,
      end: value.window.end,
    },
    priority: value.priority as Priority,
    status: 'Pending',
    failCount: 0,
    isRetry: false,
    order: index,
  };
};

export function loadInitialRoute(data: unknown = routeData): Stop[] {
  if (!Array.isArray(data)) {
    return invalid('root value must be an array of stops');
  }

  const ids = new Set<string>();
  return data.map((value, index) => {
    const stop = validateStop(value, index);
    if (ids.has(stop.id)) {
      return invalid(`duplicate stop id "${stop.id}"`);
    }
    ids.add(stop.id);
    return stop;
  });
}
