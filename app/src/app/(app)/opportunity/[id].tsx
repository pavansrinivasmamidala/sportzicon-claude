import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, Check, FileText, Share2, Upload, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Avatar, Button, Card, Field, IconButton, Sheet, Tag, Text, TopBar } from '@/components/ui';
import { useApply, useCloseOpportunity, useMyApplications, useOpportunity, useSavedOpportunityIds, useToggleSaveOpportunity, useWithdraw } from '@/lib/api/opportunities';
import { careerStats, usePerformances } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { dateTime, deadlineText, isOrgRole, longDate, money, opportunityLabels, orgKindLabels } from '@/lib/format';
import { pickDocument, uploadFile, type PickedFile } from '@/lib/upload';
import { colors, radius } from '@/theme';
import { go } from '@/lib/nav';
import { ScreenState } from '@/components/ScreenState';
import { confirm, notify } from '@/lib/dialog';

function Check20({ ok }: { ok: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill={ok ? colors.success : colors.borderStrong} />
      <Path d="m8 12.5 2.5 2.5L16 9.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function OpportunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const opp = useOpportunity(id);
  const apps = useMyApplications();
  const perfs = usePerformances(me.id);
  const { data: saved } = useSavedOpportunityIds();
  const toggleSave = useToggleSaveOpportunity();
  const apply = useApply();
  const withdraw = useWithdraw();
  const close = useCloseOpportunity();
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const [doc, setDoc] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);

  const o = opp.data;
  const myApp = apps.data?.find((a) => a.opportunity_id === id);
  const stats = useMemo(() => careerStats(perfs.data), [perfs.data]);

  if (opp.isLoading) return <ScreenState />;
  if (opp.error || !o) return <ScreenState error={opp.error?.message ?? 'Not found'} />;

  const isStaff = isOrgRole(me.role) && me.org_id === o.org_id;
  const dl = deadlineText(o.deadline);
  const closed = o.status === 'closed' || !!dl?.closed;
  const isSaved = saved?.has(o.id) ?? false;
  // Who applies: athletes for trials; individuals for jobs; organizations for tournaments.
  const asOrg = o.type === 'tournament';
  const eligible = asOrg ? isOrgRole(me.role) && !!me.org_id : !isOrgRole(me.role);

  const submit = async () => {
    setBusy(true);
    try {
      const documentPath = doc ? await uploadFile('documents', me.id, doc) : null;
      await apply.mutateAsync({ opportunityId: o.id, note, documentPath, asOrg });
      setSheet(false);
      notify('Application sent', `${o.organization.name} will review it. You’ll get a notification when they respond.`);
    } catch (e) {
      notify('Could not apply', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const facts: [string, string | null][] = [
    ['Date', o.starts_at ? dateTime(o.starts_at) : null],
    ['Location', [o.venue, o.city].filter(Boolean).join(', ') || null],
    ['Age group', o.age_group],
    [o.type === 'job' ? 'Pay' : 'Entry fee', o.type === 'job' ? o.compensation : money(o.fee_inr)],
    [o.type === 'tournament' ? 'Teams' : 'Spots', o.vacancies ? String(o.vacancies) : null],
    ['Apply by', o.deadline ? longDate(o.deadline) : null],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        back
        right={
          <>
            <IconButton icon={Bookmark} label={isSaved ? 'Unsave' : 'Save'} tone="onDark" color={isSaved ? colors.brand : undefined} onPress={() => toggleSave.mutate({ id: o.id, on: !isSaved })} />
            <IconButton icon={Share2} label="Share" tone="onDark" onPress={() => Share.share({ message: `${o.title} · ${o.organization.name} on Sportzicon` })} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Tag label={opportunityLabels[o.type]} tone={o.type === 'trial' ? 'accent' : o.type === 'job' ? 'neutral' : 'warning'} />
          {closed ? <Tag label="Closed" tone="neutral" /> : dl?.urgent ? <Tag label={dl.text} tone="warning" /> : null}
        </View>
        <Text variant="h1">{o.title}</Text>
        <Pressable onPress={() => go(`/org/${o.org_id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="link">
          <Avatar name={o.organization.name} size={36} square />
          <View>
            <Text variant="bodyStrong">{o.organization.name}</Text>
            <Text variant="small" color={colors.inkMuted}>
              {orgKindLabels[o.organization.kind]}
              {o.organization.city ? ` · ${o.organization.city}` : ''}
            </Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <View key={k} style={{ width: '48.5%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, gap: 2 }}>
                <Text variant="caption" color={colors.inkMuted}>
                  {k}
                </Text>
                <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                  {v}
                </Text>
              </View>
            ))}
        </View>

        {o.description ? (
          <View style={{ gap: 6 }}>
            <Text variant="overline" color={colors.inkSecondary}>
              About
            </Text>
            <Text>{o.description}</Text>
          </View>
        ) : null}
        {o.requirements.length ? (
          <View style={{ gap: 8 }}>
            <Text variant="overline" color={colors.inkSecondary}>
              Requirements
            </Text>
            {o.requirements.map((r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
                <Check size={18} color={colors.accent} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1 }}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
        {isStaff ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="View applicants" icon={Users} style={{ flex: 1 }} onPress={() => go(`/applicants/${o.id}`)} />
            <Button
              label={o.status === 'open' ? 'Close listing' : 'Reopen listing'}
              variant="secondary"
              fullWidth={false}
              loading={close.isPending}
              onPress={() => close.mutate({ id: o.id, open: o.status !== 'open' })}
            />
          </View>
        ) : myApp ? (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: myApp.status === 'shortlisted' ? colors.successSoft : colors.surfaceMuted, borderWidth: 0 }}>
              <Check20 ok />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {myApp.status === 'shortlisted' ? 'You’ve been shortlisted' : myApp.status === 'declined' ? 'Not selected this time' : 'Application sent · in review'}
              </Text>
            </Card>
            {myApp.status === 'submitted' ? (
              <Button
                label="Withdraw application"
                variant="ghost"
                onPress={async () => {
                  if (await confirm({ title: 'Withdraw your application?', confirmLabel: 'Withdraw', cancelLabel: 'Keep it', destructive: true })) withdraw.mutate(myApp.id);
                }}
              />
            ) : null}
          </>
        ) : closed ? (
          <Button label="Applications closed" disabled />
        ) : eligible ? (
          <Button label={asOrg ? 'Register your team' : 'Apply'} onPress={() => setSheet(true)} />
        ) : (
          <Text variant="small" color={colors.inkMuted} center>
            {asOrg ? 'Academies, clubs and associations register for tournaments.' : 'Individuals apply to this opportunity.'}
          </Text>
        )}
      </View>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title={asOrg ? 'Register for this tournament' : `Apply to this ${opportunityLabels[o.type].toLowerCase()}`}
        subtitle={asOrg ? `Your organization profile is shared with ${o.organization.name}.` : 'Your Sportzicon profile is shared with the organizer.'}
        footer={<Button label={asOrg ? 'Submit registration' : 'Submit application'} loading={busy} onPress={submit} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dark, borderRadius: radius.lg, padding: 12 }}>
          <Avatar name={asOrg ? me.organization?.name : me.full_name} url={asOrg ? null : me.avatar_url} size={44} square={asOrg} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={colors.onDark}>
              {asOrg ? me.organization?.name : me.full_name}
            </Text>
            <Text variant="small" color={colors.onDarkMuted}>
              {asOrg ? `Registered by ${me.full_name}` : me.playing_role ?? me.headline ?? ''}
            </Text>
          </View>
          {!asOrg ? (
            <Pressable
              onPress={() => {
                setSheet(false);
                router.push('/me');
              }}
              hitSlop={8}
              accessibilityRole="link">
              <Text variant="smallStrong" color={colors.brand}>
                Preview
              </Text>
            </Pressable>
          ) : null}
        </View>
        {me.role === 'athlete' ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <Check20 ok={stats.matches > 0} />
              <Text style={{ flex: 1, fontSize: 14 }}>Match stats included</Text>
              <Text variant="small" color={colors.inkMuted}>
                {stats.matches} matches · {stats.verifiedCount} verified
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
              <Check20 ok={!!me.date_of_birth} />
              <Text style={{ flex: 1, fontSize: 14 }}>{me.date_of_birth ? 'Age on profile' : 'Add your date of birth for age-group trials'}</Text>
            </View>
          </View>
        ) : null}
        <Field label="Note to selectors" optional value={note} onChangeText={setNote} multiline placeholder="Anything they should know?" />
        <Pressable
          onPress={async () => setDoc(await pickDocument())}
          accessibilityRole="button"
          style={{ height: 52, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inkFaint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.canvas }}>
          {doc ? <FileText size={18} color={colors.accent} /> : <Upload size={18} color={colors.inkSecondary} />}
          <Text variant="bodyStrong" style={{ fontSize: 14 }} color={doc ? colors.accent : '#334155'} numberOfLines={1}>
            {doc ? doc.name : asOrg ? 'Attach squad list (PDF, DOC)' : 'Attach a document (PDF, DOC)'}
          </Text>
        </Pressable>
      </Sheet>
    </View>
  );
}
