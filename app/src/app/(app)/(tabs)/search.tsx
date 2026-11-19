import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PersonCard } from '@/components/PersonCard';
import { Avatar, Card, Chip, EmptyState, ErrorView, Loading, Text, UnderlineTabs } from '@/components/ui';
import { useSearchOrgs, useSearchPeople } from '@/lib/api/people';
import { orgKindLabels } from '@/lib/format';
import type { OrgKind, UserRole } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { go } from '@/lib/nav';

type Tab = 'athlete' | 'scout' | 'academy' | 'club' | 'association' | 'scorer';
const TABS: { value: Tab; label: string }[] = [
  { value: 'athlete', label: 'Athletes' },
  { value: 'scout', label: 'Scouts' },
  { value: 'academy', label: 'Academies' },
  { value: 'club', label: 'Clubs' },
  { value: 'association', label: 'Associations' },
  { value: 'scorer', label: 'Scorers' },
];
const orgTabs: Tab[] = ['academy', 'club', 'association'];

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Search() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('athlete');
  const [text, setText] = useState('');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const q = useDebounced(text);
  const isOrg = orgTabs.includes(tab);

  const people = useSearchPeople({ text: q, role: (isOrg ? 'athlete' : tab) as UserRole, verifiedOrgOnly: linkedOnly, openOnly });
  const orgs = useSearchOrgs(q, (isOrg ? tab : 'academy') as OrgKind);
  const active = isOrg ? orgs : people;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ backgroundColor: colors.dark, paddingTop: insets.top + 12, gap: 12 }}>
        <Text variant="h1" color={colors.onDark} style={{ paddingHorizontal: 16 }}>
          Search
        </Text>
        <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: radius.md, backgroundColor: colors.dark2, paddingHorizontal: 14 }}>
          <SearchIcon size={18} color={colors.onDarkMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isOrg ? 'Name or city' : 'Name, role or city — e.g. fast bowler'}
            placeholderTextColor={colors.onDarkMuted}
            accessibilityLabel="Search"
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.onDark }}
          />
          {text ? (
            <Pressable onPress={() => setText('')} accessibilityLabel="Clear search" hitSlop={10}>
              <X size={18} color={colors.onDarkMuted} />
            </Pressable>
          ) : null}
        </View>
        <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} tone="dark" scrollable />
      </View>

      {tab === 'athlete' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 12, paddingHorizontal: 16 }}>
          <Chip label="Cricket" selected icon={SlidersHorizontal} />
          <Chip label="Academy-verified" selected={linkedOnly} onPress={() => setLinkedOnly(!linkedOnly)} />
          <Chip label="Open to trials" selected={openOnly} onPress={() => setOpenOnly(!openOnly)} />
        </ScrollView>
      ) : (
        <View style={{ height: 8 }} />
      )}

      {active.isLoading ? (
        <Loading />
      ) : active.error ? (
        <ErrorView message={active.error.message} onRetry={() => active.refetch()} />
      ) : isOrg ? (
        <FlatList
          data={orgs.data ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}
          ListHeaderComponent={<ResultCount n={orgs.data?.length ?? 0} noun={TABS.find((t) => t.value === tab)!.label.toLowerCase()} />}
          renderItem={({ item }) => (
            <Card onPress={() => go(`/org/${item.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={item.name} url={item.logo_url} size={48} square />
              <View style={{ flex: 1 }}>
                <Text variant="title">{item.name}</Text>
                <Text variant="small" color={colors.inkMuted}>
                  {orgKindLabels[item.kind]}
                  {item.city ? ` · ${item.city}` : ''}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon={SearchIcon} title="No matches" body="Try a different name or city." />}
        />
      ) : (
        <FlatList
          data={people.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}
          ListHeaderComponent={<ResultCount n={people.data?.length ?? 0} noun={TABS.find((t) => t.value === tab)!.label.toLowerCase()} />}
          renderItem={({ item }) => <PersonCard p={item} />}
          ListEmptyComponent={<EmptyState icon={SearchIcon} title="No matches" body="Try fewer filters or a different search." />}
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

function ResultCount({ n, noun }: { n: number; noun: string }) {
  return (
    <Text variant="small" color={colors.inkSecondary} style={{ marginBottom: 2 }}>
      <Text variant="smallStrong">{n}</Text> {n === 1 ? noun.replace(/s$/, '') : noun}
      {n >= 50 ? ' (showing the first 50)' : ''}
    </Text>
  );
}
