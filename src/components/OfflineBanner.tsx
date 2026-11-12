import { StyleSheet, Text, View } from 'react-native';
import { useRouteStore } from '../store/useRouteStore';

export function OfflineBanner() {
  const offline = useRouteStore((state) => state.settings.offlineMode);
  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Offline mode ON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    paddingVertical: 8,
  },
  text: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
