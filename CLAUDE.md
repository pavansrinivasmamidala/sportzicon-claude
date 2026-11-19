# Sportzicon

Cricket-first sports network (athletes, academies/coaches, scouts, clubs, organizers, official scorers).
Native app built with Expo SDK 58 + Supabase. **Read `docs/HANDOVER.md` first**: it has the product decisions,
architecture, database, run/test/deploy steps, verified scope and open items.

## Layout
- `app/` — the Expo app (all commands below run from here). Also read `app/AGENTS.md` (Expo SDK 58 rules).
- `app/src/app` — Expo Router routes. Signed-in screens MUST live under `app/src/app/(app)/`.
- `app/src/lib/api` — React Query hooks per domain; `app/src/lib/cricket.ts` — pure scoring engine.
- `app/supabase/migrations` — schema + RLS (already applied to the live project; add new migrations, never edit applied ones).
- `brand/` — logo assets. Design canvas: https://claude.ai/artifact/97WxbKFCakdnKdxdxrDerz

## Commands (in `app/`)
- Run: `npx expo start` (w = web, a = Android). On this Windows PC's PowerShell use `npx.cmd`.
- Checks (run all before committing):
  - `npx tsc --noEmit`
  - `npx eslint src`
  - `node scripts/cricket-engine.test.mts`
  - `node scripts/api-smoke.mjs` (needs `.env` + `.env.test.local`; hits the live Supabase project)
- Deploy web: `npx expo export --platform web && npx eas-cli@latest deploy --prod`
- Android test build: `npx eas-cli@latest build -p android --profile preview`

## Conventions (each one fixes a real bug we hit)
- Dialogs: use `notify` / `confirm` / `chooseAction` from `src/lib/dialog.ts`. `Alert.alert` does nothing on web.
- Dynamic routes: `go(`/profile/${id}`)` from `src/lib/nav.ts` (typed routes reject template strings).
- Uploads: `uploadFile()` in `src/lib/upload.ts` (reads bytes with expo-file-system on native; `fetch(uri)` gives empty files on Android).
- Realtime: per-screen channel names need a unique suffix; notifications subscribe once in `(app)/_layout.tsx`.
- Supabase selects that embed `profiles`/`organizations` need FK hints (e.g. `profiles!posts_author_id_fkey`).
- RLS policies must not query their own table; use `security definer` helpers (`is_org_staff`, `is_org_admin`).
- Colors/fonts only from `src/theme`. White text on light screens uses `colors.accent` (#D63F12), not `brand`.
- Avoid `flex: 0` for sizing (collapses on web); give explicit widths.
- Install packages with `npx expo install`.

## Secrets
`app/.env` and `app/.env.test.local` are git-ignored; get them from the project owner. Never commit a Supabase
service-role key. Test account passwords live only in `.env.test.local`; don't print them.
