import { router, type Href } from 'expo-router';
import { Bell, Bookmark, Briefcase, Check, MessageCircle, Radio, ShieldCheck, ThumbsUp, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';

import { Chip, EmptyState, Loading, Text, TopBar } from '@/components/ui';
import { useMarkRead, useNotifications } from '@/lib/api/notifications';
import { dayGroup, timeAgo } from '@/lib/format';
import type { AppNotification, NotificationKind } from '@/lib/types';
import { colors, fonts } from '@/theme';

const KIND: Record<NotificationKind, { icon: LucideIcon; bg: string; fg: string }> = {
  application: { icon: Check, bg: colors.successSoft, fg: colors.success },
  message: { icon: MessageCircle, bg: colors.dark, fg: colors.brand },
  verification: { icon: ShieldCheck, bg: colors.verifiedSoft, fg: '#1D4ED8' },
  endorsement: { icon: ThumbsUp, bg: colors.accentSoft, fg: colors.accent },
  match: { icon: Radio, bg: colors.liveSoft, fg: colors.live },
  opportunity: { icon: Briefcase, bg: colors.surfaceMuted, fg: '#334155' },
  shortlist: { icon: Bookmark, bg: colors.accentSoft, fg: colors.accent },
};

type Filter = 'all' | 'application' | 'message' | 'endorsement' | 'verification';

export default function Notifications() {
  const list = useNotifications();
  const markRead = useMarkRead();
  const [filter, setFilter] = useState<Filter>('all');
  // Opening this screen clears the bell badge; items that were new stay highlighted for this visit.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const markedOnOpen = useRef(false);
  useEffect(() => {
    if (markedOnOpen.current || !list.data) return;
    markedOnOpen.current = true;
    const ids = list.data.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time snapshot when the server data first arrives
    setFresh(new Set(ids));
    markRead.mutate(undefined);
  }, [list.data, markRead]);

  const sections = useMemo(() => {
    const rows = (list.data ?? []).filter((n) => filter === 'all' || n.kind === filter || (filter === 'application' && n.kind === 'shortlist'));
    const groups: Record<string, AppNotification[]> = {};
    rows.forEach((n) => (groups[dayGroup(n.created_at)] ??= []).push(n));
    return ['Today', 'This week', 'Earlier'].filter((g) => groups[g]).map((g) => ({ title: g, data: groups[g] }));
  }, [list.data, filter]);


  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        title="Notifications"
        back
        right={
          fresh.size ? (
            <Pressable onPress={() => setFresh(new Set())} style={{ height: 44, justifyContent: 'center', paddingHorizontal: 10 }} accessibilityRole="button">
              <Text variant="smallStrong" color={colors.brand} style={{ fontSize: 14 }}>
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 12, paddingHorizontal: 16 }}>
        {(
          [
            ['all', 'All'],
            ['application', 'Applications'],
            ['message', 'Messages'],
            ['endorsement', 'Endorsements'],
            ['verification', 'Verification'],
          ] as [Filter, string][]
        ).map(([v, l]) => (
          <Chip key={v} label={l} selected={filter === v} onPress={() => setFilter(v)} />
        ))}
      </ScrollView>
      {list.isLoading ? (
        <Loading />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="overline" color={colors.inkSecondary} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => {
            const k = KIND[item.kind];
            const Icon = k.icon;
            const isNew = !item.read_at || fresh.has(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (!item.read_at) markRead.mutate(item.id);
                  if (item.link) router.push(item.link as Href);
                }}
                accessibilityRole="link"
                accessibilityLabel={`${isNew ? 'New. ' : ''}${item.title}. ${item.body ?? ''}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? colors.surfaceMuted : isNew ? colors.accentTint : colors.surface,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                })}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: k.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={k.fg} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: isNew ? fonts.bodySemi : fonts.body }}>{item.title}</Text>
                  {item.body ? (
                    <Text variant="small" color={colors.inkSecondary} numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  <Text variant="caption" color={colors.inkMuted}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
                {isNew ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState icon={Bell} title="You’re all caught up" body="Application updates, messages and endorsements show up here." />}
        />
      )}
    </View>
  );
}
