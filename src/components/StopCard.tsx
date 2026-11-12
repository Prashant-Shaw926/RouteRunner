import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stop, SyncState, TimeAlert } from '../domain/types';
import { StatusChip } from './StatusChip';
import { SyncBadge } from './SyncBadge';

interface StopCardProps {
  stop: Stop;
  alert: TimeAlert;
  syncState: SyncState;
  onPress?: () => void;
}

export function StopCard({ stop, alert, syncState, onPress }: StopCardProps) {
  const alertLabel = alert === 'AtRisk' ? 'At risk' : alert === 'Late' ? 'Late' : null;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.customer}>{stop.customer}</Text>
          <Text style={styles.address}>{stop.address}</Text>
        </View>
        <StatusChip status={stop.status} />
      </View>

      <View style={styles.details}>
        <Text style={styles.detail}>{stop.expectedPackages} package{stop.expectedPackages === 1 ? '' : 's'}</Text>
        <Text style={styles.detail}>{stop.window.start}–{stop.window.end}</Text>
        <View style={[styles.priority, stop.priority === 'Urgent' && styles.urgent]}>
          <Text style={[styles.priorityText, stop.priority === 'Urgent' && styles.urgentText]}>
            {stop.priority}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {alertLabel ? (
          <Text style={[styles.alert, alert === 'Late' && styles.late]}>{alertLabel}</Text>
        ) : (
          <Text style={styles.detail}>On track</Text>
        )}
        <SyncBadge state={syncState} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  pressed: { opacity: 0.75 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  heading: { flex: 1, marginRight: 12 },
  customer: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  address: { color: '#64748b', fontSize: 13, marginTop: 4 },
  details: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 16 },
  detail: { color: '#475569', fontSize: 13 },
  priority: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  urgent: { backgroundColor: '#fee2e2' },
  priorityText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  urgentText: { color: '#b91c1c' },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  alert: { color: '#b45309', fontSize: 13, fontWeight: '700' },
  late: { color: '#b91c1c' },
});
