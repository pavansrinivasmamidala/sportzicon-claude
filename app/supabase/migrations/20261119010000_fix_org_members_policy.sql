-- Fix: the org_members policy referenced org_members itself, which Postgres rejects
-- with "infinite recursion detected in policy" whenever the table is read.
-- Admin checks now go through a security-definer helper, and reads use the separate "read org members" policy.

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = p_org and user_id = auth.uid() and member_role = 'admin');
$$;

drop policy if exists "admins manage members" on public.org_members;

create policy "admins add members" on public.org_members for insert to authenticated
  with check (public.is_org_admin(org_id));
create policy "admins update members" on public.org_members for update to authenticated
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "admins remove members" on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));
