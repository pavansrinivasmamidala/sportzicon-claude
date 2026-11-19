import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, FileText, Image as ImageIcon, Newspaper, Video } from 'lucide-react-native';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { LiveMatchCard } from '@/components/LiveMatchCard';
import { PostCard } from '@/components/PostCard';
import { Avatar, Card, EmptyState, ErrorView, IconButton, Loading, Text, TopBar } from '@/components/ui';
import { useFeed } from '@/lib/api/feed';
import { useLiveMatchCards } from '@/lib/api/matches';
import { useUnreadNotifications } from '@/lib/api/notifications';
import { useMe } from '@/lib/auth';
import { colors, fonts } from '@/theme';

function Composer() {
  const me = useMe();
  const open = (kind?: string) => router.push(kind ? { pathname: '/post/new', params: { kind } } : '/post/new');
  return (
    <Card style={{ marginHorizontal: 16, gap: 10, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={me.full_name} url={me.avatar_url} size={40} />
        <Pressable onPress={() => open()} style={styles.composerInput} accessibilityRole="button" accessibilityLabel="Create a post">
          <Text color={colors.inkMuted}>Share a match update…</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[
          { kind: 'video', label: 'Video', icon: Video },
          { kind: 'image', label: 'Photo', icon: ImageIcon },
          { kind: 'scorecard', label: 'Scorecard', icon: FileText },
        ].map(({ kind, label, icon: Icon }) => (
          <Pressable key={kind} onPress={() => open(kind)} style={({ pressed }) => [styles.quick, pressed && { backgroundColor: colors.surfaceMuted }]} accessibilityRole="button" accessibilityLabel={`Post a ${label.toLowerCase()}`}>
            <Icon size={18} color={colors.accent} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.inkSecondary }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

function LiveStrip() {
  const { data } = useLiveMatchCards();
  if (!data?.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.sectionRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live }} />
          <Text variant="h3">Live now</Text>
        </View>
        <Pressable onPress={() => router.push('/live')} hitSlop={10} accessibilityRole="link">
          <Text variant="smallStrong" color={colors.accent} style={{ fontSize: 14 }}>
            See all
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} decelerationRate="fast" snapToInterval={296}>
        {data.map((b) => (
          <LiveMatchCard key={b.match.id} bundle={b} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function Feed() {
  const feed = useFeed();
  const live = useLiveMatchCards();
  const unread = useUnreadNotifications();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        left={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 }} accessibilityRole="header" accessibilityLabel="Sportzicon">
            <Image source={require('@/assets/brand/logo-flame.png')} style={{ width: 28, height: 30 }} contentFit="contain" />
            <Image source={require('@/assets/brand/logo-wordmark-light.png')} style={{ width: 110, height: 18 }} contentFit="contain" />
          </View>
        }
        right={<IconButton icon={Bell} label="Notifications" tone="onDark" badge={unread} onPress={() => router.push('/notifications')} />}
      />
      <FlatList
        data={feed.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <PostCard post={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingTop: 14, paddingBottom: 12 }}>
            <LiveStrip />
            <Composer />
          </View>
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <Loading />
          ) : feed.error ? (
            <ErrorView message={feed.error.message} onRetry={() => feed.refetch()} />
          ) : (
            <EmptyState icon={Newspaper} title="Your feed is quiet" body="Share your first match update, or find athletes and academies to follow in Search." actionLabel="Find people" onAction={() => router.push('/search')} />
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => {
              feed.refetch();
              live.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  composerInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  quick: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
});
