import { Stack } from 'expo-router';
import { useRouteStore } from '../src/store/useRouteStore';

export default function Root() {
  const hasHydrated = useRouteStore((state) => state.hasHydrated);
  const signedIn = useRouteStore((state) => state.auth.agentName !== null);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Protected guard={hasHydrated && signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stop/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
