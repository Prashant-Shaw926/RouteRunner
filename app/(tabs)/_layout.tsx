import { Tabs } from 'expo-router';
import { OfflineBanner } from '../../src/components/OfflineBanner';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <OfflineBanner />,
      }}
    />
  );
}
