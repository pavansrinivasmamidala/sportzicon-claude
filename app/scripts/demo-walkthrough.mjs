/**
 * Creates three test accounts (athlete, academy, scorer) and runs the core flows
 * against the real Supabase project as those users, so row-level security is exercised too.
 *
 *   node scripts/demo-walkthrough.mjs
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY from .env.
 * Test credentials are generated once and kept in .env.test.local (git-ignored).
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readEnv = (file) =>
  fs.existsSync(file)
    ? Object.fromEntries(
        fs
          .readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .filter((l) => l && !l.startsWith('#') && l.includes('='))
          .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
      )
    : {};

const env = readEnv(path.join(root, '.env'));
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !KEY) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');

const credFile = path.join(root, '.env.test.local');
let creds = readEnv(credFile);
if (!creds.TEST_PASSWORD) {
  creds = {
    TEST_PASSWORD: `Sz-${randomBytes(9).toString('base64url')}`,
    TEST_ATHLETE_EMAIL: 'sz.test.athlete@example.com',
    TEST_ACADEMY_EMAIL: 'sz.test.academy@example.com',
    TEST_SCORER_EMAIL: 'sz.test.scorer@example.com',
  };
  fs.writeFileSync(
    credFile,
    '# Sportzicon test accounts (local only, git-ignored)\n' + Object.entries(creds).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
  );
}

const ok = (label, res) => {
  if (res?.error) throw new Error(`${label}: ${res.error.message}`);
  console.log(`  ✓ ${label}`);
  return res?.data;
};

async function account(email, meta) {
  const c = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let res = await c.auth.signInWithPassword({ email, password: creds.TEST_PASSWORD });
  if (res.error) {
    const up = await c.auth.signUp({ email, password: creds.TEST_PASSWORD, options: { data: meta } });
    if (up.error) throw new Error(`sign up ${email}: ${up.error.message}`);
    if (!up.data.session) throw new Error(`${email} needs email confirmation. Turn off "Confirm email" in Supabase Auth settings, then re-run.`);
    res = up;
    console.log(`  ✓ created ${meta.role} account`);
  } else console.log(`  ✓ signed in existing ${meta.role} account`);
  return { c, id: res.data.user.id };
}

console.log('Accounts');
const academy = await account(creds.TEST_ACADEMY_EMAIL, { full_name: 'Ramesh Pawar', role: 'coach' });
const athlete = await account(creds.TEST_ATHLETE_EMAIL, { full_name: 'Rohan Verma', role: 'athlete' });
const scorer = await account(creds.TEST_SCORER_EMAIL, { full_name: 'Priya Nair', role: 'scorer' });

console.log('Onboarding');
let { data: acadProfile } = await academy.c.from('profiles').select('org_id').eq('id', academy.id).single();
let orgId = acadProfile.org_id;
if (!orgId) orgId = ok('academy creates its organization', await academy.c.rpc('create_organization', { p_kind: 'academy', p_name: 'Apex Cricket Academy (Test)', p_city: 'Mumbai' }));
ok('academy profile', await academy.c.from('profiles').update({ city: 'Mumbai', headline: 'Head Coach · Apex Cricket Academy', onboarded: true }).eq('id', academy.id));
ok(
  'athlete profile, linked to the academy',
  await athlete.c
    .from('profiles')
    .update({ city: 'Mumbai', playing_role: 'Right-arm fast bowler', bowling_style: 'Right-arm fast', batting_style: 'Right-hand bat', date_of_birth: '2008-03-14', org_id: orgId, onboarded: true })
    .eq('id', athlete.id),
);
ok('scorer profile', await scorer.c.from('profiles').update({ city: 'Mumbai', headline: 'Official scorer · Konkan League', onboarded: true }).eq('id', scorer.id));

console.log('Recruitment');
const deadline = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
const opp = ok(
  'academy posts a trial',
  await academy.c
    .from('opportunities')
    .insert({
      org_id: orgId,
      posted_by: academy.id,
      type: 'trial',
      title: 'U-19 Pace Bowling Trial (Test)',
      description: 'Test listing created by the demo script.',
      city: 'Mumbai',
      deadline,
      age_group: 'Under 19',
      fee_inr: 0,
      vacancies: 20,
      requirements: ['Bring your own whites'],
    })
    .select('id')
    .single(),
);
const existing = await athlete.c.from('applications').select('id').eq('opportunity_id', opp.id).eq('applicant_id', athlete.id).maybeSingle();
const app = existing.data ?? ok('athlete applies', await athlete.c.from('applications').insert({ opportunity_id: opp.id, applicant_id: athlete.id, note: 'Available all week.' }).select('id').single());
ok('academy shortlists the athlete', await academy.c.from('applications').update({ status: 'shortlisted' }).eq('id', app.id));

console.log('Verification');
const perf = ok(
  'athlete adds self-reported stats',
  await athlete.c.from('performances').insert({ athlete_id: athlete.id, opponent: 'Harbour CC', format: 'One-day', played_on: '2026-11-05', overs: 8, runs_conceded: 33, wickets: 2 }).select('id').single(),
);
ok('academy verifies them', await academy.c.rpc('review_performance', { p_id: perf.id, p_approve: true }));

console.log('Feed & messages');
ok('athlete posts an update', await athlete.c.from('posts').insert({ author_id: athlete.id, body: 'Two wickets against Harbour CC today. Working on my outswinger next.' }));
const conv = ok('academy starts a chat with the athlete', await academy.c.rpc('start_conversation', { p_other: athlete.id }));
ok('academy sends a message', await academy.c.from('messages').insert({ conversation_id: conv, sender_id: academy.id, body: 'Great spell, Rohan. See you at the trial on Friday.' }));

console.log('Live scoring');
const match = ok(
  'scorer sets up a 2-over match',
  await scorer.c
    .from('matches')
    .insert({ created_by: scorer.id, scorer_id: scorer.id, team_a: 'Apex CA', team_b: 'Coastal XI', competition: 'Demo match', format: '2-over', overs_limit: 2, batting_first: 'b', status: 'scheduled' })
    .select('*')
    .single(),
);
const players = ok(
  'squads added (athlete linked)',
  await scorer.c
    .from('match_players')
    .insert([
      { match_id: match.id, team: 'a', name: 'Rohan Verma', profile_id: athlete.id, batting_order: 1 },
      { match_id: match.id, team: 'a', name: 'Kabir Shah', batting_order: 2 },
      { match_id: match.id, team: 'b', name: 'Arjun Rao', batting_order: 1 },
      { match_id: match.id, team: 'b', name: 'Dev Patil', batting_order: 2 },
      { match_id: match.id, team: 'b', name: 'Sahil Mehta', batting_order: 3 },
    ])
    .select('*'),
);
const pid = (n) => players.find((p) => p.name === n).id;
ok('match goes live', await scorer.c.from('matches').update({ status: 'live', striker_id: pid('Arjun Rao'), non_striker_id: pid('Dev Patil'), bowler_id: pid('Rohan Verma') }).eq('id', match.id));
// Rohan bowls: 0, 4, W (bowled Arjun), 1, 0, 2 → 1st over 7/1
const deliveries = [
  { s: 'Arjun Rao', ns: 'Dev Patil', runs_bat: 0 },
  { s: 'Arjun Rao', ns: 'Dev Patil', runs_bat: 4 },
  { s: 'Arjun Rao', ns: 'Dev Patil', runs_bat: 0, is_wicket: true, wicket_kind: 'bowled', dismissed: 'Arjun Rao' },
  { s: 'Sahil Mehta', ns: 'Dev Patil', runs_bat: 1 },
  { s: 'Dev Patil', ns: 'Sahil Mehta', runs_bat: 0 },
  { s: 'Dev Patil', ns: 'Sahil Mehta', runs_bat: 2 },
];
const rows = deliveries.map((d, i) => ({
  match_id: match.id,
  innings: 1,
  seq: i + 1,
  striker_id: pid(d.s),
  non_striker_id: pid(d.ns),
  bowler_id: pid('Rohan Verma'),
  runs_bat: d.runs_bat,
  is_wicket: !!d.is_wicket,
  wicket_kind: d.wicket_kind ?? null,
  dismissed_id: d.dismissed ? pid(d.dismissed) : null,
}));
ok('scorer records an over ball by ball', await scorer.c.from('balls').insert(rows));
ok('scorer completes the match', await scorer.c.rpc('complete_match', { p_match: match.id, p_result: 'Demo match: Coastal XI 7/1 (1 ov)' }));

console.log('Checks');
const { data: perfs } = await athlete.c.from('performances').select('opponent, wickets, runs_conceded, overs, verified, source').eq('athlete_id', athlete.id);
console.log('  athlete performances:', perfs);
const { data: notes } = await athlete.c.from('notifications').select('kind, title').order('created_at');
console.log('  athlete notifications:', notes.map((n) => `${n.kind}: ${n.title}`));
const { data: rls } = await scorer.c.from('applications').select('id');
console.log(`  scorer can see other people's applications: ${rls.length ? 'YES (problem)' : 'no (correct)'}`);
console.log('\nDone. Sign in with the emails in .env.test.local.');
