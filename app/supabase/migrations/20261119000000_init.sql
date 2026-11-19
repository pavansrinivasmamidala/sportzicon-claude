-- Sportzicon v1 schema
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on a fresh project.

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('athlete', 'coach', 'scout', 'club', 'organizer', 'scorer');
create type public.org_kind as enum ('academy', 'club', 'association');
create type public.opportunity_type as enum ('trial', 'job', 'tournament');
create type public.application_status as enum ('submitted', 'shortlisted', 'declined');
create type public.match_status as enum ('scheduled', 'live', 'completed');

-- ---------------------------------------------------------------------------
-- Organizations & profiles
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null check (char_length(name) between 2 and 120),
  city text,
  logo_url text,
  about text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.user_role not null default 'athlete',
  full_name text not null default '',
  headline text,
  avatar_url text,
  city text,
  sport text not null default 'cricket',
  bio text,
  date_of_birth date,
  playing_role text,
  batting_style text,
  bowling_style text,
  open_to_opportunities boolean not null default true,
  -- Athletes: the academy/club they belong to. Org accounts: the organization they manage.
  org_id uuid references public.organizations on delete set null,
  skill_ratings jsonb not null default '{}'::jsonb,
  skill_rated_by uuid references public.profiles on delete set null,
  skill_rated_at timestamptz,
  passport_code text unique,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_org_idx on public.profiles (org_id);
create index profiles_name_trgm_idx on public.profiles using gin (to_tsvector('simple', full_name || ' ' || coalesce(playing_role, '') || ' ' || coalesce(city, '')));

create table public.org_members (
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  member_role text not null default 'staff' check (member_role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- True when the signed-in user is staff of the organization.
create or replace function public.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = p_org and user_id = auth.uid());
$$;

-- Passport code like SZ-2026-4821
create or replace function public.set_passport_code()
returns trigger language plpgsql as $$
begin
  if new.passport_code is null then
    loop
      new.passport_code := 'SZ-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles where passport_code = new.passport_code);
    end loop;
  end if;
  return new;
end $$;

create trigger profiles_passport_code before insert on public.profiles
  for each row execute function public.set_passport_code();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  begin
    v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'athlete');
  exception when others then
    v_role := 'athlete';
  end;
  insert into public.profiles (id, full_name, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    v_role,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Org accounts create their organization (and become its admin) through this.
create or replace function public.create_organization(p_kind public.org_kind, p_name text, p_city text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.organizations (kind, name, city, created_by)
  values (p_kind, p_name, p_city, auth.uid()) returning id into v_org;
  insert into public.org_members (org_id, user_id, member_role) values (v_org, auth.uid(), 'admin');
  update public.profiles set org_id = v_org where id = auth.uid();
  return v_org;
end $$;

-- ---------------------------------------------------------------------------
-- Feed
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles on delete set null,
  scorer_id uuid references public.profiles on delete set null,
  competition text,
  venue text,
  format text not null default 'T20',
  overs_limit int not null default 20 check (overs_limit between 1 and 50),
  team_a text not null,
  team_b text not null,
  batting_first text not null default 'a' check (batting_first in ('a', 'b')),
  status public.match_status not null default 'scheduled',
  current_innings smallint not null default 1 check (current_innings in (1, 2)),
  striker_id uuid,
  non_striker_id uuid,
  bowler_id uuid,
  result text,
  starts_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index matches_status_idx on public.matches (status, starts_at desc);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  team text not null check (team in ('a', 'b')),
  name text not null,
  profile_id uuid references public.profiles on delete set null,
  batting_order int not null default 0
);
create index match_players_match_idx on public.match_players (match_id);

alter table public.matches
  add constraint matches_striker_fk foreign key (striker_id) references public.match_players on delete set null,
  add constraint matches_non_striker_fk foreign key (non_striker_id) references public.match_players on delete set null,
  add constraint matches_bowler_fk foreign key (bowler_id) references public.match_players on delete set null;

create table public.balls (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches on delete cascade,
  innings smallint not null check (innings in (1, 2)),
  seq int not null,
  striker_id uuid not null references public.match_players on delete cascade,
  non_striker_id uuid references public.match_players on delete cascade,
  bowler_id uuid not null references public.match_players on delete cascade,
  runs_bat smallint not null default 0 check (runs_bat between 0 and 7),
  extra_type text not null default 'none' check (extra_type in ('none', 'wide', 'noball', 'bye', 'legbye')),
  extra_runs smallint not null default 0 check (extra_runs between 0 and 7),
  is_wicket boolean not null default false,
  wicket_kind text,
  dismissed_id uuid references public.match_players on delete set null,
  shot_zone text,
  pitch_zone text,
  commentary text,
  created_at timestamptz not null default now(),
  unique (match_id, innings, seq)
);

create table public.performances (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles on delete cascade,
  match_id uuid references public.matches on delete set null,
  opponent text not null,
  format text not null default 'T20',
  played_on date not null default current_date,
  runs int,
  balls_faced int,
  fours int,
  sixes int,
  not_out boolean not null default false,
  overs numeric(4, 1),
  maidens int,
  runs_conceded int,
  wickets int,
  source text not null default 'self' check (source in ('self', 'live_scoring')),
  verified boolean not null default false,
  verified_by uuid references public.profiles on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index performances_athlete_idx on public.performances (athlete_id, played_on desc);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'video', 'image', 'scorecard', 'article')),
  body text not null default '',
  media_url text,
  performance_id uuid references public.performances on delete set null,
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);

