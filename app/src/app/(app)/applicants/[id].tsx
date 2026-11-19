import { useLocalSearchParams } from 'expo-router';
import { Check, FileText, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Linking, Pressable, View } from 'react-native';

import { Avatar, Card, EmptyState, Loading, Segmented, Text, TopBar, VerifiedBadge } from '@/components/ui';
import { documentUrl, useApplicants, useOpportunity, useSetApplicationStatus, type Applicant } from '@/lib/api/opportunities';
import { ageFrom, shortDate } from '@/lib/format';
import type { ApplicationStatus } from '@/lib/types';
import { colors, radius } from '@/theme';
import { go } from '@/lib/nav';
import { notify } from '@/lib/dialog';

export default function Applicants() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const opp = useOpportunity(id);
  const apps = useApplicants(id);
  const setStatus = useSetApplicationStatus(id);
  const [tab, setTab] = useState<ApplicationStatus>('submitted');

  const all = apps.data ?? [];
  const count = (s: ApplicationStatus) => all.filter((a) => a.status === s).length;
  const rows = all.filter((a) => a.status === tab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title={opp.data?.title ?? 'Applicants'} subtitle="Applicants" back />
      <View style={{ padding: 16, paddingBottom: 4 }}>
        <Segmented
          options={[
            { value: 'submitted', label: `New · ${count('submitted')}` },
            { value: 'shortlisted', label: `Shortlisted · ${count('shortlisted')}` },
            { value: 'declined', label: `Declined · ${count('declined')}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => <ApplicantRow a={item} onSet={(s) => setStatus.mutate({ id: item.id, status: s })} />}
        ListEmptyComponent={
          apps.isLoading ? (
            <Loading />
          ) : (
            <EmptyState icon={Users} title={tab === 'submitted' ? 'No new applicants' : tab === 'shortlisted' ? 'Nobody shortlisted yet' : 'Nobody declined'} body={tab === 'submitted' ? 'New applications appear here and you get a notification.' : undefined} />
          )
        }
      />
    </View>
  );
}

function ApplicantRow({ a, onSet }: { a: Applicant; onSet: (s: ApplicationStatus) => void }) {
  const p = a.applicant;
  const age = ageFrom(p.date_of_birth);
  const openDoc = async () => {
    try {
      Linking.openURL(await documentUrl(a.document_path!));
    } catch (e) {
      notify('Could not open document', e instanceof Error ? e.message : '');
    }
  };
  return (
    <Card style={{ gap: 10 }}>
      <Pressable onPress={() => go(`/profile/${p.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="link">
        <Avatar name={p.full_name} url={p.avatar_url} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.organization ? <VerifiedBadge size={14} /> : null}
          </View>
          <Text variant="small" color={colors.inkMuted} numberOfLines={1}>
            {[p.playing_role ?? p.headline, age ? `${age}` : null, p.city].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="caption" color={colors.inkMuted}>
            Applied {shortDate(a.created_at)}
          </Text>
        </View>
        {a.status === 'submitted' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onSet('declined')} accessibilityRole="button" accessibilityLabel={`Decline ${p.full_name}`} style={{ width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color={colors.inkSecondary} />
            </Pressable>
            <Pressable onPress={() => onSet('shortlisted')} accessibilityRole="button" accessibilityLabel={`Shortlist ${p.full_name}`} style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Check size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => onSet('submitted')} accessibilityRole="button" hitSlop={8}>
            <Text variant="smallStrong" color={colors.accent}>
              Undo
            </Text>
          </Pressable>
        )}
      </Pressable>
      {a.note ? (
        <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 10 }}>
          <Text variant="small">“{a.note}”</Text>
        </View>
      ) : null}
      {a.document_path ? (
        <Pressable onPress={openDoc} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color={colors.accent} />
          <Text variant="smallStrong" color={colors.accent}>
            View attached document
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
