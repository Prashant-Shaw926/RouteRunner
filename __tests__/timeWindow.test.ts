import { alertFor, sortRoute } from '../src/domain/timeWindow';
import { Stop } from '../src/domain/types';

const stop: Stop = {
  id: 'S01',
  customer: 'Customer',
  address: 'Address',
  expectedPackages: 1,
  window: { start: '14:00', end: '15:00' },
  priority: 'Normal',
  status: 'Pending',
  failCount: 0,
  isRetry: false,
  order: 0,
};

describe('Time alerts', () => {
  it('marks 14:59 AtRisk, exactly 15 minutes remaining OnTrack, and end as OnTrack', () => {
    expect(alertFor(stop, 14 * 60 + 59)).toBe('AtRisk');
    expect(alertFor(stop, 14 * 60 + 45)).toBe('OnTrack');
    expect(alertFor(stop, 15 * 60)).toBe('AtRisk');
    expect(alertFor(stop, 15 * 60 + 1)).toBe('Late');
  });

  it('never marks Delivered or Returned as late or at risk', () => {
    expect(alertFor({ ...stop, status: 'Delivered' }, 15 * 60 + 30)).toBe('OnTrack');
    expect(alertFor({ ...stop, status: 'Returned' }, 15 * 60 + 30)).toBe('OnTrack');
  });

  it('applies alerts to Failed retries', () => {
    expect(alertFor({ ...stop, status: 'Failed', isRetry: true }, 15 * 60 - 1)).toBe('AtRisk');
  });
});

describe('route sorting', () => {
  it('sorts by window start, prioritizes Urgent ties, and keeps retries last', () => {
    const stops = [
      { ...stop, id: 'normal-late', window: { start: '11:00', end: '12:00' } },
      { ...stop, id: 'urgent-tie', priority: 'Urgent' as const, window: { start: '10:00', end: '11:00' } },
      { ...stop, id: 'normal-tie', window: { start: '10:00', end: '11:00' } },
      { ...stop, id: 'retry-early', isRetry: true, window: { start: '08:00', end: '09:00' } },
    ];

    expect(sortRoute(stops).map((candidate) => candidate.id)).toEqual([
      'urgent-tie',
      'normal-tie',
      'normal-late',
      'retry-early',
    ]);
  });
});
