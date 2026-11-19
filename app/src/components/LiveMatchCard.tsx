import { Pressable, View } from 'react-native';

import { LiveBadge, Text } from '@/components/ui';
import type { MatchBundle } from '@/lib/api/matches';
import { buildScoreboard, oversText, teamName } from '@/lib/cricket';
import { colors, radius } from '@/theme';
import { go } from '@/lib/nav';

/** Compact dark scorecard for the "Live now" strip. */
export function LiveMatchCard({ bundle, fill }: { bundle: MatchBundle; fill?: boolean }) {
  const width = fill ? undefined : 286;
  const { match } = bundle;
  const sb = buildScoreboard(match, bundle.players, bundle.balls);
  const first = sb.innings[0];
  const second = sb.innings[1];
  const line = (team: 'a' | 'b') => {
    const inn = sb.innings.find((i) => i.battingTeam === team);
    const batting = sb.current.battingTeam === team && match.status === 'live';
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant={batting ? 'bodyStrong' : 'body'} color={batting ? colors.onDark : colors.onDarkSecondary} numberOfLines={1} style={{ flex: 1 }}>
          {teamName(match, team)}
        </Text>
        <Text variant={batting ? 'bodyStrong' : 'body'} numeric color={batting ? colors.onDark : colors.onDarkSecondary}>
          {inn ? `${inn.runs}/${inn.wickets}` : 'Yet to bat'}
          {inn ? <Text variant="small" color={colors.onDarkSecondary}>{`  (${oversText(inn.legalBalls)})`}</Text> : null}
        </Text>
      </View>
    );
  };
  const status = match.result
    ? match.result
    : second && sb.needRuns !== null
      ? `${teamName(match, second.battingTeam)} need ${sb.needRuns} off ${sb.ballsLeft} balls`
      : first.legalBalls === 0
        ? `${teamName(match, match.batting_first)} batting first`
        : `CRR ${sb.crr.toFixed(2)}`;

  return (
    <Pressable
      onPress={() => go(`/match/${match.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`Live: ${match.team_a} versus ${match.team_b}. ${status}`}
      style={({ pressed }) => ({ width, backgroundColor: colors.dark, borderRadius: radius.xl, padding: 14, gap: 10, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {match.status === 'live' ? <LiveBadge /> : null}
        <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1} style={{ flex: 1 }}>
          {match.format}
          {match.competition ? ` · ${match.competition}` : ''}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {line(match.batting_first)}
        {line(match.batting_first === 'a' ? 'b' : 'a')}
      </View>
      <Text variant="smallStrong" color={colors.brand} numberOfLines={1}>
        {status}
      </Text>
    </Pressable>
  );
}
