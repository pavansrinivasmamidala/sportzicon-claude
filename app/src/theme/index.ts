import { Platform } from 'react-native';

/**
 * Sportzicon design tokens.
 * Orange #FA4D14 is the logo orange: use it on dark surfaces and for large shapes.
 * On light surfaces, buttons and links use `accent` (#D63F12), which keeps white text readable (WCAG AA).
 */
export const colors = {
  canvas: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EEE6',
  surfaceSunken: '#EDE7DD',
  border: '#E5DFD5',
  borderStrong: '#CBD5E1',
  divider: '#F1ECE4',

  ink: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#5B677A',
  inkFaint: '#94A3B8',

  dark: '#0F172A',
  dark2: '#1E293B',
  dark3: '#334155',
  onDark: '#F1F5F9',
  onDarkSecondary: '#CBD5E1',
  onDarkMuted: '#94A3B8',

  brand: '#FA4D14',
  accent: '#D63F12',
  accentPressed: '#B8360F',
  accentSoft: '#FFEDE5',
  accentTint: '#FFF4EE',
  accentInk: '#B8360F',

  live: '#DC2626',
  liveSoft: '#FEE2E2',
  verified: '#2563EB',
  verifiedSoft: '#DBEAFE',
  success: '#15803D',
  successSoft: '#DCFCE7',
  successInk: '#166534',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningInk: '#92400E',

  white: '#FFFFFF',
  scrim: 'rgba(15,23,42,0.6)',
} as const;

export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  heading: 'PlusJakartaSans_700Bold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 14, xl: 16, xxl: 24, pill: 999 } as const;

export const shadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
  default: { boxShadow: '0 4px 12px rgba(15,23,42,0.08)' },
}) as object;

/** Soft avatar color pairs, picked deterministically from a name. */
export const avatarPalette = [
  { bg: '#FFE4D6', fg: '#9A3412' },
  { bg: '#E2E8F0', fg: '#1E293B' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#DBEAFE', fg: '#1E40AF' },
  { bg: '#DCFCE7', fg: '#166534' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
] as const;
