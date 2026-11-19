import type { OpportunityType, OrgKind, UserRole } from './types';

export const roleLabels: Record<UserRole, string> = {
  athlete: 'Athlete',
  coach: 'Coach / Academy',
  scout: 'Scout / Selector',
  club: 'Club / Franchise',
  organizer: 'Organizer / Association',
  scorer: 'Official Scorer',
};

/** Roles that act on behalf of an organization. */
export const orgRoles: UserRole[] = ['coach', 'club', 'organizer'];
export const isOrgRole = (role: UserRole | undefined | null) => !!role && orgRoles.includes(role);

export const orgKindForRole: Partial<Record<UserRole, OrgKind>> = {
  coach: 'academy',
  club: 'club',
  organizer: 'association',
};

export const orgKindLabels: Record<OrgKind, string> = {
  academy: 'Academy',
  club: 'Club',
  association: 'Association',
};

export const opportunityLabels: Record<OpportunityType, string> = {
  trial: 'Trial',
  job: 'Job',
  tournament: 'Tournament',
};

export function initials(name: string | null | undefined) {
  // Ignore words without letters, e.g. "(Test)" or "&".
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function hashIndex(text: string, mod: number) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % mod;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${shortDate(iso)}, ${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function clockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return shortDate(iso);
}

/** "Closes in 3 days", "Closes today", "Closed". */
export function deadlineText(deadline: string | null) {
  if (!deadline) return null;
  const end = new Date(`${deadline}T23:59:59`).getTime();
  const days = Math.ceil((end - Date.now()) / 86400000) - 1;
  if (end < Date.now()) return { text: 'Closed', urgent: false, closed: true };
  if (days <= 0) return { text: 'Closes today', urgent: true, closed: false };
  if (days <= 5) return { text: `Closes in ${days} day${days === 1 ? '' : 's'}`, urgent: true, closed: false };
  return { text: `Apply by ${shortDate(deadline)}`, urgent: false, closed: false };
}

export function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function money(inr: number | null) {
  if (inr === null || inr === undefined) return null;
  if (inr === 0) return 'Free';
  return `₹${inr.toLocaleString('en-IN')}`;
}

export function dayGroup(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() >= start) return 'Today';
  if (d.getTime() >= start - 86400000 * 6) return 'This week';
  return 'Earlier';
}
