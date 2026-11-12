import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

const FULL_NAME = 'Prashant Shaw';
const TASK_RECEIVED_AT = '12 Nov 2026, 13:00 IST';
const APP_VERSION = '1.0.0';
const AI_USAGE_NOTE =
  'AI assistance was used for initial package setup, organizing the folder structure, and exploring optimal approaches to implementing and improving the existing code written by me. The core implementation was written by me, with AI providing suggestions, guidance, and code review support. Final implementation decisions, modifications, and verification were performed by me.';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>About RouteRunner</Text>
        <Info label="Developer" value={FULL_NAME} />
        <Info label="Task received" value={TASK_RECEIVED_AT} />
        <Info label="App version" value={APP_VERSION} />
        <View style={styles.note}>
          <Text style={styles.label}>AI usage</Text>
          <Text style={styles.value}>{AI_USAGE_NOTE}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 20 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700', marginBottom: 24 },
  info: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
  note: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 10, borderWidth: 1, marginTop: 4, padding: 16 },
  label: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  value: { color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 6 },
});
