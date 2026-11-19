import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { hashIndex, initials } from '@/lib/format';
import { avatarPalette, colors, fonts, radius } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export function Card({
  children,
  style,
  onPress,
  dark,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  dark?: boolean;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const base = [styles.card, dark && styles.cardDark, padded && { padding: 14 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }]}>
      {children}
    </Pressable>
  );
}

export function Avatar({
  name,
  url,
  size = 40,
  square,
  ring,
}: {
  name: string | null | undefined;
  url?: string | null;
  size?: number;
  square?: boolean;
  ring?: boolean;
}) {
  const pair = avatarPalette[hashIndex(name ?? '', avatarPalette.length)];
  const r = square ? Math.round(size * 0.25) : size / 2;
  const ringStyle = ring ? { borderWidth: 2, borderColor: colors.brand } : null;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[{ width: size, height: size, borderRadius: r, backgroundColor: pair.bg }, ringStyle]}
        contentFit="cover"
        accessibilityLabel={name ?? undefined}
      />
    );
  }
  return (
    <View
      accessibilityLabel={name ?? undefined}
      style={[{ width: size, height: size, borderRadius: r, backgroundColor: pair.bg }, styles.center, ringStyle]}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.34, color: pair.fg }}>{initials(name)}</Text>
    </View>
  );
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Verified" accessibilityRole="image">
      <Circle cx={12} cy={12} r={10} fill={colors.verified} />
      <Path d="m8 12.5 2.5 2.5L16 9.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LiveBadge() {
  return (
    <View style={styles.live}>
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

type TagTone = 'accent' | 'neutral' | 'success' | 'warning' | 'info' | 'dark' | 'brand';
const tagTones: Record<TagTone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentSoft, fg: colors.accentInk },
  neutral: { bg: colors.surfaceMuted, fg: '#334155' },
  success: { bg: colors.successSoft, fg: colors.successInk },
  warning: { bg: colors.warningSoft, fg: colors.warningInk },
  info: { bg: colors.verifiedSoft, fg: '#1E40AF' },
  dark: { bg: colors.dark2, fg: '#E2E8F0' },
  brand: { bg: colors.brand, fg: colors.ink },
};

export function Tag({ label, tone = 'neutral', style }: { label: string; tone?: TagTone; style?: StyleProp<ViewStyle> }) {
  const t = tagTones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: t.fg }}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon: Icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipOn,
        pressed && !selected && { backgroundColor: colors.surfaceMuted },
      ]}>
      {Icon ? <Icon size={15} color={selected ? colors.white : '#334155'} strokeWidth={2} /> : null}
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: selected ? colors.white : '#334155' }}>{label}</Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.divider }, style]} />;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="overline" color={colors.inkSecondary}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text variant="smallStrong" color={colors.accent}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={26} color={colors.accent} strokeWidth={1.8} />
      </View>
      <Text variant="h3" center>
        {title}
      </Text>
      {body ? (
        <Text variant="small" color={colors.inkSecondary} center style={{ maxWidth: 280 }}>
          {body}
        </Text>
      ) : null}
      {actionLabel ? <Button label={actionLabel} onPress={onAction} size="md" fullWidth={false} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

export function Loading({ dark }: { dark?: boolean }) {
  return (
    <View style={[styles.center, { flex: 1, padding: 32 }]}>
      <ActivityIndicator color={dark ? colors.brand : colors.accent} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { padding: 24, gap: 10 }]}>
      <Text variant="bodyStrong" center>
        Something went wrong
      </Text>
      <Text variant="small" color={colors.inkSecondary} center>
        {message}
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" size="sm" fullWidth={false} onPress={onRetry} /> : null}
    </View>
  );
}

export function Stat({ value, label, dark, highlight }: { value: string; label: string; dark?: boolean; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
      <Text variant="stat" color={highlight ? colors.brand : dark ? colors.onDark : colors.ink}>
        {value}
      </Text>
      <Text variant="caption" color={dark ? colors.onDarkMuted : colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl },
  cardDark: { backgroundColor: colors.dark, borderColor: colors.dark },
  live: { backgroundColor: colors.live, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.7, color: colors.white },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOn: { backgroundColor: colors.dark, borderColor: colors.dark },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