create table public.post_endorsements (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.saved_posts (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create view public.post_stats with (security_invoker = true) as
  select p.id as post_id,
    (select count(*) from public.post_endorsements e where e.post_id = p.id)::int as endorsements,
    (select count(*) from public.post_comments c where c.post_id = p.id)::int as comments
  from public.posts p;

-- ---------------------------------------------------------------------------
-- Recruitment
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  posted_by uuid references public.profiles on delete set null,
  type public.opportunity_type not null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  sport text not null default 'cricket',
  city text,
  venue text,
  starts_at timestamptz,
  deadline date,
  age_group text,
  fee_inr int,
  compensation text,
  vacancies int,
  requirements text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index opportunities_open_idx on public.opportunities (status, deadline);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities on delete cascade,
  applicant_id uuid not null references public.profiles on delete cascade,
  applicant_org_id uuid references public.organizations on delete set null,
  note text,
  document_path text,
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);

create table public.shortlists (
  owner_id uuid not null references public.profiles on delete cascade,
  athlete_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, athlete_id)
);

create table public.saved_opportunities (
  user_id uuid not null references public.profiles on delete cascade,
  opportunity_id uuid not null references public.opportunities on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null default '',
  attachment jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation and user_id = auth.uid());
$$;

-- Find or create the 1:1 conversation with another user.
create or replace function public.start_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_other = auth.uid() then raise exception 'Cannot message yourself'; end if;
  select a.conversation_id into v_id
  from public.conversation_members a
  join public.conversation_members b on b.conversation_id = a.conversation_id
  where a.user_id = auth.uid() and b.user_id = p_other
    and (select count(*) from public.conversation_members c where c.conversation_id = a.conversation_id) = 2
  limit 1;
  if v_id is null then
    insert into public.conversations default values returning id into v_id;
    insert into public.conversation_members (conversation_id, user_id) values (v_id, auth.uid()), (v_id, p_other);
  end if;
  return v_id;
end $$;

create or replace function public.on_message_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(case when new.body <> '' then new.body else 'Shared an attachment' end, 140)
   where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('application', 'message', 'verification', 'endorsement', 'match', 'opportunity', 'shortlist')),
  title text not null,
  body text,
  link text,
  actor_id uuid references public.profiles on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_actor uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link, actor_id)
  select p_user, p_kind, p_title, p_body, p_link, p_actor
  where p_user is not null and p_user is distinct from p_actor;
$$;

create or replace function public.on_application_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_opp public.opportunities;
  v_org_name text;
  v_applicant text;
begin
  select * into v_opp from public.opportunities where id = new.opportunity_id;
  select name into v_org_name from public.organizations where id = v_opp.org_id;
  if tg_op = 'INSERT' then
    select full_name into v_applicant from public.profiles where id = new.applicant_id;
    perform public.notify(m.user_id, 'application', 'New application: ' || v_opp.title,
      coalesce(v_applicant, 'Someone') || ' applied.', '/applicants/' || v_opp.id, new.applicant_id)
    from public.org_members m where m.org_id = v_opp.org_id;
  elsif new.status is distinct from old.status and new.status <> 'submitted' then
    perform public.notify(new.applicant_id, 'application',
      case new.status when 'shortlisted' then 'You''ve been shortlisted for ' || v_opp.title
                      else 'Update on your application to ' || v_opp.title end,
      v_org_name, '/opportunity/' || v_opp.id, auth.uid());
  end if;
  return new;
end $$;

create trigger applications_notify after insert or update of status on public.applications
  for each row execute function public.on_application_change();

create or replace function public.on_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender text;
begin
  select full_name into v_sender from public.profiles where id = new.sender_id;
  perform public.notify(m.user_id, 'message', coalesce(v_sender, 'Someone') || ' sent you a message',
    left(new.body, 140), '/chat/' || new.conversation_id, new.sender_id)
  from public.conversation_members m where m.conversation_id = new.conversation_id;
  return new;
end $$;

create trigger messages_notify after insert on public.messages
  for each row execute function public.on_message_notify();

