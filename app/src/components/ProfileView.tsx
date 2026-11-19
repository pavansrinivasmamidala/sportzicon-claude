import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bookmark, ClipboardList, LogOut, MessageCircle, Minus, Pencil, Plus, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { PerformanceRow } from '@/components/PerformanceCard';
import { openChatWith } from '@/components/PersonCard';
import { PostCard } from '@/components/PostCard';
import { Avatar, Button, Card, EmptyState, ErrorView, Loading, Sheet, Stat, Tag, Text, UnderlineTabs, VerifiedBadge } from '@/components/ui';
import { useFeed } from '@/lib/api/feed';
import { careerStats, usePerformances, useProfile, useRateSkills, useShortlist, useToggleShortlist } from '@/lib/api/people';
import { useAuth } from '@/lib/auth';
import { skillsFor } from '@/lib/cricket-options';
import { ageFrom, isOrgRole, longDate, orgKindLabels, roleLabels } from '@/lib/format';
import type { ProfileWithOrg } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { go } from '@/lib/nav';
import { confirm, notify } from '@/lib/dialog';

type Tab = 'overview' | 'stats' | 'posts';

export function ProfileView({ id, isMe }: { id: string; isMe?: boolean }) {
  const { profile: viewer, signOut } = useAuth();
  const profile = useProfile(id);
  const perfs = usePerformances(id);
  const posts = useFeed(id);
  const { data: shortlist } = useShortlist();
  const toggle = useToggleShortlist();
  const [tab, setTab] = useState<Tab>('overview');
  const [rating, setRating] = useState(false);
  const [opening, setOpening] = useState(false);

  const p = profile.data;
  const stats = useMemo(() => careerStats(perfs.data), [perfs.data]);

  if (profile.isLoading) return <Loading />;
  if (profile.error || !p) return <ErrorView message={profile.error?.message ?? 'Profile not found'} onRetry={() => profile.refetch()} />;

  const athlete = p.role === 'athlete';
  const verifiedAthlete = athlete && !!p.organization;
  const age = ageFrom(p.date_of_birth);
  const canRate = athlete && !!viewer && isOrgRole(viewer.role) && !!viewer.org_id && viewer.org_id === p.org_id;
  const onShortlist = shortlist?.has(p.id) ?? false;
  const subtitle = athlete ? [p.playing_role, age ? `${age} yrs` : null].filter(Boolean).join(' · ') : p.headline || roleLabels[p.role];

  const tabs: { value: Tab; label: string }[] = athlete
    ? [
        { value: 'overview', label: 'Overview' },
        { value: 'stats', label: 'Stats' },
        { value: 'posts', label: 'Posts' },
      ]
    : [
        { value: 'overview', label: 'About' },
        { value: 'posts', label: 'Posts' },
      ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} stickyHeaderIndices={[1]}>
      {/* Passport */}
      <View style={styles.passport}>
        <Image source={require('@/assets/brand/logo-flame.png')} style={styles.watermark} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Avatar name={p.full_name} url={p.avatar_url} size={76} ring />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="h1" color={colors.onDark} numberOfLines={2} style={{ flexShrink: 1, fontSize: 22, lineHeight: 28 }}>
                {p.full_name}
              </Text>
              {verifiedAthlete ? <VerifiedBadge size={20} /> : null}
            </View>
            {subtitle ? <Text color={colors.onDarkSecondary}>{subtitle}</Text> : null}
            <Text variant="small" color={colors.onDarkMuted}>
              {[p.organization?.name, p.city].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {athlete && p.open_to_opportunities ? <Tag label="Open to trials" tone="brand" /> : null}
          <Tag label={roleLabels[p.role].split(' /')[0]} tone="dark" />
          <Tag label={p.sport.charAt(0).toUpperCase() + p.sport.slice(1)} tone="dark" />
          {athlete && p.passport_code ? <Tag label={p.passport_code} tone="dark" /> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {isMe ? (
            <>
              <Button label="Edit profile" icon={Pencil} size="md" style={{ flex: 1 }} onPress={() => router.push('/profile/edit')} />
              <Button
                label="Share"
                icon={Share2}
                variant="outlineDark"
                size="md"
                style={{ flex: 1 }}
                onPress={() => Share.share({ message: `${p.full_name} on Sportzicon${p.passport_code ? ` (${p.passport_code})` : ''}` })}
              />
            </>
          ) : (
            <>
              <Button
                label="Message"
                icon={MessageCircle}
                size="md"
                style={{ flex: 1 }}
                loading={opening}
                onPress={async () => {
                  setOpening(true);
                  await openChatWith(p.id);
                  setOpening(false);
                }}
              />
              {athlete ? (
                <Button
                  label={onShortlist ? 'Shortlisted' : 'Shortlist'}
                  icon={Bookmark}
                  variant="outlineDark"
                  size="md"
                  style={{ flex: 1 }}
                  onPress={() => toggle.mutate({ athleteId: p.id, on: !onShortlist })}
                />
              ) : null}
            </>
          )}
        </View>

        {athlete ? (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: colors.dark2, borderRadius: radius.lg }}>
              <Stat dark value={String(stats.matches)} label="Matches" />
              {stats.isBowler ? (
                <>
                  <Stat dark value={String(stats.wickets)} label="Wickets" />
                  <Stat dark value={stats.economy !== null ? stats.economy.toFixed(1) : '–'} label="Economy" />
                  <Stat dark highlight value={stats.best ?? '–'} label="Best" />
                </>
              ) : (
                <>
                  <Stat dark value={String(stats.runs)} label="Runs" />
                  <Stat dark value={stats.average !== null ? stats.average.toFixed(1) : '–'} label="Average" />
                  <Stat dark highlight value={String(stats.highScore || '–')} label="High score" />
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <VerifiedBadge size={14} />
              <Text variant="caption" color={colors.onDarkMuted}>
                {stats.matches
                  ? `${stats.verifiedCount} of ${stats.matches} matches verified by official scorers${p.organization ? ` or ${p.organization.name}` : ''}`
                  : 'No match stats yet'}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} />

      <View style={{ padding: 16, gap: 12 }}>
        {tab === 'overview' ? (
          <>
            {p.bio ? (
              <Card>
                <Text>{p.bio}</Text>
              </Card>
            ) : null}
            {p.organization && !athlete ? (
              <Card onPress={() => go(`/org/${p.organization!.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={p.organization.name} size={44} square />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{p.organization.name}</Text>
                  <Text variant="small" color={colors.inkMuted}>
                    {orgKindLabels[p.organization.kind]}
                    {p.organization.city ? ` · ${p.organization.city}` : ''}
                  </Text>
                </View>
              </Card>
            ) : null}
            {athlete ? <SkillCard p={p} canRate={canRate} onRate={() => setRating(true)} /> : null}
            {athlete ? (
              <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                {perfs.data?.length ? (
                  perfs.data.slice(0, 3).map((x, i, arr) => <PerformanceRow key={x.id} p={x} last={i === arr.length - 1} />)
                ) : (
                  <Text color={colors.inkMuted} style={{ paddingVertical: 12 }}>
                    {isMe ? 'Add your recent matches so scouts can see your numbers.' : 'No matches recorded yet.'}
                  </Text>
                )}
              </Card>
            ) : null}
            {isMe ? <MySection p={p} onSignOut={signOut} /> : null}
          </>
        ) : null}

        {tab === 'stats' ? (
          <>
            {isMe ? <Button label="Add match stats" icon={Plus} variant="secondary" onPress={() => router.push('/profile/add-stats')} /> : null}
            <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
              {perfs.data?.length ? (
                perfs.data.map((x, i, arr) => <PerformanceRow key={x.id} p={x} last={i === arr.length - 1} />)
              ) : (
                <Text color={colors.inkMuted} style={{ paddingVertical: 12 }}>
                  No matches recorded yet.
                </Text>
              )}
            </Card>
            <Text variant="caption" color={colors.inkMuted}>
              Matches scored live on Sportzicon are verified automatically. Other stats are confirmed by the athlete’s academy.
            </Text>
          </>
        ) : null}

        {tab === 'posts' ? (
          posts.isLoading ? (
            <Loading />
          ) : posts.data?.length ? (
            posts.data.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <EmptyState icon={ClipboardList} title="No posts yet" body={isMe ? 'Share a reel or scorecard from the Home tab.' : undefined} />
          )
        ) : null}
      </View>

      {canRate ? <RateSkillsSheet p={p} visible={rating} onClose={() => setRating(false)} /> : null}
    </ScrollView>
  );
}

function SkillCard({ p, canRate, onRate }: { p: ProfileWithOrg; canRate: boolean; onRate: () => void }) {
  // The database doesn't keep key order, so show the standard skills first, in a fixed order.
  const ratings = p.skill_ratings ?? {};
  const known = skillsFor(p.playing_role);
  const entries = [...known.filter((k) => k in ratings), ...Object.keys(ratings).filter((k) => !known.includes(k)).sort()].map(
    (k) => [k, ratings[k]] as [string, number],
  );
  if (!entries.length && !canRate) return null;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="h3" style={{ fontSize: 16 }}>
          Skill profile
        </Text>
        {canRate ? (
          <Pressable onPress={onRate} hitSlop={8} accessibilityRole="button">
            <Text variant="smallStrong" color={colors.accent}>
              {entries.length ? 'Update ratings' : 'Rate skills'}
            </Text>
          </Pressable>
        ) : (
          <Text variant="caption" color={colors.inkMuted}>
            Coach-assessed{p.skill_rated_at ? ` · ${longDate(p.skill_rated_at)}` : ''}
          </Text>
        )}
      </View>
      {entries.length ? (
        entries.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${k}: ${v} out of 100`}>
            <Text variant="small" style={{ width: 84 }}>
              {k}
            </Text>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
              <View style={{ width: `${v}%`, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />
            </View>
            <Text variant="smallStrong" numeric style={{ width: 28, textAlign: 'right' }}>
              {v}
            </Text>
          </View>
        ))
      ) : (
        <Text variant="small" color={colors.inkMuted}>
          No ratings yet. As this athlete’s academy, you can add a coach assessment.
        </Text>
      )}
    </Card>
  );
}

function RateSkillsSheet({ p, visible, onClose }: { p: ProfileWithOrg; visible: boolean; onClose: () => void }) {
  const rate = useRateSkills(p.id);
  const keys = skillsFor(p.playing_role);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(keys.map((k) => [k, p.skill_ratings?.[k] ?? 60])),
  );
  const bump = (k: string, d: number) => setValues((v) => ({ ...v, [k]: Math.max(0, Math.min(100, (v[k] ?? 60) + d)) }));
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rate skills"
      subtitle={`Coach assessment for ${p.full_name}, out of 100.`}
      footer={
        <Button
          label="Save ratings"
          loading={rate.isPending}
          onPress={async () => {
            try {
              await rate.mutateAsync(values);
              onClose();
            } catch (e) {
              notify('Could not save', e instanceof Error ? e.message : '');
            }
          }}
        />
      }>
      {keys.map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {k}
          </Text>
          <Pressable onPress={() => bump(k, -5)} accessibilityLabel={`Lower ${k}`} accessibilityRole="button" style={styles.stepper}>
            <Minus size={18} color={colors.ink} />
          </Pressable>
          <Text variant="stat" style={{ width: 44, textAlign: 'center' }}>
            {values[k]}
          </Text>
          <Pressable onPress={() => bump(k, 5)} accessibilityLabel={`Raise ${k}`} accessibilityRole="button" style={styles.stepper}>
            <Plus size={18} color={colors.ink} />
          </Pressable>
        </View>
      ))}
    </Sheet>
  );
}

function MySection({ p, onSignOut }: { p: ProfileWithOrg; onSignOut: () => void }) {
  const rows: { label: string; onPress: () => void }[] = [];
  if (!isOrgRole(p.role)) rows.push({ label: 'My applications', onPress: () => router.push('/applications') });
  if (p.role === 'scout' || isOrgRole(p.role)) rows.push({ label: 'My shortlist', onPress: () => router.push('/shortlist') });
  if (isOrgRole(p.role) && p.organization) rows.push({ label: 'Organization page', onPress: () => go(`/org/${p.organization!.id}`) });
  rows.push({ label: 'Live and recent matches', onPress: () => router.push('/live') });
  return (
    <View style={{ gap: 12, marginTop: 4 }}>
      <Card padded={false}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={r.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              { paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: colors.divider },
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}>
            <Text style={{ fontFamily: fonts.bodyMedium }}>{r.label}</Text>
          </Pressable>
        ))}
      </Card>
      <Button
        label="Sign out"
        icon={LogOut}
        variant="secondary"
        onPress={async () => {
          if (await confirm({ title: 'Sign out?', confirmLabel: 'Sign out', destructive: true })) onSignOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  passport: { backgroundColor: colors.dark, padding: 16, paddingTop: 6, gap: 14, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -30, top: -8, width: 160, height: 172, opacity: 0.09 },
  stepper: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
