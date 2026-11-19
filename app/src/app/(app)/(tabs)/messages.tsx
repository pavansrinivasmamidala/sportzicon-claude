import { MessageCircle, SquarePen } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

import { openChatWith } from '@/components/PersonCard';
import { Avatar, EmptyState, ErrorView, IconButton, Loading, Sheet, Text, TopBar } from '@/components/ui';
import { useConversations } from '@/lib/api/messages';
import { useSearchPeople } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { roleLabels, timeAgo } from '@/lib/format';
import { colors, fonts, radius } from '@/theme';
import { go } from '@/lib/nav';

export default function Messages() {
  const convos = useConversations();
  const [filter, setFilter] = useState('');
  const [compose, setCompose] = useState(false);
  const rows = (convos.data ?? []).filter((c) => !filter || c.other?.full_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Messages" large right={<IconButton icon={SquarePen} label="New message" tone="onDark" onPress={() => setCompose(true)} />} />
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={convos.isRefetching} onRefresh={() => void convos.refetch()} tintColor={colors.accent} />}
        ListHeaderComponent={
          convos.data?.length ? (
            <View style={{ padding: 16, paddingBottom: 8 }}>
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="Search conversations"
                placeholderTextColor={colors.inkFaint}
                accessibilityLabel="Search conversations"
                style={{ height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => go(`/chat/${item.id}`)}
            accessibilityRole="link"
            accessibilityLabel={`${item.other?.full_name ?? 'Conversation'}${item.unread ? ', unread' : ''}. ${item.last_message_preview ?? ''}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: pressed ? colors.surfaceMuted : item.unread ? colors.accentTint : colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            })}>
            <Avatar name={item.other?.full_name} url={item.other?.avatar_url} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {item.other?.full_name ?? 'Unknown'}
                </Text>
                <Text variant="caption" color={item.unread ? colors.accent : colors.inkMuted}>
                  {timeAgo(item.last_message_at)}
                </Text>
              </View>
              <Text variant="small" color={item.unread ? colors.ink : colors.inkMuted} numberOfLines={1} style={item.unread ? { fontFamily: fonts.bodySemi } : undefined}>
                {item.last_message_preview ?? 'Say hello'}
              </Text>
            </View>
            {item.unread ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          convos.isLoading ? (
            <Loading />
          ) : convos.error ? (
            <ErrorView message={convos.error.message} onRetry={() => convos.refetch()} />
          ) : (
            <EmptyState icon={MessageCircle} title="No conversations yet" body="Message athletes, scouts and academies from their profiles." actionLabel="Start a conversation" onAction={() => setCompose(true)} />
          )
        }
      />
      <NewMessageSheet visible={compose} onClose={() => setCompose(false)} />
    </View>
  );
}

function NewMessageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const me = useMe();
  const [text, setText] = useState('');
  const people = useSearchPeople({ text, role: 'all' });
  return (
    <Sheet visible={visible} onClose={onClose} title="New message">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Search people"
        placeholderTextColor={colors.inkFaint}
        autoFocus
        accessibilityLabel="Search people"
        style={{ height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
      />
      {people.isLoading ? <Loading /> : null}
      {(people.data ?? [])
        .filter((p) => p.id !== me.id)
        .slice(0, 20)
        .map((p) => (
          <Pressable
            key={p.id}
            onPress={async () => {
              onClose();
              await openChatWith(p.id);
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
            <Avatar name={p.full_name} url={p.avatar_url} size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{p.full_name}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {p.playing_role ?? p.headline ?? roleLabels[p.role]}
              </Text>
            </View>
          </Pressable>
        ))}
    </Sheet>
  );
}
