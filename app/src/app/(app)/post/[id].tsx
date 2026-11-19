import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/PostCard';
import { Avatar, ErrorView, Loading, Text, TopBar } from '@/components/ui';
import { useAddComment, useComments, usePost } from '@/lib/api/feed';
import { useMe } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { colors, fonts } from '@/theme';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const post = usePost(id);
  const comments = useComments(id);
  const add = useAddComment(id);
  const [text, setText] = useState('');

  const send = () => {
    const body = text.trim();
    if (!body) return;
    add.mutate(body);
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Post" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {post.isLoading ? (
          <Loading />
        ) : post.error || !post.data ? (
          <ErrorView message={post.error?.message ?? 'This post was removed.'} />
        ) : (
          <FlatList
            data={comments.data ?? []}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListHeaderComponent={
              <View style={{ gap: 14, marginBottom: 4 }}>
                <PostCard post={post.data} standalone />
                <Text variant="overline" color={colors.inkSecondary}>
                  Comments
                </Text>
              </View>
            }
            ListEmptyComponent={
              comments.isLoading ? <Loading /> : <Text color={colors.inkMuted}>No comments yet. Start the conversation.</Text>
            }
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Avatar name={item.author.full_name} url={item.author.avatar_url} size={34} />
                <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 2 }}>
                  <Text variant="smallStrong">
                    {item.author.full_name}
                    <Text variant="caption" color={colors.inkMuted}>{`  ${timeAgo(item.created_at)}`}</Text>
                  </Text>
                  <Text style={{ fontSize: 14 }}>{item.body}</Text>
                </View>
              </View>
            )}
          />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingBottom: insets.bottom + 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Avatar name={me.full_name} url={me.avatar_url} size={34} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Add a comment"
            onSubmitEditing={send}
            returnKeyType="send"
            style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 16, fontSize: 16, fontFamily: fonts.body, color: colors.ink, backgroundColor: colors.canvas }}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.accent : colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Send size={18} color={text.trim() ? colors.white : colors.inkFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
