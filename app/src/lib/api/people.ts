import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PROFILE_SELECT, useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { OrgKind, Organization, Performance, Profile, ProfileWithOrg, SkillRatings, UserRole } from '../types';

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('profiles').select(PROFILE_SELECT).eq('id', id!).single()) as ProfileWithOrg,
  });
}

export function usePerformances(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['performances', athleteId],
    enabled: !!athleteId,
    queryFn: async () =>
      unwrap(
        await supabase.from('performances').select('*').eq('athlete_id', athleteId!).order('played_on', { ascending: false }),
      ) as Performance[],
  });
}

/** Career numbers from a list of performances (verified ones only when `verifiedOnly`). */
export function careerStats(list: Performance[] = []) {
  const matches = list.length;
  const runs = list.reduce((s, p) => s + (p.runs ?? 0), 0);
  const outs = list.filter((p) => (p.balls_faced ?? 0) > 0 && !p.not_out).length;
  const wickets = list.reduce((s, p) => s + (p.wickets ?? 0), 0);
  const ballsBowled = list.reduce((s, p) => {
    const o = p.overs ?? 0;
    return s + Math.floor(o) * 6 + Math.round((o % 1) * 10);
  }, 0);
  const conceded = list.reduce((s, p) => s + (p.runs_conceded ?? 0), 0);
  const best = list
    .filter((p) => p.wickets !== null)
    .sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0) || (a.runs_conceded ?? 0) - (b.runs_conceded ?? 0))[0];
  const highScore = list.reduce((m, p) => Math.max(m, p.runs ?? 0), 0);
  return {
    matches,
    runs,
    average: outs ? runs / outs : null,
    highScore,
    wickets,
    economy: ballsBowled ? (conceded * 6) / ballsBowled : null,
    best: best ? `${best.wickets}/${best.runs_conceded ?? 0}` : null,
    verifiedCount: list.filter((p) => p.verified).length,
    isBowler: ballsBowled > 0,
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) =>
      unwrap(await supabase.from('profiles').update(patch).eq('id', session!.user.id)),
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile', session!.user.id] });
    },
  });
}

export function useAddPerformance() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Performance>) =>
      unwrap(await supabase.from('performances').insert({ ...input, athlete_id: session!.user.id }).select('*').single()) as Performance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performances', session!.user.id] }),
  });
}

export interface PeopleFilters {
  text: string;
  role: UserRole | 'all';
  city?: string;
  verifiedOrgOnly?: boolean;
  openOnly?: boolean;
}

export function useSearchPeople(f: PeopleFilters) {
  return useQuery({
    queryKey: ['search-people', f],
    queryFn: async () => {
      let q = supabase.from('profiles').select(PROFILE_SELECT).eq('onboarded', true).order('full_name').limit(50);
      if (f.role !== 'all') q = q.eq('role', f.role);
      const t = f.text.trim().replace(/[%,()]/g, ' ');
      if (t) q = q.or(`full_name.ilike.%${t}%,playing_role.ilike.%${t}%,city.ilike.%${t}%,headline.ilike.%${t}%`);
      if (f.city) q = q.ilike('city', `%${f.city}%`);
      if (f.verifiedOrgOnly) q = q.not('org_id', 'is', null);
      if (f.openOnly) q = q.eq('open_to_opportunities', true);
      return unwrap(await q) as ProfileWithOrg[];
    },
  });
}

export function useSearchOrgs(text: string, kind: OrgKind | 'all') {
  return useQuery({
    queryKey: ['search-orgs', text, kind],
    queryFn: async () => {
      let q = supabase.from('organizations').select('*').order('name').limit(50);
      if (kind !== 'all') q = q.eq('kind', kind);
      const t = text.trim().replace(/[%,()]/g, ' ');
      if (t) q = q.or(`name.ilike.%${t}%,city.ilike.%${t}%`);
      return unwrap(await q) as Organization[];
    },
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: ['org', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('organizations').select('*').eq('id', id!).single()) as Organization,
  });
}

export function useRoster(orgId: string | undefined) {
  return useQuery({
    queryKey: ['roster', orgId],
    enabled: !!orgId,
    queryFn: async () =>
      unwrap(
        await supabase.from('profiles').select(PROFILE_SELECT).eq('org_id', orgId!).eq('role', 'athlete').order('full_name'),
      ) as ProfileWithOrg[],
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: async (input: { kind: OrgKind; name: string; city: string }) =>
      unwrap(await supabase.rpc('create_organization', { p_kind: input.kind, p_name: input.name, p_city: input.city })) as string,
  });
}

// ---- Shortlists -----------------------------------------------------------

export function useShortlist() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['shortlist'],
    enabled: !!session,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('shortlists').select('athlete_id').eq('owner_id', session!.user.id));
      return new Set((rows ?? []).map((r) => r.athlete_id as string));
    },
  });
}

export function useToggleShortlist() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async ({ athleteId, on }: { athleteId: string; on: boolean }) => {
      const me = session!.user.id;
      if (on) unwrap(await supabase.from('shortlists').insert({ owner_id: me, athlete_id: athleteId }));
      else unwrap(await supabase.from('shortlists').delete().eq('owner_id', me).eq('athlete_id', athleteId));
    },
    onMutate: ({ athleteId, on }) => {
      qc.setQueryData<Set<string>>(['shortlist'], (old) => {
        const next = new Set(old);
        if (on) next.add(athleteId);
        else next.delete(athleteId);
        return next;
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shortlist'] }),
  });
}

export function useShortlistedProfiles() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['shortlist-profiles'],
    enabled: !!session,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('shortlists')
          .select(`athlete:profiles!shortlists_athlete_id_fkey(${PROFILE_SELECT})`)
          .eq('owner_id', session!.user.id)
          .order('created_at', { ascending: false }),
      ) as unknown as { athlete: ProfileWithOrg }[];
      return rows.map((r) => r.athlete);
    },
  });
}

// ---- Verification (academy staff) -----------------------------------------

export interface PendingPerformance extends Performance {
  athlete: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'playing_role'>;
}

export function usePendingVerifications(orgId: string | undefined) {
  return useQuery({
    queryKey: ['pending-verifications', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('performances')
          .select('*, athlete:profiles!performances_athlete_id_fkey!inner(id, full_name, avatar_url, playing_role, org_id)')
          .eq('verified', false)
          .eq('athlete.org_id', orgId!)
          .order('played_on', { ascending: false }),
      );
      return rows as unknown as PendingPerformance[];
    },
  });
}

export function useReviewPerformance(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      unwrap(await supabase.rpc('review_performance', { p_id: id, p_approve: approve })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-verifications', orgId] }),
  });
}

export function useRateSkills(athleteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ratings: SkillRatings) =>
      unwrap(await supabase.rpc('rate_skills', { p_athlete: athleteId, p_ratings: ratings })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', athleteId] }),
  });
}
