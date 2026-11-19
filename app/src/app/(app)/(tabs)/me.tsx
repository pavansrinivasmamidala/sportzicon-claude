import { View } from 'react-native';

import { ProfileView } from '@/components/ProfileView';
import { TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { colors } from '@/theme';

export default function MyProfile() {
  const me = useMe();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title={me.role === 'athlete' ? 'My passport' : 'My profile'} large />
      <ProfileView id={me.id} isMe />
    </View>
  );
}
