jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

import { loadInitialRoute } from '../src/data/loadInitialRoute';
import { syncEngine, useRouteStore } from '../src/store/useRouteStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('store action persistence', () => {
  it('creates one queue item when Deliver is tapped twice quickly', async () => {
    const stops = loadInitialRoute().map((stop) =>
      stop.id === 'S01' ? { ...stop, status: 'Arrived' as const } : stop,
    );
    useRouteStore.setState({
      stops,
      queue: [],
      settings: { demoClockMinutes: 9 * 60, offlineMode: true },
    });
    syncEngine.setOffline(true);

    const deliver = useRouteStore.getState().deliver;
    await Promise.all([
      deliver('S01', 'Asha', 1, 0),
      deliver('S01', 'Asha', 1, 0),
    ]);

    expect(useRouteStore.getState().queue).toHaveLength(1);
    expect(useRouteStore.getState().queue[0].type).toBe('DELIVER');

    await syncEngine.clear();
    useRouteStore.setState({
      stops: loadInitialRoute(),
      queue: [],
      settings: { demoClockMinutes: 9 * 60, offlineMode: false },
    });
    syncEngine.setOffline(false);
  });

  it('rolls back only the second stop when its queue save fails', async () => {
    const stops = loadInitialRoute().map((stop) =>
      stop.id === 'S01' || stop.id === 'S02' ? { ...stop, status: 'Arrived' as const } : stop,
    );
    const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
    setItem.mockClear();
    useRouteStore.setState({
      stops,
      queue: [],
      settings: { demoClockMinutes: 9 * 60, offlineMode: true },
    });
    syncEngine.setOffline(true);

    const deliver = useRouteStore.getState().deliver;
    expect(await deliver('S01', 'Asha', 1, 0)).toBeUndefined();
    setItem.mockImplementationOnce(() => {
      throw new Error('second queue save failed');
    });

    const error = await deliver('S02', 'Rohan', 3, 0);

    expect(error).toBe('Unable to save this action. Please try again.');
    expect(useRouteStore.getState().stops.find((stop) => stop.id === 'S01')?.status).toBe('Delivered');
    expect(useRouteStore.getState().stops.find((stop) => stop.id === 'S02')?.status).toBe('Arrived');
    expect(useRouteStore.getState().queue).toHaveLength(1);
    expect(useRouteStore.getState().queue[0].stopId).toBe('S01');

    await syncEngine.clear();
    useRouteStore.setState({
      stops: loadInitialRoute(),
      queue: [],
      settings: { demoClockMinutes: 9 * 60, offlineMode: false },
    });
    syncEngine.setOffline(false);
  });
});
