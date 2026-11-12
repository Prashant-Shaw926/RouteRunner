import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouteStore } from '../src/store/useRouteStore';

export default function Index() {
  const hasHydrated = useRouteStore((state) => state.hasHydrated);
  const signedIn = useRouteStore((state) => state.auth.agentName !== null);

  if (!hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return <Redirect href={signedIn ? '/(tabs)/route' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
  },
});
