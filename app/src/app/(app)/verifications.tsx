import { ShieldCheck } from 'lucide-react-native';
import { FlatList, Pressable, View } from 'react-native';

import { performanceDetail, performanceHeadline } from '@/components/PerformanceCard';
import { Avatar, Button, Card, EmptyState, Loading, Text, TopBar } from '@/components/ui';
import { usePendingVerifications, useReviewPerformance } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { longDate } from '@/lib/format';
import { colors } from '@/theme';
import { go } from '@/lib/nav';
import { confirm } from '@/lib/dialog';

export default function Verifications() {
  const me = useMe();
  const list = usePendingVerifications(me.org_id ?? undefined);
  const review = useReviewPerformance(me.org_id ?? undefined);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Verify stats" back />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          list.data?.length ? (
            <Text variant="small" color={colors.inkSecondary}>
              Confirm only numbers you can check against an official scorebook. Verified stats get a blue badge on the athlete’s passport.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 12 }}>
            <Pressable onPress={() => go(`/profile/${item.athlete.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="link">
              <Avatar name={item.athlete.full_name} url={item.athlete.avatar_url} size={42} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{item.athlete.full_name}</Text>
                <Text variant="small" color={colors.inkMuted}>
                  vs {item.opponent} · {item.format} · {longDate(item.played_on)}
                </Text>
              </View>
              <Text variant="stat">{performanceHeadline(item)}</Text>
            </Pressable>
            <Text variant="small" color={colors.inkSecondary}>
              {performanceDetail(item)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label="Can’t verify"
                variant="secondary"
                size="sm"
                style={{ flex: 1, height: 42 }}
                onPress={async () => {
                  const yes = await confirm({
                    title: 'Reject these stats?',
                    message: `${item.athlete.full_name} will be asked to check the numbers and resubmit.`,
                    confirmLabel: 'Reject',
                    destructive: true,
                  });
                  if (yes) review.mutate({ id: item.id, approve: false });
                }}
              />
              <Button label="Verify" size="sm" style={{ flex: 1, height: 42 }} onPress={() => review.mutate({ id: item.id, approve: true })} />
            </View>
          </Card>
        )}
        ListEmptyComponent={list.isLoading ? <Loading /> : <EmptyState icon={ShieldCheck} title="All caught up" body="When your athletes add match stats, they appear here for you to confirm." />}
      />
    </View>
  );
}
