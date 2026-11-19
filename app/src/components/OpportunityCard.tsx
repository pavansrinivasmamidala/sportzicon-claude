import { Calendar, MapPin } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar, Card, Tag, Text } from '@/components/ui';
import { deadlineText, money, opportunityLabels, shortDate } from '@/lib/format';
import type { ApplicationStatus, OpportunityWithOrg } from '@/lib/types';
import { colors, fonts } from '@/theme';
import { go } from '@/lib/nav';

const typeTone = { trial: 'accent', job: 'neutral', tournament: 'warning' } as const;

const appliedLabel: Record<ApplicationStatus, string> = { submitted: 'Applied', shortlisted: 'Shortlisted', declined: 'Not selected' };

export function OpportunityCard({ o, matches, applied, manage }: { o: OpportunityWithOrg; matches?: boolean; applied?: ApplicationStatus; manage?: boolean }) {
  const dl = deadlineText(o.deadline);
  const price = o.type === 'job' ? o.compensation : money(o.fee_inr);
  return (
    <Card onPress={() => go(`/opportunity/${o.id}`)} accessibilityLabel={`${opportunityLabels[o.type]}: ${o.title}, ${o.organization.name}`} style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Avatar name={o.organization.name} size={44} square />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Tag label={opportunityLabels[o.type]} tone={typeTone[o.type]} />
            {matches ? <Tag label="Matches your profile" tone="success" /> : null}
          </View>
          <Text variant="h3" style={{ fontSize: 16 }}>
            {o.title}
          </Text>
          <Text variant="small" color={colors.inkMuted}>
            {o.organization.name}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 }}>
        {o.city ? <Meta icon={<MapPin size={15} color={colors.inkSecondary} />} text={o.city} /> : null}
        {o.starts_at ? <Meta icon={<Calendar size={15} color={colors.inkSecondary} />} text={shortDate(o.starts_at)} /> : null}
        {o.age_group ? <Meta text={o.age_group} /> : null}
        {price ? <Meta text={o.type === 'tournament' ? `Entry ${price}` : price} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
        <Text variant="smallStrong" color={dl?.urgent ? colors.warning : colors.inkMuted} style={{ fontFamily: dl?.urgent ? fonts.bodySemi : fonts.body }}>
          {dl?.text ?? 'Open'}
        </Text>
        <View
          style={{
            height: 36,
            paddingHorizontal: 16,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: manage ? colors.dark : applied === 'declined' ? colors.surfaceMuted : applied ? colors.successSoft : colors.accent,
          }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: manage ? colors.white : applied === 'declined' ? colors.inkSecondary : applied ? colors.successInk : colors.white }}>{manage ? 'Manage' : applied ? appliedLabel[applied] : 'View & apply'}</Text>
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {icon}
      <Text variant="small" color={colors.inkSecondary}>
        {text}
      </Text>
    </View>
  );
}