create or replace function public.on_endorsement_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_name text;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  select full_name into v_name from public.profiles where id = new.user_id;
  perform public.notify(v_author, 'endorsement', coalesce(v_name, 'Someone') || ' endorsed your post', null,
    '/post/' || new.post_id, new.user_id);
  return new;
end $$;

create trigger endorsements_notify after insert on public.post_endorsements
  for each row execute function public.on_endorsement_notify();

create or replace function public.on_shortlist_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = new.owner_id;
  perform public.notify(new.athlete_id, 'shortlist', coalesce(v_name, 'A scout') || ' added you to a shortlist', null,
    '/profile/' || new.owner_id, new.owner_id);
  return new;
end $$;

create trigger shortlists_notify after insert on public.shortlists
  for each row execute function public.on_shortlist_notify();

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- The athlete's academy/club staff confirm (or reject) self-reported stats.
create or replace function public.review_performance(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_perf public.performances;
  v_org uuid;
  v_org_name text;
begin
  select * into v_perf from public.performances where id = p_id;
  if v_perf.id is null then raise exception 'Not found'; end if;
  select org_id into v_org from public.profiles where id = v_perf.athlete_id;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'Only the athlete''s academy can review these stats'; end if;
  select name into v_org_name from public.organizations where id = v_org;
  if p_approve then
    update public.performances set verified = true, verified_by = auth.uid(), verified_at = now() where id = p_id;
    perform public.notify(v_perf.athlete_id, 'verification', v_org_name || ' verified your stats',
      'vs ' || v_perf.opponent || ' (' || to_char(v_perf.played_on, 'DD Mon') || ')', '/profile/' || v_perf.athlete_id, auth.uid());
  else
    delete from public.performances where id = p_id;
    perform public.notify(v_perf.athlete_id, 'verification', v_org_name || ' could not verify your stats',
      'vs ' || v_perf.opponent || '. Please check the numbers and resubmit.', '/profile/' || v_perf.athlete_id, auth.uid());
  end if;
end $$;

-- Coach assessment of an athlete's skills (academy staff only).
create or replace function public.rate_skills(p_athlete uuid, p_ratings jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.profiles where id = p_athlete;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'Only the athlete''s academy can rate skills'; end if;
  update public.profiles set skill_ratings = p_ratings, skill_rated_by = auth.uid(), skill_rated_at = now() where id = p_athlete;
end $$;

-- The scorer completes a match: stats for linked players are written as verified performances.
create or replace function public.complete_match(p_match uuid, p_result text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches where id = p_match;
  if v_match.id is null then raise exception 'Match not found'; end if;
  if v_match.scorer_id is distinct from auth.uid() then raise exception 'Only the scorer can complete this match'; end if;
  if v_match.status = 'completed' then return; end if;

  update public.matches set status = 'completed', result = p_result where id = p_match;

  insert into public.performances (athlete_id, match_id, opponent, format, played_on, runs, balls_faced, fours, sixes,
                                   not_out, overs, maidens, runs_conceded, wickets, source, verified, verified_by, verified_at)
  select mp.profile_id, p_match,
         case mp.team when 'a' then v_match.team_b else v_match.team_a end,
         v_match.format, v_match.starts_at::date,
         bat.runs, bat.balls, bat.fours, bat.sixes, bat.balls > 0 and not coalesce(bat.out, false),
         case when bowl.legal is null then null else floor(bowl.legal / 6) + (bowl.legal % 6) / 10.0 end,
         null, bowl.conceded, bowl.wickets,
         'live_scoring', true, auth.uid(), now()
  from public.match_players mp
  left join lateral (
    select sum(b.runs_bat)::int as runs,
           count(*) filter (where b.extra_type <> 'wide')::int as balls,
           count(*) filter (where b.runs_bat = 4)::int as fours,
           count(*) filter (where b.runs_bat = 6)::int as sixes,
           (select bool_or(true) from public.balls d where d.match_id = p_match and d.dismissed_id = mp.id) as out
    from public.balls b where b.match_id = p_match and b.striker_id = mp.id
  ) bat on true
  left join lateral (
    select nullif(count(*) filter (where b.extra_type not in ('wide', 'noball')), 0)::int as legal,
           sum(b.runs_bat + case when b.extra_type in ('wide', 'noball') then b.extra_runs else 0 end)::int as conceded,
           count(*) filter (where b.is_wicket and coalesce(b.wicket_kind, '') not in ('run out', 'retired'))::int as wickets
    from public.balls b where b.match_id = p_match and b.bowler_id = mp.id
  ) bowl on true
  where mp.match_id = p_match and mp.profile_id is not null
    and (coalesce(bat.balls, 0) > 0 or bowl.legal is not null);
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.org_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.balls enable row level security;
alter table public.performances enable row level security;
alter table public.posts enable row level security;
alter table public.post_endorsements enable row level security;
alter table public.post_comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.shortlists enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Public directory data: readable by any signed-in user.
create policy "read orgs" on public.organizations for select to authenticated using (true);
create policy "staff update org" on public.organizations for update to authenticated using (public.is_org_staff(id));

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "read org members" on public.org_members for select to authenticated using (true);
create policy "admins manage members" on public.org_members for all to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.member_role = 'admin'))
  with check (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.member_role = 'admin'));

