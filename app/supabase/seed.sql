-- Starter content so a new project isn't empty: a few organizations and open opportunities.
-- People, posts and matches come from real sign-ups. Safe to skip in production.

insert into public.organizations (id, kind, name, city, about) values
  ('00000000-0000-4000-8000-000000000001', 'association', 'Konkan State Cricket Association', 'Mumbai', 'State association running age-group selection and district leagues.'),
  ('00000000-0000-4000-8000-000000000002', 'club', 'Royal Strikers Cricket Club', 'Pune', 'Competitive club side in the Western Zone T20 circuit.'),
  ('00000000-0000-4000-8000-000000000003', 'academy', 'Apex Cricket Academy', 'Mumbai', 'High-performance academy for U-14 to U-19 players.'),
  ('00000000-0000-4000-8000-000000000004', 'association', 'Western Zone Cricket Council', 'Ahmedabad', 'Organizes inter-academy tournaments across the zone.')
on conflict (id) do nothing;

insert into public.opportunities (org_id, type, title, description, city, venue, starts_at, deadline, age_group, fee_inr, compensation, vacancies, requirements) values
  ('00000000-0000-4000-8000-000000000001', 'trial', 'U-19 Fast Bowling Selection Camp',
   'Two-day selection camp for pace bowlers. Selected players join the state U-19 probables.',
   'Mumbai', 'BKC Ground', date_trunc('day', now()) + interval '9 days 9 hours', (current_date + 6), 'Under 19', 0, null, 30,
   array['Born on or after 1 Sep 2007', 'Bring your own whites and spikes', 'Verified bowling stats preferred']),
  ('00000000-0000-4000-8000-000000000003', 'trial', 'U-14 Batting Trial',
   'Open trial for top- and middle-order batters for the academy''s advanced batch.',
   'Mumbai', 'Apex Academy Nets', date_trunc('day', now()) + interval '14 days 9 hours', (current_date + 12), 'Under 14', 500, null, 12,
   array['Born on or after 1 Sep 2012', 'Full kit required']),
  ('00000000-0000-4000-8000-000000000002', 'job', 'Assistant Bowling Coach',
   'Work with the head coach on pace and spin programs for the senior and U-23 squads.',
   'Pune', null, null, (current_date + 16), null, null, '₹45,000 / month', 1,
   array['Level 1 coaching certification', '2+ years coaching experience']),
  ('00000000-0000-4000-8000-000000000002', 'job', 'Performance Analyst (Part-time)',
   'Match video tagging and player reports for the T20 season.',
   'Pune', null, null, (current_date + 20), null, null, '₹25,000 / month', 1,
   array['Comfortable with video analysis tools', 'Weekend availability']),
  ('00000000-0000-4000-8000-000000000004', 'tournament', 'Western Zone T20 Championship',
   'Inter-academy T20 tournament. 16 teams, league stage followed by knockouts.',
   'Ahmedabad', 'Motera B Ground', date_trunc('day', now()) + interval '50 days 9 hours', (current_date + 30), 'Under 19', 15000, null, 16,
   array['Registered academy or club', 'Squad of 15 with age proof']);
