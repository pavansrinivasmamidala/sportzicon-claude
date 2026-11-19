import { useLocalSearchParams } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BallChip, InningsCard, ScoreHero } from '@/components/Scoreboard';
import { Button, IconButton, Text, TopBar, UnderlineTabs } from '@/components/ui';
import { useMatchBundle } from '@/lib/api/matches';
import { useProfile } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { buildScoreboard, describeBall, oversText } from '@/lib/cricket';
import { colors, radius } from '@/theme';
import { go } from '@/lib/nav';
import { ScreenState } from '@/components/ScreenState';

type Tab = 'live' | 'scorecard' | 'commentary';

export default function MatchViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const q = useMatchBundle(id);
  const scorer = useProfile(q.data?.match.scorer_id ?? undefined);
  const [picked, setTab] = useState<Tab | null>(null);
  const sb = useMemo(() => (q.data ? buildScoreboard(q.data.match, q.data.players, q.data.balls) : null), [q.data]);

  if (q.isLoading) return <ScreenState />;
  if (q.error || !q.data || !sb) return <ScreenState error={q.error?.message ?? 'Match not found'} />;
  const { match, players, balls } = q.data;
  const cur = sb.current;
  const name = (pid: string | null) => players.find((p) => p.id === pid)?.name;
  const striker = cur.batters.find((b) => b.id === match.striker_id);
  const nonStriker = cur.batters.find((b) => b.id === match.non_striker_id);
  const bowler = cur.bowlers.find((b) => b.id === match.bowler_id);
  const commentary = [...balls].sort((a, b) => b.innings - a.innings || b.seq - a.seq);
  const overOf = (inn: 1 | 2, seq: number) => {
    const legal = balls.filter((x) => x.innings === inn && x.seq < seq && x.extra_type !== 'wide' && x.extra_type !== 'noball').length;
    return `${Math.floor(legal / 6)}.${(legal % 6) + 1}`;
  };
  const isScorer = match.scorer_id === me.id && match.status !== 'completed';
  const done = match.status === 'completed';
  const tab: Tab = picked ?? (done ? 'scorecard' : 'live');
  // Only show batters who are still in.
  const atCrease = (b: typeof striker) => (b && !b.out ? b : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        title={match.status === 'live' ? 'Live match' : 'Match'}
        back
        right={<IconButton icon={Share2} label="Share match" tone="onDark" onPress={() => Share.share({ message: `${match.team_a} vs ${match.team_b}: follow ball by ball on Sportzicon` })} />}
      />
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 24 }}>
        <ScoreHero match={match} sb={sb} />
        <UnderlineTabs
          tabs={[
            ...(done ? [] : [{ value: 'live' as const, label: 'Live' }]),
            { value: 'scorecard', label: 'Scorecard' },
            { value: 'commentary', label: 'Commentary' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ padding: 16, gap: 12 }}>
          {tab === 'live' ? (
            <>
              {match.status !== 'scheduled' ? (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <BatterLine b={atCrease(striker)} onStrike />
                    <BatterLine b={atCrease(nonStriker)} right />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="smallStrong" numberOfLines={1}>
                        {bowler?.name ?? name(match.bowler_id) ?? 'New over'}
                      </Text>
                      {bowler ? (
                        <Text variant="caption" color={colors.inkMuted} numeric>
                          {`${oversText(bowler.legalBalls)} ov · ${bowler.runs} runs · ${bowler.wickets} wkt${bowler.wickets === 1 ? '' : 's'}`}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: '60%' }}>
                      {cur.thisOver.map((b) => (
                        <BallChip key={b.id} b={b} size={28} />
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
              <CommentaryList items={commentary.slice(0, 8)} players={players} overOf={overOf} />
            </>
          ) : null}
          {tab === 'scorecard' ? sb.innings.map((inn) => <InningsCard key={inn.innings} match={match} inn={inn} strikerId={!done && inn.innings === match.current_innings ? match.striker_id : null} />) : null}
          {tab === 'commentary' ? <CommentaryList items={commentary} players={players} overOf={overOf} /> : null}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: insets.bottom + 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text variant="small" color={colors.inkSecondary} style={{ flex: 1 }}>
          {scorer.data ? (
            <>
              Scored live by <Text variant="smallStrong">{scorer.data.full_name}</Text>, official scorer
            </>
          ) : (
            'Official scoring'
          )}
        </Text>
        {isScorer ? <Button label="Open scorer" size="sm" fullWidth={false} onPress={() => go(`/match/${match.id}/score`)} /> : null}
      </View>
    </View>
  );
}

function BatterLine({ b, onStrike, right }: { b?: { name: string; runs: number; balls: number }; onStrike?: boolean; right?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Text variant="smallStrong" numberOfLines={1}>
        {b ? b.name : 'Next batter'}
        {b && onStrike ? <Text color={colors.brand}> ●</Text> : null}
      </Text>
      {b ? (
        <Text variant="caption" color={colors.inkMuted} numeric>
          {b.runs} ({b.balls})
        </Text>
      ) : null}
    </View>
  );
}

function CommentaryList({ items, players, overOf }: { items: import('@/lib/types').Ball[]; players: import('@/lib/types').MatchPlayer[]; overOf: (inn: 1 | 2, seq: number) => string }) {
  if (!items.length) return <Text color={colors.inkMuted}>Commentary appears here once play starts.</Text>;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
      {items.map((b, i) => (
        <View key={b.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
          <View style={{ width: 40, alignItems: 'center', gap: 6 }}>
            <Text variant="smallStrong" numeric>
              {overOf(b.innings, b.seq)}
            </Text>
            <BallChip b={b} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{b.commentary || describeBall(b, players)}</Text>
        </View>
      ))}
    </View>
  );
}
