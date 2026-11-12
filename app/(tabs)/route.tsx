import { useMemo } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { alertFor, sortRoute } from '../../src/domain/timeWindow';
import { StopCard } from '../../src/components/StopCard';
import { syncStateByStop, useRouteStore } from '../../src/store/useRouteStore';

export default function RouteScreen() {
  const stops = useRouteStore((state) => state.stops);
  const queue = useRouteStore((state) => state.queue);
  const demoMinutes = useRouteStore((state) => state.settings.demoClockMinutes);
  const sortedStops = useMemo(() => sortRoute(stops), [stops]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.heading}>
        <Text style={styles.title}>Today&apos;s route</Text>
        <Text style={styles.subtitle}>{sortedStops.length} stops</Text>
      </View>
      <FlatList
        contentContainerStyle={sortedStops.length === 0 ? styles.emptyContent : styles.list}
        data={sortedStops}
        keyExtractor={(stop) => stop.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No stops match</Text>
            <Text style={styles.emptyText}>Try changing your filters.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <StopCard
            alert={alertFor(item, demoMinutes)}
            onPress={() => router.push(`/stop/${item.id}`)}
            stop={item}
            syncState={syncStateByStop(item.id, queue)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  heading: { paddingHorizontal: 20, paddingTop: 16 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  list: { padding: 20, paddingTop: 16 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  empty: { alignItems: 'center' },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#64748b', marginTop: 6 },
});
