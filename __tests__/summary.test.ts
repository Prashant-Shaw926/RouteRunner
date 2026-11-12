import { buildSummary } from '../src/domain/summary';
import { Stop } from '../src/domain/types';

const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
  id: 'S01',
  customer: 'Customer',
  address: 'Address',
  expectedPackages: 1,
  window: { start: '09:00', end: '10:00' },
  priority: 'Normal',
  status: 'Pending',
  failCount: 0,
  isRetry: false,
  order: 0,
  ...overrides,
});

describe('route summary', () => {
  it('counts statuses and calculates completion rates', () => {
    const stops = [
      makeStop({ id: 'S01', status: 'Delivered', deliveredAtDemo: 599 }),
      makeStop({ id: 'S02', status: 'Delivered', deliveredAtDemo: 601 }),
      makeStop({ id: 'S03', status: 'Returned', failCount: 2 }),
      makeStop({ id: 'S04', status: 'Failed', failCount: 1 }),
      makeStop({ id: 'S05', status: 'Arrived' }),
      makeStop({ id: 'S06', status: 'Pending' }),
    ];

    expect(buildSummary(stops)).toEqual({
      delivered: 2,
      failed: 1,
      returned: 1,
      remaining: 3,
      successRate: 50,
      onTimeRate: 50,
    });

  });

  it('includes Failed outcomes in the success-rate denominator', () => {
    const stops = [
      makeStop({ id: 'S01', status: 'Delivered', deliveredAtDemo: 600 }),
      makeStop({ id: 'S02', status: 'Failed', failCount: 1 }),
      makeStop({ id: 'S03', status: 'Returned', failCount: 2 }),
    ];

    expect(buildSummary(stops).successRate).toBeCloseTo(33.333333);
  });

  it('returns zero rates when no stops are completed or delivered', () => {
    expect(buildSummary([makeStop()])).toEqual({
      delivered: 0,
      failed: 0,
      returned: 0,
      remaining: 1,
      successRate: 0,
      onTimeRate: 0,
    });
  });
});
