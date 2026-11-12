import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRouteStore } from '../../src/store/useRouteStore';

const MINUTES_IN_DAY = 24 * 60;

const formatClock = (minutes: number): string => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
};

const parseClock = (value: string): number | undefined => {
  if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
};

export default function SettingsScreen() {
  const router = useRouter();
  const demoClockMinutes = useRouteStore((state) => state.settings.demoClockMinutes);
  const offlineMode = useRouteStore((state) => state.settings.offlineMode);
  const setDemoClock = useRouteStore((state) => state.setDemoClock);
  const setOffline = useRouteStore((state) => state.setOffline);
  const signOut = useRouteStore((state) => state.signOut);
  const resetDemo = useRouteStore((state) => state.resetDemo);
  const agentName = useRouteStore((state) => state.auth.agentName);
  const [clockText, setClockText] = useState(formatClock(demoClockMinutes));
  const [clockError, setClockError] = useState<string | null>(null);

  useEffect(() => {
    setClockText(formatClock(demoClockMinutes));
  }, [demoClockMinutes]);

  const updateClock = (minutes: number) => {
    const normalized = (minutes + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    setDemoClock(normalized);
    setClockText(formatClock(normalized));
    setClockError(null);
  };

  const commitClockText = () => {
    const parsed = parseClock(clockText);
    if (parsed === undefined) {
      setClockError('Enter a valid time in HH:mm format.');
      return;
    }
    updateClock(parsed);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset demo data?',
      'This clears the route progress and pending sync actions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetDemo().catch((error) => {
              console.error('Demo reset failed', error);
              Alert.alert('Reset failed', 'Unable to reset demo data. Please try again.');
            });
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo clock</Text>
          <Text style={styles.helper}>Changing this updates route time alerts immediately.</Text>
          <View style={styles.clockRow}>
            <Pressable onPress={() => updateClock(demoClockMinutes - 15)} style={styles.stepButton}>
              <Text style={styles.stepText}>−15</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Demo clock time"
              onChangeText={(value) => {
                setClockText(value);
                setClockError(null);
              }}
              onSubmitEditing={commitClockText}
              placeholder="HH:mm"
              returnKeyType="done"
              style={styles.clockInput}
              value={clockText}
            />
            <Pressable onPress={() => updateClock(demoClockMinutes + 15)} style={styles.stepButton}>
              <Text style={styles.stepText}>+15</Text>
            </Pressable>
          </View>
          {clockError ? <Text style={styles.error}>{clockError}</Text> : null}
          <Text style={styles.currentClock}>Current demo time: {formatClock(demoClockMinutes)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.sectionTitle}>Offline mode</Text>
              <Text style={styles.helper}>Requests fail locally until you turn this off.</Text>
            </View>
            <Switch
              accessibilityLabel="Offline mode"
              onValueChange={setOffline}
              value={offlineMode}
            />
          </View>
          {offlineMode ? <Text style={styles.offlineText}>Offline mode ON</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.agent}>{agentName || 'Agent'}</Text>
          <Pressable onPress={handleSignOut} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset demo data</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 20 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  helper: { color: '#64748b', fontSize: 13, marginTop: 5 },
  clockRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  stepButton: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
  stepText: { color: '#1d4ed8', fontWeight: '700' },
  clockInput: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    textAlign: 'center',
    width: 110,
  },
  currentClock: { color: '#475569', fontSize: 13, marginTop: 12 },
  error: { color: '#b91c1c', fontSize: 13, marginTop: 8 },
  switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  switchText: { flex: 1, marginRight: 12 },
  offlineText: { color: '#b91c1c', fontSize: 13, fontWeight: '700', marginTop: 12 },
  label: { color: '#64748b', fontSize: 14 },
  agent: { color: '#0f172a', fontSize: 18, fontWeight: '600', marginTop: 5 },
  outlineButton: { borderColor: '#b91c1c', borderRadius: 8, borderWidth: 1, marginTop: 18, paddingVertical: 11 },
  outlineButtonText: { color: '#b91c1c', fontWeight: '700', textAlign: 'center' },
  resetButton: { marginTop: 22, paddingVertical: 12 },
  resetText: { color: '#b91c1c', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
