import { View } from 'react-native';

import { Avatar, LiveBadge, Text } from '@/components/ui';
import { ballLabel, oversText, teamName, type InningsSummary, type Scoreboard } from '@/lib/cricket';
import type { Ball, Match } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

export function BallChip({ b, size = 30 }: { b: Pick<Ball, 'runs_bat' | 'extra_type' | 'extra_runs' | 'is_wicket'>; size?: number }) {
  const label = ballLabel(b);
  const boundary = !b.is_wicket && b.extra_type === 'none' && (b.runs_bat === 4 || b.runs_bat === 6);
  const extra = b.extra_type !== 'none' && !b.is_wicket;
  const bg = b.is_wicket ? colors.live : boundary ? colors.brand : extra ? colors.warningSoft : colors.surface;
  const fg = b.is_wicket ? colors.white : boundary ? colors.ink : extra ? colors.warningInk : colors.ink;
  return (
    <View
      accessibilityLabel={b.is_wicket ? 'Wicket' : label}
      style={{ minWidth: size, height: size, paddingHorizontal: label.length > 2 ? 4 : 0, borderRadius: size / 2, backgroundColor: bg, borderWidth: !b.is_wicket && !boundary && !extra ? 1 : 0, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: label.length > 2 ? 11 : 13, color: fg }}>{label}</Text>
    </View>
  );
}

/** Dark score header used by the viewer. */
export function ScoreHero({ match, sb }: { match: Match; sb: Scoreboard }) {
  const row = (team: 'a' | 'b') => {
    const inn = sb.innings.find((i) => i.battingTeam === team);
    const batting = match.status === 'live' && sb.current.battingTeam === team;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={teamName(match, team)} size={34} square />
        <Text variant={batting ? 'title' : 'body'} color={batting ? colors.onDark : colors.onDarkSecondary} style={{ flex: 1 }} numberOfLines={1}>
          {teamName(match, team)}
        </Text>
        <Text variant={batting ? 'h1' : 'h3'} color={batting ? colors.onDark : colors.onDarkSecondary} numeric>
          {inn ? `${inn.runs}/${inn.wickets}` : '—'}
          {inn ? <Text variant="small" color={colors.onDarkSecondary}>{`  (${oversText(inn.legalBalls)})`}</Text> : null}
        </Text>
      </View>
    );
  };
  const second = sb.innings[1];
  const status = match.result
    ? match.result
    : match.status === 'scheduled'
      ? 'Match hasn’t started yet'
      : second && sb.needRuns !== null
        ? `${teamName(match, second.battingTeam)} need ${sb.needRuns} run${sb.needRuns === 1 ? '' : 's'} off ${sb.ballsLeft} balls`
        : sb.current.complete
          ? 'Innings break'
          : `CRR ${sb.crr.toFixed(2)}`;
  return (
    <View style={{ backgroundColor: colors.dark, paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {match.status === 'live' ? <LiveBadge /> : null}
        <Text variant="small" color={colors.onDarkMuted} numberOfLines={1} style={{ flex: 1 }}>
          {[match.format, match.competition, match.venue].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {row(match.batting_first)}
      {row(match.batting_first === 'a' ? 'b' : 'a')}
      <View style={{ backgroundColor: colors.dark2, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text variant="bodyStrong" color={colors.brand} style={{ fontSize: 14 }}>
          {status}
        </Text>
      </View>
    </View>
  );
}

export function InningsCard({ match, inn, strikerId }: { match: Match; inn: InningsSummary; strikerId?: string | null }) {
  const head = (cols: string[]) => (
    <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
      {cols.map((c, i) => (
        <Text key={c} variant="caption" color={colors.inkMuted} style={i === 0 ? { flex: 1 } : { width: i === cols.length - 1 ? 52 : 38, textAlign: 'right' }}>
          {c}
        </Text>
      ))}
    </View>
  );
  const cell = (v: string, i: number, last: boolean, strong?: boolean) => (
    <Text key={i} numeric variant={strong ? 'smallStrong' : 'small'} style={{ width: last ? 52 : 38, textAlign: 'right' }}>
      {v}
    </Text>
  );
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 2 }}>
      <Text variant="h3" style={{ fontSize: 16, marginBottom: 4 }}>
        {teamName(match, inn.battingTeam)} · {inn.runs}/{inn.wickets}{' '}
        <Text variant="small" color={colors.inkMuted}>
          ({oversText(inn.legalBalls)} ov, extras {inn.extras})
        </Text>
      </Text>
      {head(['Batter', 'R', 'B', '4s', 'SR'])}
      {inn.batters.map((b) => (
        <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ flex: 1 }}>
            <Text variant={(b.id === strikerId && !b.out) ? 'smallStrong' : 'small'}>
              {b.name}
              {(b.id === strikerId && !b.out) ? <Text color={colors.brand}> ●</Text> : null}
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              {b.out ? b.dismissal : 'not out'}
            </Text>
          </View>
          {[String(b.runs), String(b.balls), String(b.fours), b.balls ? ((b.runs * 100) / b.balls).toFixed(1) : '0.0'].map((v, i) => cell(v, i, i === 3, i === 0))}
        </View>
      ))}
      <View style={{ height: 8 }} />
      {head(['Bowler', 'O', 'R', 'W', 'Econ'])}
      {inn.bowlers.map((b) => (
        <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <Text variant="small" style={{ flex: 1 }}>
            {b.name}
          </Text>
          {[oversText(b.legalBalls), String(b.runs), String(b.wickets), b.legalBalls ? ((b.runs * 6) / b.legalBalls).toFixed(2) : '0.00'].map((v, i) => cell(v, i, i === 3, i === 2))}
        </View>
      ))}
    </View>
  );
}