-- Matches: anyone can follow; the scorer (or creator) writes.
create policy "read matches" on public.matches for select to authenticated using (true);
create policy "create matches" on public.matches for insert to authenticated with check (created_by = auth.uid());
create policy "scorer updates match" on public.matches for update to authenticated
  using (scorer_id = auth.uid() or created_by = auth.uid());
create policy "creator deletes scheduled match" on public.matches for delete to authenticated
  using (created_by = auth.uid() and status = 'scheduled');

create policy "read players" on public.match_players for select to authenticated using (true);
create policy "scorer manages players" on public.match_players for all to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and (m.scorer_id = auth.uid() or m.created_by = auth.uid())))
  with check (exists (select 1 from public.matches m where m.id = match_id and (m.scorer_id = auth.uid() or m.created_by = auth.uid())));

create policy "read balls" on public.balls for select to authenticated using (true);
create policy "scorer records balls" on public.balls for insert to authenticated
  with check (exists (select 1 from public.matches m where m.id = match_id and m.scorer_id = auth.uid() and m.status = 'live'));
create policy "scorer undoes balls" on public.balls for delete to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.scorer_id = auth.uid() and m.status = 'live'));

-- Performances: athletes add their own (unverified); verification happens via review_performance / complete_match.
create policy "read performances" on public.performances for select to authenticated using (true);
create policy "add own stats" on public.performances for insert to authenticated
  with check (athlete_id = auth.uid() and source = 'self' and verified = false and verified_by is null);
create policy "edit own unverified stats" on public.performances for update to authenticated
  using (athlete_id = auth.uid() and verified = false)
  with check (athlete_id = auth.uid() and verified = false and source = 'self');
create policy "delete own unverified stats" on public.performances for delete to authenticated
  using (athlete_id = auth.uid() and verified = false);

-- Feed
create policy "read posts" on public.posts for select to authenticated using (true);
create policy "write own posts" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "edit own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "read endorsements" on public.post_endorsements for select to authenticated using (true);
create policy "own endorsements" on public.post_endorsements for insert to authenticated with check (user_id = auth.uid());
create policy "remove own endorsements" on public.post_endorsements for delete to authenticated using (user_id = auth.uid());

create policy "read comments" on public.post_comments for select to authenticated using (true);
create policy "write comments" on public.post_comments for insert to authenticated with check (author_id = auth.uid());
create policy "delete own comments" on public.post_comments for delete to authenticated using (author_id = auth.uid());

create policy "own saved posts" on public.saved_posts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recruitment
create policy "read opportunities" on public.opportunities for select to authenticated using (true);
create policy "staff post opportunities" on public.opportunities for insert to authenticated
  with check (public.is_org_staff(org_id) and posted_by = auth.uid());
create policy "staff edit opportunities" on public.opportunities for update to authenticated using (public.is_org_staff(org_id));
create policy "staff delete opportunities" on public.opportunities for delete to authenticated using (public.is_org_staff(org_id));

create policy "applicant or org reads applications" on public.applications for select to authenticated
  using (applicant_id = auth.uid()
         or exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_org_staff(o.org_id)));
create policy "apply as self" on public.applications for insert to authenticated
  with check (applicant_id = auth.uid() and status = 'submitted'
              and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'open'));
create policy "org updates application status" on public.applications for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and public.is_org_staff(o.org_id)));
create policy "applicant withdraws" on public.applications for delete to authenticated using (applicant_id = auth.uid());

create policy "own shortlists" on public.shortlists for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own saved opportunities" on public.saved_opportunities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messaging
create policy "members read conversations" on public.conversations for select to authenticated using (public.is_conversation_member(id));
create policy "members read membership" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "update own read marker" on public.conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave conversation" on public.conversation_members for delete to authenticated using (user_id = auth.uid());
create policy "members read messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

-- Notifications
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.balls, public.matches, public.messages, public.notifications;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('media', 'media', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files go under a folder named after the uploader's user id: <uid>/<file>
create policy "upload own files" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'media', 'documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own files" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'media', 'documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'media', 'documents') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read public media" on storage.objects for select using (bucket_id in ('avatars', 'media'));
create policy "read own or applied documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.applications a
      join public.opportunities o on o.id = a.opportunity_id
      where a.document_path = storage.objects.name and public.is_org_staff(o.org_id)
    )
  ));
