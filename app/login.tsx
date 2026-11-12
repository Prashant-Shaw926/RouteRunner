import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRouteStore } from '../src/store/useRouteStore';
import { DEMO_AGENT_NAME, DEMO_PIN } from '../src/config/demoCredentials';

export default function Login() {
  const router = useRouter();
  const signIn = useRouteStore((state) => state.signIn);
  const [agentName, setAgentName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pinInput = useRef<TextInput>(null);

  const submit = () => {
    const name = agentName.trim();
    if (!name) {
      setError('Enter your agent name.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (name !== DEMO_AGENT_NAME || pin !== DEMO_PIN) {
      setError('Use the demo credentials shown below.');
      return;
    }

    setError(null);
    signIn(name);
    router.replace('/(tabs)/route');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NEXU RouteRunner</Text>
          <Text style={styles.title}>Delivery agent sign in</Text>
          <Text style={styles.subtitle}>Sign in to manage today&apos;s route.</Text>

          <Text style={styles.label}>Agent name</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            onChangeText={(value) => {
              setAgentName(value);
              setError(null);
            }}
            onSubmitEditing={() => pinInput.current?.focus()}
            placeholder="Enter agent name"
            returnKeyType="next"
            style={styles.input}
            value={agentName}
          />

          <Text style={styles.label}>4-digit PIN</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, ''));
              setError(null);
            }}
            onSubmitEditing={submit}
            placeholder="••••"
            ref={pinInput}
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            value={pin}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo credentials</Text>
            <Text style={styles.demoText}>Agent: {DEMO_AGENT_NAME}</Text>
            <Text style={styles.demoText}>PIN: {DEMO_PIN}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
  },
  eyebrow: { color: '#1d4ed8', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 15, marginBottom: 28, marginTop: 8 },
  label: { color: '#334155', fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  error: { color: '#b91c1c', fontSize: 14, marginTop: 12 },
  button: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    marginTop: 22,
    paddingVertical: 13,
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  demoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginTop: 24,
    padding: 12,
  },
  demoTitle: { color: '#1e3a8a', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  demoText: { color: '#1e40af', fontSize: 13, marginTop: 2 },
});
