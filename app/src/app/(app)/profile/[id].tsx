import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ProfileView } from '@/components/ProfileView';
import { TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { colors } from '@/theme';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  if (id === me.id) return <Redirect href="/me" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Profile" back />
      <ProfileView id={id} />
    </View>
  );
}
