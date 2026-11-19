import { router } from 'expo-router';
import { Bookmark, Briefcase, ChevronRight, ListChecks, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { OpportunityCard } from '@/components/OpportunityCard';
import { Chip, EmptyState, ErrorView, IconButton, Loading, Text, TopBar } from '@/components/ui';
import { useMyApplications, useOpportunities, useSavedOpportunityIds } from '@/lib/api/opportunities';
import { useMe } from '@/lib/auth';
import { ageFrom } from '@/lib/format';
import type { OpportunityType, OpportunityWithOrg, ProfileWithOrg } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

type Filter = OpportunityType | 'all' | 'saved';

/** Simple relevance rule: trials in your city or age group, jobs for non-athletes. */
function matchesProfile(o: OpportunityWithOrg, me: ProfileWithOrg) {
  if (me.role !== 'athlete' || o.type !== 'trial') return false;
  const age = ageFrom(me.date_of_birth);
  const ageLimit = Number(o.age_group?.match(/\d+/)?.[0] ?? 0);
  const ageOk = !ageLimit || (age !== null && age < ageLimit);
  const cityOk = !!me.city && !!o.city && o.city.toLowerCase() === me.city.toLowerCase();
  return ageOk && (cityOk || /bowl/i.test(o.title) === /bowl/i.test(me.playing_role ?? ''));
}

export default function Opportunities() {
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('all');
  const [text, setText] = useState('');
  const list = useOpportunities(filter === 'saved' ? 'all' : filter, text);
  const apps = useMyApplications();
  const { data: saved } = useSavedOpportunityIds();
  const appliedStatus = useMemo(() => new Map((apps.data ?? []).map((a) => [a.opportunity_id, a.status])), [apps.data]);

  const data = useMemo(() => {
    let rows = list.data ?? [];
    if (filter === 'saved') rows = rows.filter((o) => saved?.has(o.id));
    return [...rows].sort((a, b) => Number(matchesProfile(b, me)) - Number(matchesProfile(a, me)));
  }, [list.data, filter, saved, me]);

  const shortlisted = apps.data?.filter((a) => a.status === 'shortlisted').length ?? 0;
  const inReview = apps.data?.filter((a) => a.status === 'submitted').length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Opportunities" large right={<IconButton icon={Bookmark} label="Saved opportunities" tone="onDark" onPress={() => setFilter(filter === 'saved' ? 'all' : 'saved')} />} />
      <View style={{ paddingTop: 14, gap: 12 }}>
        <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search trials, jobs, tournaments"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Search opportunities"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(
            [
              ['all', 'All'],
              ['trial', 'Trials'],
              ['job', 'Jobs'],
              ['tournament', 'Tournaments'],
              ['saved', 'Saved'],
            ] as [Filter, string][]
          ).map(([v, l]) => (
            <Chip key={v} label={l} selected={filter === v} onPress={() => setFilter(v)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={data}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.accent} />}
        ListHeaderComponent={
          apps.data?.length ? (
            <Pressable
              onPress={() => router.push('/applications')}
              accessibilityRole="link"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? colors.dark : colors.dark2, borderRadius: radius.lg, padding: 14 })}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
                <ListChecks size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color={colors.onDark}>
                  My applications
                </Text>
                <Text variant="small" color={colors.onDarkMuted}>
                  {[shortlisted ? `${shortlisted} shortlisted` : null, inReview ? `${inReview} in review` : null].filter(Boolean).join(' · ') || `${apps.data.length} sent`}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.onDark} />
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => <OpportunityCard o={item} matches={matchesProfile(item, me)} applied={appliedStatus.get(item.id)} />}
        ListEmptyComponent={
          list.isLoading ? (
            <Loading />
          ) : list.error ? (
            <ErrorView message={list.error.message} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState
              icon={Briefcase}
              title={filter === 'saved' ? 'Nothing saved yet' : 'No open opportunities'}
              body={filter === 'saved' ? 'Tap the bookmark on any opportunity to keep it here.' : 'Try another filter or check back soon.'}
            />
          )
        }
      />
    </View>
  );
}
