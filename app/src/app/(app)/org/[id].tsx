import { useLocalSearchParams } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { OpportunityCard } from '@/components/OpportunityCard';
import { openChatWith } from '@/components/PersonCard';
import { Avatar, Button, Stat, Tag, Text, TopBar } from '@/components/ui';
import { useOrgOpportunities } from '@/lib/api/opportunities';
import { useOrganization, useRoster } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { orgKindLabels } from '@/lib/format';
import { go } from '@/lib/nav';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/theme';
import { ScreenState } from '@/components/ScreenState';

export default function OrgPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const org = useOrganization(id);
  const roster = useRoster(id);
  const opps = useOrgOpportunities(id);
  const admin = useQuery({
    queryKey: ['org-admin', id],
    queryFn: async () => (await supabase.from('org_members').select('user_id').eq('org_id', id).limit(1).maybeSingle()).data?.user_id as string | undefined,
  });
  const [opening, setOpening] = useState(false);

  if (org.isLoading) return <ScreenState />;
  if (!org.data) return <ScreenState error={org.error?.message ?? 'Organization not found'} />;
  const o = org.data;
  const open = (opps.data ?? []).filter((x) => x.status === 'open');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title={orgKindLabels[o.kind]} back />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ backgroundColor: colors.dark, padding: 16, paddingTop: 4, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar name={o.name} url={o.logo_url} size={72} square />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="h1" color={colors.onDark} style={{ fontSize: 22, lineHeight: 28 }}>
                {o.name}
              </Text>
              <Text color={colors.onDarkMuted}>
                {orgKindLabels[o.kind]}
                {o.city ? ` · ${o.city}` : ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: colors.dark2, borderRadius: radius.lg }}>
            <Stat dark value={String(roster.data?.length ?? 0)} label="Athletes" />
            <Stat dark highlight value={String(open.length)} label="Open listings" />
          </View>
          {admin.data && admin.data !== me.id ? (
            <Button
              label="Message"
              icon={MessageCircle}
              size="md"
              loading={opening}
              onPress={async () => {
                setOpening(true);
                await openChatWith(admin.data!);
                setOpening(false);
              }}
            />
          ) : null}
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {o.about ? <Text>{o.about}</Text> : null}
          <Text variant="overline" color={colors.inkSecondary}>
            Open opportunities
          </Text>
          {open.length ? open.map((x) => <OpportunityCard key={x.id} o={x} manage={me.org_id === o.id} />) : <Text color={colors.inkMuted}>Nothing open right now.</Text>}
          {roster.data?.length ? (
            <>
              <Text variant="overline" color={colors.inkSecondary} style={{ marginTop: 8 }}>
                Athletes
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {roster.data.slice(0, 12).map((a) => (
                  <Pressable key={a.id} onPress={() => go(`/profile/${a.id}`)} accessibilityRole="link" accessibilityLabel={`${a.full_name}, view profile`}>
                    <Tag label={a.full_name} tone="neutral" />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
