/**
 * Runs the same Supabase queries the app's screens use, as the three test accounts,
 * and reports any that fail (bad joins, missing permissions, wrong filters).
 *
 *   node scripts/api-smoke.mjs        (run demo-walkthrough.mjs first)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readEnv = (f) =>
  Object.fromEntries(
    fs
      .readFileSync(path.join(root, f), 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
const env = readEnv('.env');
const creds = readEnv('.env.test.local');

// Keep these in sync with src/lib/auth.tsx and src/lib/api/*.ts
const PROFILE_SELECT = '*, organization:organizations!profiles_org_id_fkey(id, name, kind, city)';
const POST_SELECT = `*,
  author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role, headline, playing_role,
    organization:organizations!profiles_org_id_fkey(name)),
  performance:performances(*),
  endorsement_count:post_endorsements(count),
  comment_count:post_comments(count)`;
const OPP_SELECT = '*, organization:organizations!opportunities_org_id_fkey(id, name, kind, city)';

async function as(email) {
  const c = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: creds.TEST_PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, id: data.user.id };
}

let failures = 0;
async function check(label, promise, expect) {
  const { data, error } = await promise;
  if (error) {
    failures++;
    console.log(`  ✗ ${label}: ${error.message}${error.hint ? ` (hint: ${error.hint})` : ''}`);
    return null;
  }
  const n = Array.isArray(data) ? data.length : data ? 1 : 0;
  const problem = expect ? expect(data) : null;
  if (problem) {
    failures++;
    console.log(`  ✗ ${label}: ${problem}`);
  } else console.log(`  ✓ ${label} (${n} row${n === 1 ? '' : 's'})`);
  return data;
}

const athlete = await as(creds.TEST_ATHLETE_EMAIL);
const academy = await as(creds.TEST_ACADEMY_EMAIL);
const scorer = await as(creds.TEST_SCORER_EMAIL);
const { data: acad } = await academy.c.from('profiles').select('org_id').eq('id', academy.id).single();
const orgId = acad.org_id;

console.log('Athlete screens');
const a = athlete.c;
await check('profile (auth context)', a.from('profiles').select(PROFILE_SELECT).eq('id', athlete.id).maybeSingle(), (d) => (!d?.organization ? 'organization not joined' : null));
const feed = await check('home feed', a.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(40), (d) => (d.length && d[0].endorsement_count?.[0]?.count === undefined ? 'counts missing' : null));
await check('my endorsements', a.from('post_endorsements').select('post_id').eq('user_id', athlete.id).in('post_id', (feed ?? []).map((p) => p.id)));
await check('my saved posts', a.from('saved_posts').select('post_id').eq('user_id', athlete.id).in('post_id', (feed ?? []).map((p) => p.id)));
if (feed?.[0]) await check('comments', a.from('post_comments').select('*, author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)').eq('post_id', feed[0].id).order('created_at'));
await check('performances', a.from('performances').select('*').eq('athlete_id', athlete.id).order('played_on', { ascending: false }), (d) => (d.length < 2 ? 'expected 2' : null));
await check('opportunities list', a.from('opportunities').select(OPP_SELECT).eq('status', 'open').order('deadline', { ascending: true, nullsFirst: false }).limit(60), (d) => (!d.length ? 'none' : null));
const t = 'bowl';
await check('opportunities search', a.from('opportunities').select(OPP_SELECT).eq('status', 'open').or(`title.ilike.%${t}%,city.ilike.%${t}%,description.ilike.%${t}%`));
const apps = await check('my applications', a.from('applications').select(`*, opportunity:opportunities(${OPP_SELECT})`).eq('applicant_id', athlete.id).order('created_at', { ascending: false }), (d) => (!d[0]?.opportunity?.organization ? 'opportunity/org not joined' : null));
if (apps?.[0]) await check('opportunity detail', a.from('opportunities').select(OPP_SELECT).eq('id', apps[0].opportunity_id).single());
await check('saved opportunities', a.from('saved_opportunities').select('opportunity_id').eq('user_id', athlete.id));
await check(
  'conversations',
  a
    .from('conversation_members')
    .select('last_read_at, conversation:conversations(*, conversation_members(user_id, profile:profiles(id, full_name, avatar_url, role, headline, playing_role)))')
    .eq('user_id', athlete.id),
  (d) => (!d.length ? 'expected a conversation' : d[0].conversation.conversation_members.length !== 2 ? 'other member not visible' : null),
);
const conv = (await a.from('conversation_members').select('conversation_id').eq('user_id', athlete.id).limit(1).single()).data;
if (conv) {
  await check('messages in thread', a.from('messages').select('*').eq('conversation_id', conv.conversation_id).order('created_at').limit(300), (d) => (!d.length ? 'no messages' : null));
  await check('thread header (other person)', a.from('conversation_members').select('user_id, profile:profiles(id, full_name, avatar_url, role, headline, playing_role)').eq('conversation_id', conv.conversation_id));
  await check('mark thread read', a.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conv.conversation_id).eq('user_id', athlete.id).select());
}
await check('notifications', a.from('notifications').select('*').eq('user_id', athlete.id).order('created_at', { ascending: false }).limit(100), (d) => (d.length < 3 ? 'expected 3+' : null));
await check('search athletes', a.from('profiles').select(PROFILE_SELECT).eq('onboarded', true).eq('role', 'athlete').or('full_name.ilike.%fast%,playing_role.ilike.%fast%,city.ilike.%fast%,headline.ilike.%fast%').order('full_name').limit(50), (d) => (!d.length ? 'Rohan not found for "fast"' : null));
await check('search with academy filter', a.from('profiles').select(PROFILE_SELECT).eq('onboarded', true).eq('role', 'athlete').not('org_id', 'is', null).eq('open_to_opportunities', true));
await check('search academies', a.from('organizations').select('*').eq('kind', 'academy').or('name.ilike.%apex%,city.ilike.%apex%').order('name'));
await check('org page roster', a.from('profiles').select(PROFILE_SELECT).eq('org_id', orgId).eq('role', 'athlete').order('full_name'));
await check('org page admin', a.from('org_members').select('user_id').eq('org_id', orgId).limit(1).maybeSingle());
await check('org page listings', a.from('opportunities').select(`${OPP_SELECT}, applications(status)`).eq('org_id', orgId).order('created_at', { ascending: false }));
await check('live matches', a.from('matches').select('*').eq('status', 'live').order('starts_at', { ascending: false }).limit(8));
const done = await check('recent results', a.from('matches').select('*, balls(count)').eq('status', 'completed').order('starts_at', { ascending: false }).limit(30), (d) => (!d.length ? 'expected the demo match' : null));
if (done?.[0]) {
  await check('match detail players', a.from('match_players').select('*').eq('match_id', done[0].id).order('batting_order'));
  await check('match detail balls', a.from('balls').select('*').eq('match_id', done[0].id).order('innings').order('seq'), (d) => (!d.length ? 'completed match has no balls' : null));
}

console.log('Academy screens');
const ac = academy.c;
const listings = await check('manage: listings with applicant counts', ac.from('opportunities').select(`${OPP_SELECT}, applications(status)`).eq('org_id', orgId).order('created_at', { ascending: false }), (d) => (!d.some((o) => o.applications.length) ? 'applications not visible to the academy' : null));
await check('manage: roster', ac.from('profiles').select(PROFILE_SELECT).eq('org_id', orgId).eq('role', 'athlete'), (d) => (!d.length ? 'Rohan missing from roster' : null));
await check(
  'manage: stats to verify',
  ac.from('performances').select('*, athlete:profiles!performances_athlete_id_fkey!inner(id, full_name, avatar_url, playing_role, org_id)').eq('verified', false).eq('athlete.org_id', orgId),
);
const withApps = listings?.find((o) => o.applications.length);
if (withApps) await check('applicants list', ac.from('applications').select(`*, applicant:profiles!applications_applicant_id_fkey(${PROFILE_SELECT})`).eq('opportunity_id', withApps.id), (d) => (!d.length ? 'no applicants visible' : !d[0].applicant?.organization ? 'applicant org not joined' : null));
await check('shortlist add', ac.from('shortlists').upsert({ owner_id: academy.id, athlete_id: athlete.id }).select());
await check('shortlist profiles', ac.from('shortlists').select(`athlete:profiles!shortlists_athlete_id_fkey(${PROFILE_SELECT})`).eq('owner_id', academy.id), (d) => (!d[0]?.athlete ? 'athlete not joined' : null));

console.log('Scorer screens');
await check('my matches', scorer.c.from('matches').select('*, balls(count)').or(`scorer_id.eq.${scorer.id},created_by.eq.${scorer.id}`).order('starts_at', { ascending: false }).limit(30), (d) => (!d.length ? 'none' : null));

console.log('Security');
const { error: e1 } = await a.from('opportunities').insert({ org_id: orgId, posted_by: athlete.id, type: 'trial', title: 'Should fail' });
console.log(e1 ? '  ✓ athlete blocked from posting opportunities' : (failures++, '  ✗ athlete could post an opportunity'));
const { error: e2 } = await a.from('performances').insert({ athlete_id: athlete.id, opponent: 'X', verified: true });
console.log(e2 ? '  ✓ athlete blocked from self-verifying stats' : (failures++, '  ✗ athlete could self-verify stats'));
const { data: peek } = await scorer.c.from('messages').select('id');
console.log(!peek?.length ? '  ✓ scorer cannot read others’ messages' : (failures++, '  ✗ scorer can read others’ messages'));

console.log(failures ? `\n${failures} problem(s) found.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
