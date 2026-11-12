import { loadInitialRoute } from '../src/data/loadInitialRoute';

describe('initial route data', () => {
  it('loads the required route fixture into pending stops', () => {
    const stops = loadInitialRoute();

    expect(stops).toHaveLength(12);
    expect(stops.some((stop) => stop.priority === 'Urgent')).toBe(true);
    expect(stops.some((stop) => stop.expectedPackages >= 3)).toBe(true);
    expect(stops[0]).toMatchObject({
      status: 'Pending',
      failCount: 0,
      isRetry: false,
      order: 0,
    });

    const hasOverlappingWindows = stops.some((stop, index) =>
      stops.slice(index + 1).some(
        (other) =>
          stop.window.start < other.window.end &&
          other.window.start < stop.window.end,
      ),
    );
    expect(hasOverlappingWindows).toBe(true);
  });

  it('reports the invalid field clearly', () => {
    expect(() =>
      loadInitialRoute([
        {
          id: 'S01',
          customer: 'Customer',
          address: 'Address',
          expectedPackages: 0,
          window: { start: '09:00', end: '10:00' },
          priority: 'Normal',
        },
      ]),
    ).toThrow('Invalid route data: stop 0.expectedPackages must be a positive integer');
  });
});
