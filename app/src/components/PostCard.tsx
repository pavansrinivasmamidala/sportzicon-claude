import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bookmark, Ellipsis, MessageCircle, Send, ThumbsUp } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { ScorecardCard } from '@/components/PerformanceCard';
import { Avatar, Card, IconButton, Text, VerifiedBadge } from '@/components/ui';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useDeletePost, useToggleEndorse, useToggleSave } from '@/lib/api/feed';
import { useAuth } from '@/lib/auth';
import { roleLabels, timeAgo } from '@/lib/format';
import type { FeedPost } from '@/lib/types';
import { colors, fonts } from '@/theme';
import { go } from '@/lib/nav';
import { chooseAction, confirm } from '@/lib/dialog';

function Action({ icon: Icon, label, active, onPress, a11y }: { icon: typeof ThumbsUp; label?: string; active?: boolean; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.action, !label && { width: 44, paddingHorizontal: 0 }, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <Icon size={18} color={active ? colors.accent : colors.inkSecondary} strokeWidth={active ? 2.2 : 1.8} fill={active && Icon === Bookmark ? colors.accent : 'none'} />
      {label ? <Text style={{ fontFamily: active ? fonts.bodySemi : fonts.bodyMedium, fontSize: 14, color: active ? colors.accent : colors.inkSecondary }}>{label}</Text> : null}
    </Pressable>
  );
}

export const PostCard = memo(function PostCard({ post, standalone }: { post: FeedPost; standalone?: boolean }) {
  const { session } = useAuth();
  const endorse = useToggleEndorse();
  const save = useToggleSave();
  const del = useDeletePost();
  const mine = post.author_id === session?.user.id;
  const a = post.author;
  const sub = [a.headline || a.playing_role || roleLabels[a.role], a.organization?.name].filter(Boolean).join(' · ');

  const share = () =>
    Share.share({ message: `${a.full_name} on Sportzicon: ${post.body.slice(0, 140)}` }).catch(() => undefined);

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this post?', message: 'This can’t be undone.', confirmLabel: 'Delete', destructive: true }))) return;
    del.mutate(post.id);
    if (standalone) router.back();
  };

  const options = () =>
    chooseAction({
      title: 'Post',
      actions: mine
        ? [
            { label: 'Share', onPress: share },
            { label: 'Delete post', destructive: true, onPress: remove },
          ]
        : [
            { label: 'View profile', onPress: () => go(`/profile/${a.id}`) },
            { label: 'Share', onPress: share },
          ],
    });

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <View style={styles.header}>
        <Pressable onPress={() => go(`/profile/${a.id}`)} style={styles.author} accessibilityRole="link" accessibilityLabel={`${a.full_name}, ${sub}`}>
          <Avatar name={a.full_name} url={a.avatar_url} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {a.full_name}
              </Text>
              {a.organization ? <VerifiedBadge /> : null}
            </View>
            <Text variant="small" color={colors.inkMuted} numberOfLines={1}>
              {sub ? `${sub} · ` : ''}
              {timeAgo(post.created_at)}
            </Text>
          </View>
        </Pressable>
        <IconButton icon={Ellipsis} label="Post options" color={colors.inkSecondary} size={20} onPress={options} />
      </View>

      <Pressable onPress={standalone ? undefined : () => go(`/post/${post.id}`)} disabled={standalone} accessibilityRole={standalone ? undefined : 'link'}>
        {post.body ? (
          <Text style={{ paddingHorizontal: 14, paddingBottom: 12 }} numberOfLines={standalone ? undefined : 6}>
            {post.body}
          </Text>
        ) : null}
        {post.performance ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            <ScorecardCard p={post.performance} />
          </View>
        ) : null}
      </Pressable>
      {post.media_url && post.kind === 'video' ? <VideoPlayer uri={post.media_url} height={220} /> : null}
      {post.media_url && post.kind === 'image' ? (
        <Image source={{ uri: post.media_url }} style={{ height: 260, backgroundColor: colors.surfaceMuted }} contentFit="cover" accessibilityLabel="Post photo" />
      ) : null}

      {post.endorsements || post.comments ? (
        <Text variant="small" color={colors.inkMuted} style={{ paddingHorizontal: 14, paddingTop: 10 }}>
          {post.endorsements ? `${post.endorsements} endorsement${post.endorsements === 1 ? '' : 's'}` : ''}
          {post.endorsements && post.comments ? ' · ' : ''}
          {post.comments ? `${post.comments} comment${post.comments === 1 ? '' : 's'}` : ''}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Action icon={ThumbsUp} label="Endorse" active={post.endorsed_by_me} onPress={() => endorse.mutate(post)} a11y={post.endorsed_by_me ? 'Remove endorsement' : 'Endorse'} />
        <Action icon={MessageCircle} label="Comment" onPress={() => go(`/post/${post.id}`)} a11y="Comment" />
        <Action icon={Send} label="Share" onPress={share} a11y="Share" />
        <Action icon={Bookmark} active={post.saved_by_me} onPress={() => save.mutate(post)} a11y={post.saved_by_me ? 'Unsave post' : 'Save post'} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 2, paddingTop: 10, paddingBottom: 10 },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  // Natural widths spaced evenly, so the row never overflows on narrow Android phones.
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 4 },
  action: { height: 42, paddingHorizontal: 10, flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 },
});
