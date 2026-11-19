import { router, useLocalSearchParams } from 'expo-router';
import { EllipsisVertical, Plus, Send } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { performanceHeadline } from '@/components/PerformanceCard';
import { Avatar, IconButton, Loading, Sheet, Text, TopBar, VerifiedBadge } from '@/components/ui';
import { useClearConversation, useConversationOther, useMessages, useSendMessage } from '@/lib/api/messages';
import { usePerformances } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { clockTime, dayGroup, roleLabels, shortDate } from '@/lib/format';
import type { Message, MessageAttachment } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { go } from '@/lib/nav';
import { chooseAction, confirm } from '@/lib/dialog';

const QUICK_REPLIES: Record<string, string[]> = {
  athlete: ['Thank you!', 'I’m interested in the trial', 'When should I report?'],
  default: ['Thanks for reaching out', 'Can you share your latest scorecard?', 'Are you available for a trial?'],
};

export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const other = useConversationOther(id);
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const clear = useClearConversation();
  const perfs = usePerformances(me.role === 'athlete' ? me.id : undefined);
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const list = useRef<FlatList<Message>>(null);

  const o = other.data;
  const data = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);

  const submit = (body: string, attachment?: MessageAttachment) => {
    if (!body.trim() && !attachment) return;
    send.mutate({ body: body.trim(), attachment });
    setText('');
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const menu = () =>
    chooseAction({
      title: 'Conversation',
      actions: [
        { label: 'View profile', onPress: () => o && go(`/profile/${o.id}`) },
        {
          label: 'Remove conversation',
          destructive: true,
          onPress: async () => {
            const yes = await confirm({
              title: 'Remove this conversation?',
              message: 'It will disappear from your inbox. The other person keeps their copy.',
              confirmLabel: 'Remove',
              destructive: true,
            });
            if (!yes) return;
            await clear.mutateAsync(id);
            router.back();
          },
        },
      ],
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        back
        fillLeft
        left={
          o ? (
            <Pressable onPress={() => go(`/profile/${o.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }} accessibilityRole="link">
              <Avatar name={o.full_name} url={o.avatar_url} size={38} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyStrong" color={colors.onDark} numberOfLines={1}>
                  {o.full_name}
                </Text>
                <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>
                  {o.headline || o.playing_role || roleLabels[o.role]}
                </Text>
              </View>
            </Pressable>
          ) : null
        }
        right={<IconButton icon={EllipsisVertical} label="Conversation options" tone="onDark" onPress={menu} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {messages.isLoading ? (
          <Loading />
        ) : (
          <FlatList
            ref={list}
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 6 }}
            keyboardDismissMode="interactive"
            renderItem={({ item, index }) => {
              const mine = item.sender_id === me.id;
              const older = data[index + 1];
              const showDay = !older || dayGroup(older.created_at) !== dayGroup(item.created_at) || shortDate(older.created_at) !== shortDate(item.created_at);
              return (
                <View style={{ gap: 6 }}>
                  {showDay ? (
                    <Text variant="caption" color={colors.inkSecondary} center style={{ alignSelf: 'center', backgroundColor: colors.surfaceSunken, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', marginVertical: 6, fontFamily: fonts.bodySemi }}>
                      {dayGroup(item.created_at) === 'Today' ? 'Today' : shortDate(item.created_at)}
                    </Text>
                  ) : null}
                  <Bubble m={item} mine={mine} />
                </View>
              );
            }}
            ListEmptyComponent={
              <Text color={colors.inkMuted} center style={{ marginTop: 40, transform: [{ scaleY: -1 }] }}>
                Say hello to {o?.full_name ?? 'them'}.
              </Text>
            }
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }} keyboardShouldPersistTaps="always">
          {(QUICK_REPLIES[me.role] ?? QUICK_REPLIES.default).map((q) => (
            <Pressable key={q} onPress={() => submit(q)} accessibilityRole="button" style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: pressed ? colors.surfaceMuted : colors.surface, justifyContent: 'center' })}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: '#334155' }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 8, paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <IconButton icon={Plus} label="Share profile or scorecard" color={colors.inkSecondary} onPress={() => setAttachOpen(true)} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Message"
            multiline
            style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16, fontFamily: fonts.body, color: colors.ink, backgroundColor: colors.canvas }}
          />
          <Pressable
            onPress={() => submit(text)}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.accent : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Send size={18} color={text.trim() ? colors.white : colors.inkFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={attachOpen} onClose={() => setAttachOpen(false)} title="Share">
        <Pressable
          onPress={() => {
            setAttachOpen(false);
            submit('', { type: 'profile', id: me.id, title: me.full_name, subtitle: me.playing_role ?? me.headline ?? roleLabels[me.role] });
          }}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
          <Avatar name={me.full_name} url={me.avatar_url} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">My profile</Text>
            <Text variant="small" color={colors.inkMuted}>
              Your passport with verified stats
            </Text>
          </View>
        </Pressable>
        {(perfs.data ?? []).slice(0, 6).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              setAttachOpen(false);
              submit('', { type: 'performance', id: p.id, title: `vs ${p.opponent} · ${p.format}`, subtitle: shortDate(p.played_on), value: performanceHeadline(p) });
            }}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Scorecard vs {p.opponent}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {shortDate(p.played_on)} · {p.verified ? 'Verified' : 'Self-reported'}
              </Text>
            </View>
            <Text variant="stat" style={{ fontSize: 16 }}>
              {performanceHeadline(p)}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const pending = m.id.startsWith('temp-');
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 3, opacity: pending ? 0.6 : 1 }}>
      {m.body ? (
        <View
          style={{
            maxWidth: '80%',
            backgroundColor: mine ? colors.accent : colors.surface,
            borderWidth: mine ? 0 : 1,
            borderColor: colors.border,
            borderRadius: 18,
            borderBottomRightRadius: mine ? 6 : 18,
            borderBottomLeftRadius: mine ? 18 : 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}>
          <Text color={mine ? colors.white : colors.ink}>{m.body}</Text>
        </View>
      ) : null}
      {m.attachment ? (
        <Pressable
          onPress={() => (m.attachment!.type === 'performance' ? undefined : go(`/profile/${m.attachment!.id}`))}
          accessibilityRole="button"
          style={{ width: 250, backgroundColor: colors.dark, borderRadius: radius.xl, padding: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VerifiedBadge size={14} />
            <Text variant="smallStrong" color="#93C5FD">
              {m.attachment.type === 'performance' ? 'Scorecard' : 'Sportzicon profile'}
            </Text>
          </View>
          <Text variant="bodyStrong" color={colors.onDark}>
            {m.attachment.title}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text variant="small" color={colors.onDarkMuted}>
              {m.attachment.subtitle}
            </Text>
            {m.attachment.value ? (
              <Text variant="stat" color={colors.brand} style={{ fontSize: 24, lineHeight: 28 }}>
                {m.attachment.value}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}
      <Text variant="caption" color={colors.inkMuted}>
        {pending ? 'Sending…' : clockTime(m.created_at)}
      </Text>
    </View>
  );
}
