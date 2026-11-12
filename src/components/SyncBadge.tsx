import { StyleSheet, Text, View } from 'react-native';
import { SyncState } from '../domain/types';

const colors: Record<SyncState, { background: string; text: string }> = {
  Synced: { background: '#dcfce7', text: '#166534' },
  Pending: { background: '#e2e8f0', text: '#475569' },
  Retrying: { background: '#fef3c7', text: '#92400e' },
  'Needs attention': { background: '#fee2e2', text: '#991b1b' },
};

export function SyncBadge({ state }: { state: SyncState }) {
  const color = colors[state];
  return (
    <View style={[styles.badge, { backgroundColor: color.background }]}>
      <Text style={[styles.text, { color: color.text }]}>{state}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
