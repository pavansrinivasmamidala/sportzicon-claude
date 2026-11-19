export const PLAYING_ROLES = [
  'Opening batter',
  'Top-order batter',
  'Middle-order batter',
  'Wicketkeeper-batter',
  'Batting all-rounder',
  'Bowling all-rounder',
  'Right-arm fast bowler',
  'Right-arm medium-pace bowler',
  'Left-arm fast bowler',
  'Off-spin bowler',
  'Leg-spin bowler',
  'Left-arm orthodox spinner',
].map((v) => ({ value: v, label: v }));

export const BATTING_STYLES = ['Right-hand bat', 'Left-hand bat'].map((v) => ({ value: v, label: v }));

export const BOWLING_STYLES = [
  'Right-arm fast',
  'Right-arm fast-medium',
  'Right-arm medium',
  'Right-arm off-break',
  'Right-arm leg-break',
  'Left-arm fast',
  'Left-arm medium',
  'Left-arm orthodox',
  'Left-arm wrist-spin',
  'Does not bowl',
].map((v) => ({ value: v, label: v }));

export const SKILLS_BOWLER = ['Pace', 'Accuracy', 'Swing', 'Stamina', 'Fielding'];
export const SKILLS_BATTER = ['Technique', 'Power', 'Shot range', 'Running', 'Fielding'];

export function skillsFor(playingRole: string | null) {
  return /bowler|spin/i.test(playingRole ?? '') ? SKILLS_BOWLER : SKILLS_BATTER;
}

/** "05/12/2026" → "2026-12-05" for any real calendar date (or null when invalid). */
export function parseDate(text: string) {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getMonth() !== Number(mo) - 1 || date.getFullYear() < 1940 || date.getFullYear() > 2100) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Like parseDate, but rejects dates in the future (birthdays, matches already played). */
export function parseDob(text: string) {
  const iso = parseDate(text);
  if (!iso || new Date(`${iso}T00:00:00`) > new Date()) return null;
  return iso;
}

export function formatDobInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function dobToInput(iso: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
