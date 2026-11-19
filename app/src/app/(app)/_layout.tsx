import { Stack } from 'expo-router';

import { useNotificationsRealtime } from '@/lib/api/notifications';
import { colors } from '@/theme';

export const unstable_settings = { initialRouteName: '(tabs)' };

/** Everything a signed-in, onboarded user can reach. */
export default function AppLayout() {
  useNotificationsRealtime();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="post/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="opportunity/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/[id]/score" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
