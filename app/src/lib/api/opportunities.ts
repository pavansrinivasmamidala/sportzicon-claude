import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PROFILE_SELECT, useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { Application, ApplicationStatus, Opportunity, OpportunityType, OpportunityWithOrg, ProfileWithOrg } from '../types';

const OPP_SELECT = '*, organization:organizations!opportunities_org_id_fkey(id, name, kind, city)';

export function useOpportunities(type: OpportunityType | 'all', text = '') {
  return useQuery({
    queryKey: ['opportunities', type, text],
    queryFn: async () => {
      let q = supabase
        .from('opportunities')
        .select(OPP_SELECT)
        .eq('status', 'open')
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(60);
      if (type !== 'all') q = q.eq('type', type);
      const t = text.trim().replace(/[%,()]/g, ' ');
      if (t) q = q.or(`title.ilike.%${t}%,city.ilike.%${t}%,description.ilike.%${t}%`);
      return unwrap(await q) as OpportunityWithOrg[];
    },
  });
}

export function useOrgOpportunities(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-opportunities', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('opportunities')
          .select(`${OPP_SELECT}, applications(status)`)
          .eq('org_id', orgId!)
          .order('created_at', { ascending: false }),
      ) as unknown as (OpportunityWithOrg & { applications: { status: ApplicationStatus }[] })[];
      return rows;
    },
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => unwrap(await supabase.from('opportunities').select(OPP_SELECT).eq('id', id).single()) as OpportunityWithOrg,
  });
}

export function useMyApplications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-applications'],
    enabled: !!session,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('applications')
          .select(`*, opportunity:opportunities(${OPP_SELECT})`)
          .eq('applicant_id', session!.user.id)
          .order('created_at', { ascending: false }),
      ) as unknown as (Application & { opportunity: OpportunityWithOrg })[],
  });
}

export function useApply() {
  const qc = useQueryClient();
  const { session, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { opportunityId: string; note?: string; documentPath?: string | null; asOrg?: boolean }) =>
      unwrap(
        await supabase.from('applications').insert({
          opportunity_id: input.opportunityId,
          applicant_id: session!.user.id,
          applicant_org_id: input.asOrg ? profile?.org_id : null,
          note: input.note || null,
          document_path: input.documentPath ?? null,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-applications'] }),
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => unwrap(await supabase.from('applications').delete().eq('id', applicationId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-applications'] }),
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  const { session, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<Opportunity, 'id' | 'org_id' | 'posted_by' | 'created_at' | 'status' | 'sport'>) =>
      unwrap(
        await supabase
          .from('opportunities')
          .insert({ ...input, org_id: profile!.org_id, posted_by: session!.user.id })
          .select('id')
          .single(),
      ) as { id: string },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      qc.invalidateQueries({ queryKey: ['org-opportunities'] });
    },
  });
}

export function useCloseOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, open }: { id: string; open: boolean }) =>
      unwrap(await supabase.from('opportunities').update({ status: open ? 'open' : 'closed' }).eq('id', id)),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['opportunity', v.id] });
      qc.invalidateQueries({ queryKey: ['org-opportunities'] });
      qc.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
}

export type Applicant = Application & { applicant: ProfileWithOrg };

export function useApplicants(opportunityId: string) {
  return useQuery({
    queryKey: ['applicants', opportunityId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('applications')
          .select(`*, applicant:profiles!applications_applicant_id_fkey(${PROFILE_SELECT})`)
          .eq('opportunity_id', opportunityId)
          .order('created_at', { ascending: false }),
      ) as unknown as Applicant[],
  });
}

export function useSetApplicationStatus(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) =>
      unwrap(await supabase.from('applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id)),
    onMutate: ({ id, status }) => {
      qc.setQueryData<Applicant[]>(['applicants', opportunityId], (old) => old?.map((a) => (a.id === id ? { ...a, status } : a)));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['applicants', opportunityId] });
      qc.invalidateQueries({ queryKey: ['org-opportunities'] });
    },
  });
}

export async function documentUrl(path: string) {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function useSavedOpportunityIds() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['saved-opportunities'],
    enabled: !!session,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', session!.user.id));
      return new Set((rows ?? []).map((r) => r.opportunity_id as string));
    },
  });
}

export function useToggleSaveOpportunity() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const me = session!.user.id;
      if (on) unwrap(await supabase.from('saved_opportunities').insert({ user_id: me, opportunity_id: id }));
      else unwrap(await supabase.from('saved_opportunities').delete().eq('user_id', me).eq('opportunity_id', id));
    },
    onMutate: ({ id, on }) =>
      qc.setQueryData<Set<string>>(['saved-opportunities'], (old) => {
        const next = new Set(old);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['saved-opportunities'] }),
  });
}
