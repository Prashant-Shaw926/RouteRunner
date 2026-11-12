import { StyleSheet, Text, View } from 'react-native';
import { StopStatus } from '../domain/types';

const colors: Record<StopStatus, { background: string; text: string }> = {
  Pending: { background: '#f1f5f9', text: '#475569' },
  Arrived: { background: '#dbeafe', text: '#1d4ed8' },
  Delivered: { background: '#dcfce7', text: '#166534' },
  Failed: { background: '#fef3c7', text: '#92400e' },
  Returned: { background: '#fee2e2', text: '#991b1b' },
};

export function StatusChip({ status }: { status: StopStatus }) {
  const color = colors[status];
  return (
    <View style={[styles.chip, { backgroundColor: color.background }]}>
      <Text style={[styles.text, { color: color.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});
