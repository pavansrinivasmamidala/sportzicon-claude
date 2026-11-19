import { router } from 'expo-router';
import { Radio } from 'lucide-react-native';
import { RefreshControl, ScrollView, View } from 'react-native';

import { LiveMatchCard } from '@/components/LiveMatchCard';
import { MatchRow } from '@/components/MatchRow';
import { Button, EmptyState, SectionHeader, TopBar } from '@/components/ui';
import { useLiveMatchCards, useMatches } from '@/lib/api/matches';
import { useMe } from '@/lib/auth';
import { colors } from '@/theme';

export default function LiveMatches() {
  const me = useMe();
  const live = useLiveMatchCards();
  const recent = useMatches('completed');
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Matches" back />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={live.isRefetching}
            onRefresh={() => {
              live.refetch();
              recent.refetch();
            }}
            tintColor={colors.accent}
          />
        }>
        {me.role === 'scorer' || me.role === 'organizer' || me.role === 'coach' || me.role === 'club' ? (
          <Button label="Score a match" variant="secondary" onPress={() => router.push('/match/new')} />
        ) : null}
        <SectionHeader title="Live now" />
        {live.data?.length ? (
          live.data.map((b) => <LiveMatchCard key={b.match.id} bundle={b} fill />)
        ) : (
          <EmptyState icon={Radio} title="No live matches" body="When a scorer starts a match, it appears here ball by ball." />
        )}
        {recent.data?.length ? <SectionHeader title="Recent results" /> : null}
        {recent.data?.map((m) => (
          <MatchRow key={m.id} m={m} />
        ))}
      </ScrollView>
    </View>
  );
}
