import { View } from 'react-native';

import { Text, VerifiedBadge } from '@/components/ui';
import { longDate } from '@/lib/format';
import type { Performance } from '@/lib/types';
import { colors } from '@/theme';

export function performanceHeadline(p: Performance) {
  const bowled = p.overs !== null && p.overs !== undefined;
  const batted = (p.balls_faced ?? 0) > 0 || (p.runs ?? 0) > 0;
  if (bowled && (p.wickets ?? 0) >= 1) return `${p.wickets}/${p.runs_conceded ?? 0}`;
  if (batted) return `${p.runs ?? 0}${p.not_out ? '*' : ''}${p.balls_faced ? ` (${p.balls_faced})` : ''}`;
  if (bowled) return `${p.wickets ?? 0}/${p.runs_conceded ?? 0}`;
  return '—';
}

export function performanceDetail(p: Performance) {
  const parts: string[] = [];
  if ((p.balls_faced ?? 0) > 0 || (p.runs ?? 0) > 0) parts.push(`${p.runs ?? 0}${p.not_out ? '*' : ''} runs`);
  if (p.overs !== null && p.overs !== undefined) parts.push(`${p.overs} ov · ${p.wickets ?? 0}/${p.runs_conceded ?? 0}`);
  return parts.join('  ·  ');
}

/** Dark "verified scorecard" card used in posts and chat. */
export function ScorecardCard({ p, compact }: { p: Performance; compact?: boolean }) {
  return (
    <View style={{ backgroundColor: colors.dark, borderRadius: 14, padding: compact ? 12 : 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {p.verified ? <VerifiedBadge size={14} /> : null}
        <Text variant="smallStrong" color={p.verified ? '#93C5FD' : colors.onDarkMuted}>
          {p.verified ? (p.source === 'live_scoring' ? 'Verified · official scorer' : 'Verified scorecard') : 'Self-reported · awaiting verification'}
        </Text>
      </View>
      <Text variant="bodyStrong" color={colors.onDark}>
        vs {p.opponent} · {p.format}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text variant="small" color={colors.onDarkMuted}>
          {performanceDetail(p)}
          {'\n'}
          {longDate(p.played_on)}
        </Text>
        <Text variant="stat" color={colors.brand} style={{ fontSize: 26, lineHeight: 30 }}>
          {performanceHeadline(p)}
        </Text>
      </View>
    </View>
  );
}

/** Row in a profile's match list. */
export function PerformanceRow({ p, last }: { p: Performance; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text variant="bodyStrong" style={{ fontSize: 14 }}>
            vs {p.opponent}
          </Text>
          {p.verified ? <VerifiedBadge size={14} /> : null}
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {p.format} · {longDate(p.played_on)}
          {!p.verified ? ' · Pending verification' : ''}
        </Text>
      </View>
      <Text variant="stat" style={{ fontSize: 16 }}>
        {performanceHeadline(p)}
      </Text>
    </View>
  );
}
