import { go } from '@/lib/nav';
import { View } from 'react-native';

import { Card, LiveBadge, Tag, Text } from '@/components/ui';
import { dateTime } from '@/lib/format';
import type { Match } from '@/lib/types';
import { colors } from '@/theme';

export function MatchRow({ m, scorerView }: { m: Match; scorerView?: boolean }) {
  return (
    <Card onPress={() => go(scorerView && m.status !== 'completed' ? `/match/${m.id}/score` : `/match/${m.id}`)} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {m.status === 'live' ? <LiveBadge /> : <Tag label={m.status === 'scheduled' ? 'Not started' : 'Completed'} tone={m.status === 'scheduled' ? 'warning' : 'neutral'} />}
        <Text variant="caption" color={colors.inkMuted} style={{ flex: 1 }} numberOfLines={1}>
          {m.format}
          {m.competition ? ` · ${m.competition}` : ''}
        </Text>
      </View>
      <Text variant="h3">
        {m.team_a} vs {m.team_b}
      </Text>
      <Text variant="small" color={m.result ? colors.accent : colors.inkMuted}>
        {m.result ?? [m.venue, dateTime(m.starts_at)].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}
