import { router } from 'expo-router';
import { Bell, ChevronRight, Plus, Radio, ShieldCheck, Users } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, IconButton, Loading, SectionHeader, Stat, Tag, Text, TopBar } from '@/components/ui';
import { useUnreadNotifications } from '@/lib/api/notifications';
import { useOrgOpportunities } from '@/lib/api/opportunities';
import { usePendingVerifications, useRoster } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { deadlineText, opportunityLabels, orgKindLabels } from '@/lib/format';
import { colors, radius } from '@/theme';
import { go } from '@/lib/nav';

export default function Manage() {
  const me = useMe();
  const orgId = me.org_id ?? undefined;
  const opps = useOrgOpportunities(orgId);
  const roster = useRoster(orgId);
  const pending = usePendingVerifications(orgId);
  const unread = useUnreadNotifications();

  const all = opps.data ?? [];
  const open = all.filter((o) => o.status === 'open');
  const newApplicants = all.reduce((s, o) => s + o.applications.filter((a) => a.status === 'submitted').length, 0);
  const isAcademy = me.organization?.kind !== 'association';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        fillLeft
        left={
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10 }}>
            <Avatar name={me.organization?.name} size={40} square />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.onDarkMuted}>
                Manage · {me.organization ? orgKindLabels[me.organization.kind] : 'Organization'}
              </Text>
              <Text variant="title" color={colors.onDark} numberOfLines={1}>
                {me.organization?.name ?? 'Your organization'}
              </Text>
            </View>
          </View>
        }
        right={<IconButton icon={Bell} label="Notifications" tone="onDark" badge={unread} onPress={() => router.push('/notifications')} />}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={opps.isRefetching}
            onRefresh={() => {
              opps.refetch();
              roster.refetch();
              pending.refetch();
            }}
            tintColor={colors.accent}
          />
        }>
        <Button label="Post a trial, job or tournament" icon={Plus} onPress={() => router.push('/opportunity/new')} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { v: open.length, l: 'Open listings' },
            { v: newApplicants, l: 'New applicants', hi: true },
            { v: roster.data?.length ?? 0, l: isAcademy ? 'Roster' : 'Members' },
          ].map((k) => (
            <View key={k.l} style={{ flex: 1, backgroundColor: colors.dark, borderRadius: radius.lg, paddingHorizontal: 4 }}>
              <Stat dark value={String(k.v)} label={k.l} highlight={k.hi} />
            </View>
          ))}
        </View>

        {pending.data?.length ? (
          <Pressable
            onPress={() => router.push('/verifications')}
            accessibilityRole="link"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: 14, opacity: pressed ? 0.85 : 1 })}>
            <ShieldCheck size={22} color={colors.warningInk} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.warningInk} style={{ fontSize: 14 }}>
                {pending.data.length} stat {pending.data.length === 1 ? 'entry needs' : 'entries need'} your confirmation
              </Text>
              <Text variant="small" color={colors.warningInk}>
                Verify your players’ match stats
              </Text>
            </View>
            <Text variant="smallStrong" color={colors.warningInk} style={{ fontSize: 14 }}>
              Review
            </Text>
          </Pressable>
        ) : null}

        <SectionHeader title="Your listings" />
        {opps.isLoading ? <Loading /> : null}
        {all.map((o) => {
          const counts = { submitted: 0, shortlisted: 0, declined: 0 };
          o.applications.forEach((a) => counts[a.status]++);
          const dl = deadlineText(o.deadline);
          return (
            <Card key={o.id} onPress={() => go(`/applicants/${o.id}`)} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Tag label={opportunityLabels[o.type]} tone={o.type === 'trial' ? 'accent' : o.type === 'job' ? 'neutral' : 'warning'} />
                {o.status === 'closed' ? <Tag label="Closed" /> : dl ? <Text variant="caption" color={dl.urgent ? colors.warning : colors.inkMuted}>{dl.text}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="h3" style={{ flex: 1, fontSize: 16 }}>
                  {o.title}
                </Text>
                <ChevronRight size={18} color={colors.inkMuted} />
              </View>
              <Text variant="small" color={colors.inkSecondary}>
                <Text variant="smallStrong" color={counts.submitted ? colors.accent : colors.ink}>
                  {counts.submitted} new
                </Text>
                {`  ·  ${counts.shortlisted} shortlisted  ·  ${counts.declined} declined`}
              </Text>
            </Card>
          );
        })}
        {!opps.isLoading && !all.length ? (
          <EmptyState icon={Users} title="No listings yet" body="Post a trial or job and applicants show up here, ready to shortlist." />
        ) : null}

        <SectionHeader title="Matches" />
        <Card onPress={() => router.push('/match/new')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Score a match</Text>
            <Text variant="small" color={colors.inkMuted}>
              Players’ stats are verified automatically
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkMuted} />
        </Card>

        {roster.data?.length ? (
          <>
            <SectionHeader title={isAcademy ? 'Roster' : 'Members'} />
            <Card padded={false}>
              {roster.data.slice(0, 8).map((a, i, arr) => (
                <Pressable
                  key={a.id}
                  onPress={() => go(`/profile/${a.id}`)}
                  accessibilityRole="link"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: colors.divider, backgroundColor: pressed ? colors.surfaceMuted : undefined })}>
                  <Avatar name={a.full_name} url={a.avatar_url} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                      {a.full_name}
                    </Text>
                    <Text variant="caption" color={colors.inkMuted}>
                      {a.playing_role ?? 'Athlete'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.inkMuted} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
