import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useRouteStore } from '../../src/store/useRouteStore';

export default function SettingsScreen() {
  const router = useRouter();
  const agentName = useRouteStore((state) => state.auth.agentName);
  const signOut = useRouteStore((state) => state.signOut);

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.agent}>{agentName || 'Agent'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f8fafc', flex: 1 },
  content: { padding: 20 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  label: { color: '#64748b', fontSize: 14, marginTop: 28 },
  agent: { color: '#0f172a', fontSize: 18, fontWeight: '600', marginTop: 6 },
  button: {
    alignItems: 'center',
    borderColor: '#b91c1c',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.7 },
  buttonText: { color: '#b91c1c', fontSize: 15, fontWeight: '700' },
});
