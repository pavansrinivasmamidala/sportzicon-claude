import { router } from 'expo-router';
import { Plus, Radio } from 'lucide-react-native';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MatchRow } from '@/components/MatchRow';
import { Button, EmptyState, Loading, SectionHeader, TopBar } from '@/components/ui';
import { useMatches } from '@/lib/api/matches';
import { colors } from '@/theme';

/** Scorer home: matches you're scoring, grouped by state. */
export default function Matches() {
  const mine = useMatches('mine');
  const rows = mine.data ?? [];
  const live = rows.filter((m) => m.status === 'live');
  const upcoming = rows.filter((m) => m.status === 'scheduled');
  const done = rows.filter((m) => m.status === 'completed');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Matches" large />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} tintColor={colors.accent} />}>
        <Button label="Set up a new match" icon={Plus} onPress={() => router.push('/match/new')} />
        {mine.isLoading ? <Loading /> : null}
        {live.length ? <SectionHeader title="Scoring now" /> : null}
        {live.map((m) => (
          <MatchRow key={m.id} m={m} scorerView />
        ))}
        {upcoming.length ? <SectionHeader title="Ready to start" /> : null}
        {upcoming.map((m) => (
          <MatchRow key={m.id} m={m} scorerView />
        ))}
        {done.length ? <SectionHeader title="Completed" /> : null}
        {done.map((m) => (
          <MatchRow key={m.id} m={m} />
        ))}
        {!mine.isLoading && !rows.length ? (
          <EmptyState icon={Radio} title="No matches yet" body="Set up a match, add both squads, and score it ball by ball. Followers see every ball live." />
        ) : null}
      </ScrollView>
    </View>
  );
}
