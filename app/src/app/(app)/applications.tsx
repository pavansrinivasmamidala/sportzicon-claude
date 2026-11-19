import { router } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { Avatar, Card, EmptyState, Loading, Tag, Text, TopBar } from '@/components/ui';
import { useMyApplications } from '@/lib/api/opportunities';
import { opportunityLabels, shortDate } from '@/lib/format';
import { colors } from '@/theme';
import { go } from '@/lib/nav';

const statusTag = {
  submitted: { label: 'In review', tone: 'neutral' },
  shortlisted: { label: 'Shortlisted', tone: 'success' },
  declined: { label: 'Not selected', tone: 'neutral' },
} as const;

export default function MyApplications() {
  const apps = useMyApplications();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="My applications" back />
      <FlatList
        data={apps.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Card onPress={() => go(`/opportunity/${item.opportunity_id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={item.opportunity.organization.name} size={44} square />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.opportunity.title}
              </Text>
              <Text variant="small" color={colors.inkMuted} numberOfLines={1}>
                {opportunityLabels[item.opportunity.type]} · {item.opportunity.organization.name} · Applied {shortDate(item.created_at)}
              </Text>
            </View>
            <Tag {...statusTag[item.status]} />
          </Card>
        )}
        ListEmptyComponent={
          apps.isLoading ? (
            <Loading />
          ) : (
            <EmptyState icon={ListChecks} title="No applications yet" body="Apply to trials and jobs from the Opportunities tab." actionLabel="Browse opportunities" onAction={() => router.push('/opportunities')} />
          )
        }
      />
    </View>
  );
}
