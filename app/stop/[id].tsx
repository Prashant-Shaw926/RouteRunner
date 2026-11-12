import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FAIL_REASONS } from '../../src/domain/rules';
import { undoSecondsLeft } from '../../src/domain/rules';
import { FailReason, Stop, SyncState } from '../../src/domain/types';
import { StatusChip } from '../../src/components/StatusChip';
import { SyncBadge } from '../../src/components/SyncBadge';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { syncStateByStop, useRouteStore } from '../../src/store/useRouteStore';

const ACTION_LABELS: Record<string, string> = {
  ARRIVE: 'Arrive',
  DELIVER: 'Deliver',
  FAIL: 'Fail',
  UNDO_DELIVER: 'Undo delivery',
};

export default function StopDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const stopId = Array.isArray(id) ? id[0] : id;
  const stop = useRouteStore((state) => state.stops.find((candidate) => candidate.id === stopId));
  const queue = useRouteStore((state) => state.queue);
  const arrive = useRouteStore((state) => state.arrive);
  const deliver = useRouteStore((state) => state.deliver);
  const fail = useRouteStore((state) => state.fail);
  const undoDeliver = useRouteStore((state) => state.undoDeliver);
  const retrySync = useRouteStore((state) => state.retrySync);

  const [recipient, setRecipient] = useState('');
  const [confirmedPackages, setConfirmedPackages] = useState('');
  const [reason, setReason] = useState<FailReason>(FAIL_REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (stop?.status !== 'Delivered') return undefined;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stop?.deliveredAt, stop?.status]);

  const secondsLeft = stop ? undoSecondsLeft(stop, nowMs) : 0;
  const syncState = stop ? syncStateByStop(stop.id, queue) : 'Synced';
  const stopQueue = useMemo(
    () => queue.filter((action) => action.stopId === stop?.id).sort((a, b) => a.seq - b.seq),
    [queue, stop?.id],
  );

  if (!stop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.title}>Stop not found</Text>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back to route</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const showError = (message: string | undefined) => {
    setError(message || null);
  };

  const handleArrive = async () => {
    showError(await arrive(stop.id));
  };

  const handleDeliver = async () => {
    if (!/^\d+$/.test(confirmedPackages)) {
      setError('Enter a whole package count.');
      return;
    }
    showError(await deliver(stop.id, recipient, Number(confirmedPackages)));
  };

  const handleFail = async () => {
    showError(await fail(stop.id, reason, note));
  };

  const handleUndo = async () => {
    if (secondsLeft <= 0) return;
    showError(await undoDeliver(stop.id));
  };

  const isLocked = stop.status === 'Returned';
  const canArrive = stop.status === 'Pending' || stop.status === 'Failed';

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Route</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{stop.customer}</Text>
            <Text style={styles.address}>{stop.address}</Text>
          </View>
          <SyncBadge state={syncState} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.info}>{stop.expectedPackages} package{stop.expectedPackages === 1 ? '' : 's'}</Text>
          <Text style={styles.info}>Window: {stop.window.start}–{stop.window.end}</Text>
          <Text style={styles.info}>Priority: {stop.priority}</Text>
          <StatusChip status={stop.status} />
        </View>

        {stop.isRetry || stop.failCount > 0 ? (
          <View style={styles.retryBox}>
            <Text style={styles.retryTitle}>Retry {stop.failCount}/2</Text>
            <Text style={styles.retryText}>
              This stop has failed {stop.failCount} time{stop.failCount === 1 ? '' : 's'}.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canArrive ? (
          <ActionButton label={stop.status === 'Failed' ? 'Mark Retry Arrived' : 'Mark Arrived'} onPress={handleArrive} />
        ) : null}

        {stop.status === 'Arrived' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deliver package</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setRecipient}
                placeholder="Recipient name"
                style={styles.input}
                value={recipient}
              />
              <TextInput
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(value) => setConfirmedPackages(value.replace(/\D/g, ''))}
                placeholder={`Confirmed packages (expected ${stop.expectedPackages})`}
                style={styles.input}
                value={confirmedPackages}
              />
              <ActionButton label="Deliver" onPress={handleDeliver} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Report failure</Text>
              <View style={styles.reasonList}>
                {FAIL_REASONS.map((candidate) => (
                  <Pressable
                    key={candidate}
                    onPress={() => setReason(candidate)}
                    style={[styles.reason, reason === candidate && styles.reasonSelected]}
                  >
                    <Text style={[styles.reasonText, reason === candidate && styles.reasonSelectedText]}>
                      {candidate}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                multiline
                onChangeText={setNote}
                placeholder={reason === 'Other' ? 'Required note' : 'Optional note'}
                style={[styles.input, styles.noteInput]}
                value={note}
              />
              <Text style={styles.counter}>{note.trim().length} characters{reason === 'Other' ? ' (10 required)' : ''}</Text>
              <ActionButton label="Fail stop" onPress={handleFail} secondary />
            </View>
          </>
        ) : null}

        {stop.status === 'Delivered' ? (
          <View style={styles.section}>
            <Text style={styles.lockedLabel}>Delivered — locked except for undo</Text>
            <Text style={styles.countdown}>
              {secondsLeft > 0 ? `Undo available for ${secondsLeft}s` : 'Undo window expired'}
            </Text>
            <ActionButton label="Undo delivery" onPress={handleUndo} disabled={secondsLeft === 0} secondary />
          </View>
        ) : null}

        {isLocked ? (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedLabel}>Returned — locked</Text>
            <Text style={styles.muted}>No further actions are available for this stop.</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync queue</Text>
          {stopQueue.length === 0 ? (
            <Text style={styles.muted}>No queued actions. Synced.</Text>
          ) : (
            stopQueue.map((action) => (
              <View key={action.requestId} style={styles.queueRow}>
                <View style={styles.queueText}>
                  <Text style={styles.queueAction}>{ACTION_LABELS[action.type] || action.type}</Text>
                  <Text style={styles.muted}>Attempt {action.attempts + 1}</Text>
                </View>
                <View style={styles.queueRight}>
                  <SyncBadge state={action.state as SyncState} />
                  {action.state === 'Needs attention' ? (
                    <Pressable onPress={() => retrySync(action.requestId)} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Retry now</Text>
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

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? styles.secondaryButton : styles.primaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={secondary ? styles.secondaryButtonText : styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 20 },
  back: { marginBottom: 18 },
  backText: { color: '#1d4ed8', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { flex: 1, marginRight: 12 },
  title: { color: '#0f172a', fontSize: 25, fontWeight: '700' },
  address: { color: '#64748b', fontSize: 14, marginTop: 5 },
  infoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 9,
    marginTop: 18,
    padding: 16,
  },
  info: { color: '#475569', fontSize: 14 },
  retryBox: { backgroundColor: '#fff7ed', borderRadius: 8, marginTop: 14, padding: 12 },
  retryTitle: { color: '#9a3412', fontSize: 14, fontWeight: '700' },
  retryText: { color: '#c2410c', fontSize: 13, marginTop: 4 },
  error: { color: '#b91c1c', fontSize: 14, fontWeight: '600', marginTop: 14 },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  noteInput: { minHeight: 76, textAlignVertical: 'top' },
  counter: { color: '#64748b', fontSize: 12, marginBottom: 10, marginTop: -4 },
  primaryButton: { alignItems: 'center', backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#1d4ed8', borderRadius: 8, borderWidth: 1, paddingVertical: 11 },
  secondaryButtonText: { color: '#1d4ed8', fontSize: 15, fontWeight: '700' },
  disabled: { borderColor: '#cbd5e1', opacity: 0.55 },
  pressed: { opacity: 0.75 },
  reasonList: { gap: 8, marginBottom: 12 },
  reason: { borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, padding: 10 },
  reasonSelected: { backgroundColor: '#eff6ff', borderColor: '#1d4ed8' },
  reasonText: { color: '#475569', fontSize: 14 },
  reasonSelectedText: { color: '#1d4ed8', fontWeight: '700' },
  lockedBox: { backgroundColor: '#f1f5f9', borderRadius: 8, marginTop: 16, padding: 14 },
  lockedLabel: { color: '#475569', fontSize: 14, fontWeight: '700' },
  countdown: { color: '#334155', fontSize: 15, marginBottom: 12, marginTop: 8 },
  muted: { color: '#64748b', fontSize: 13 },
  queueRow: { alignItems: 'center', borderTopColor: '#e2e8f0', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  queueText: { flex: 1 },
  queueAction: { color: '#334155', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  queueRight: { alignItems: 'flex-end', gap: 8 },
  retryButton: { paddingVertical: 2 },
  retryButtonText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
});
