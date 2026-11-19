# Sportzicon

*Where talent gets seen. Where the sports ecosystem gets built.*

A React Native (Expo SDK 58) app for cricket athletes, academies, scouts, clubs, organizers and official scorers, backed by Supabase.

## What's in v1

| Area | Screens |
| --- | --- |
| Sign-up & onboarding | Email/password, Google and Apple sign-in, role picker, role-specific profile setup, academy linking |
| Social | Home feed (posts, reels, photos, scorecards, endorse, comment, save, share), live-match strip, notifications |
| Athlete passport | Verified stats, skill ratings (by the athlete's academy), match history, posts, edit profile, add match stats |
| Recruitment | Trials, jobs and tournaments with search and filters, apply sheet with document upload, My applications, saved listings |
| Search | Athletes, scouts, scorers, academies, clubs, associations; shortlist athletes; message anyone |
| Messaging | Inbox, realtime 1:1 threads, quick replies, share profile or scorecards |
| Live scoring | Match setup with squads (link Sportzicon athletes), ball-by-ball console (runs, extras, wickets, undo, swap strike, innings change), realtime viewer with scorecard and commentary |
| Organizations | Manage dashboard, post opportunities, review applicants (shortlist / decline), verify athletes' stats, roster |

**Verification:** stats from a match scored live on Sportzicon are verified automatically when the scorer completes the match. Self-reported stats are confirmed by the athlete's academy or club.

## Set up the backend (about 5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/20261119000000_init.sql`: tables, security rules, triggers, storage buckets
   - `supabase/migrations/20261119010000_fix_org_members_policy.sql`: fixes the organization-members rule
   - `supabase/seed.sql`: optional starter organizations and opportunities
3. Copy `.env.example` to `.env` and fill in values from **Project Settings → API**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. Optional: **Authentication → Providers**
   - Turn off "Confirm email" while testing so new accounts can sign in right away.
   - Google: add a Google OAuth client and put `sportzicon://auth-callback` (and your web URL) under **URL Configuration → Redirect URLs**.
   - Apple: enable Apple and add the app's bundle id `com.sportzicon.app`.

## Run it

```bash
npm install
npx expo start
```

- Press `w` for the web preview, or scan the QR code with **Expo Go** on your phone.
- **Android emulator (Windows):** the Android SDK lives in `%LOCALAPPDATA%\Android\Sdk` and JDK 17 in `%LOCALAPPDATA%\Programs`.
  1. `powershell -ExecutionPolicy Bypass -File scripts\android-emulator.ps1` creates (first time) and boots the `Sportzicon_Pixel` emulator.
  2. In the same PowerShell, set `$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"` and run `npx expo start --android --port 8082`. Expo Go is installed automatically and the app opens.
- iOS Simulator needs a Mac. On Windows, test iOS with Expo Go on a real iPhone, or an EAS build.
- Sign in with Apple needs a development build on iOS (`npx expo run:ios` or an EAS build).

## Project layout

```
src/app/            Screens (Expo Router). (auth) = sign-in flow, (tabs) = main tabs
src/components/     UI kit (components/ui) and feature components
src/lib/api/        Supabase queries & mutations (TanStack Query), with realtime for chat, scoring and notifications
src/lib/cricket.ts  Ball-by-ball scoring engine (scoreboard is derived from the ball log, so undo = delete the last ball)
src/theme/          Colors, fonts, spacing
supabase/           SQL migration and seed
assets/brand/       Logo files (dark and light variants)
```

## Checks

```bash
npx tsc --noEmit
npx eslint src
```
