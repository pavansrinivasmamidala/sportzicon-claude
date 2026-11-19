import { router } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { PersonCard } from '@/components/PersonCard';
import { EmptyState, Loading, TopBar } from '@/components/ui';
import { useShortlistedProfiles } from '@/lib/api/people';
import { colors } from '@/theme';

export default function Shortlist() {
  const list = useShortlistedProfiles();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="My shortlist" back />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => <PersonCard p={item} />}
        ListEmptyComponent={
          list.isLoading ? (
            <Loading />
          ) : (
            <EmptyState icon={Bookmark} title="Your shortlist is empty" body="Tap the bookmark on any athlete to track them here." actionLabel="Search athletes" onAction={() => router.push('/search')} />
          )
        }
      />
    </View>
  );
}
