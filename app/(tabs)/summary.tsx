import { ScrollView, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { buildSummary } from '../../src/domain/summary';
import { SyncState } from '../../src/domain/types';
import { SyncBadge } from '../../src/components/SyncBadge';
import { useRouteStore } from '../../src/store/useRouteStore';

const ACTION_LABELS: Record<string, string> = {
  ARRIVE: 'Arrive',
  DELIVER: 'Deliver',
  FAIL: 'Fail',
  UNDO_DELIVER: 'Undo delivery',
};

export default function SummaryScreen() {
  const stops = useRouteStore((state) => state.stops);
  const queue = useRouteStore((state) => state.queue);
  const retrySync = useRouteStore((state) => state.retrySync);
  const summary = buildSummary(stops);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Route summary</Text>
        <View style={styles.metrics}>
          <Metric label="Delivered" value={summary.delivered} />
          <Metric label="Failed" value={summary.failed} />
          <Metric label="Returned" value={summary.returned} />
          <Metric label="Remaining" value={summary.remaining} />
          <Metric label="Success rate" value={`${summary.successRate.toFixed(0)}%`} />
          <Metric label="On-time rate" value={`${summary.onTimeRate.toFixed(0)}%`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions not yet synced</Text>
          {queue.length === 0 ? (
            <Text style={styles.muted}>All actions are synced.</Text>
          ) : (
            queue.map((action) => (
              <View key={action.requestId} style={styles.actionRow}>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>
                    {ACTION_LABELS[action.type] || action.type} · {action.stopId}
                  </Text>
                  <Text style={styles.muted}>Attempt {action.attempts + 1}</Text>
                </View>
                <View style={styles.actionRight}>
                  <SyncBadge state={action.state as SyncState} />
                  {action.state === 'Needs attention' ? (
                    <Pressable onPress={() => retrySync(action.requestId)}>
                      <Text style={styles.retry}>Retry now</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 20 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  metric: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '30%',
    padding: 13,
  },
  metricValue: { color: '#0f172a', fontSize: 22, fontWeight: '700' },
  metricLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#64748b', fontSize: 13 },
  actionRow: { alignItems: 'center', borderTopColor: '#e2e8f0', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  actionText: { flex: 1 },
  actionTitle: { color: '#334155', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  actionRight: { alignItems: 'flex-end', gap: 7 },
  retry: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
});
