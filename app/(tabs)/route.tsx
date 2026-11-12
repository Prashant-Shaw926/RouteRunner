import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { alertFor, sortRoute } from '../../src/domain/timeWindow';
import { StopStatus } from '../../src/domain/types';
import { StopCard } from '../../src/components/StopCard';
import { syncStateByStop, useRouteStore } from '../../src/store/useRouteStore';

type StatusFilter = 'All' | StopStatus;
const STATUS_FILTERS: StatusFilter[] = ['All', 'Pending', 'Arrived', 'Delivered', 'Failed', 'Returned'];

export default function RouteScreen() {
  const stops = useRouteStore((state) => state.stops);
  const queue = useRouteStore((state) => state.queue);
  const demoMinutes = useRouteStore((state) => state.settings.demoClockMinutes);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const filteredStops = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortRoute(stops.filter((stop) =>
      (!query || stop.customer.toLowerCase().includes(query)) &&
      (statusFilter === 'All' || stop.status === statusFilter),
    ));
  }, [search, statusFilter, stops]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.heading}>
        <Text style={styles.title}>Today&apos;s route</Text>
        <Text style={styles.subtitle}>{filteredStops.length} of {stops.length} stops</Text>
        <TextInput
          accessibilityLabel="Search customers"
          onChangeText={setSearch}
          placeholder="Search customer name"
          style={styles.search}
          value={search}
        />
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {STATUS_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipSelected]}
            >
              <Text style={[styles.filterText, statusFilter === filter && styles.filterTextSelected]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        contentContainerStyle={filteredStops.length === 0 ? styles.emptyContent : styles.list}
        data={filteredStops}
        keyExtractor={(stop) => stop.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptyText}>Try a different customer or status filter.</Text>
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
  search: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filters: { gap: 8, paddingVertical: 12 },
  filterChip: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipSelected: { backgroundColor: '#dbeafe', borderColor: '#1d4ed8' },
  filterText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  filterTextSelected: { color: '#1d4ed8' },
  list: { padding: 20, paddingTop: 16 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  empty: { alignItems: 'center' },
  emptyTitle: { color: '#334155', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#64748b', marginTop: 6 },
});
