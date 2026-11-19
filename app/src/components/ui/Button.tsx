import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outlineDark';
type Size = 'lg' | 'md' | 'sm';

const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, pressed: colors.accentPressed, fg: colors.white },
  secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.ink, border: colors.borderStrong },
  dark: { bg: colors.dark, pressed: colors.dark2, fg: colors.white },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.accent },
  danger: { bg: colors.live, pressed: '#B91C1C', fg: colors.white },
  outlineDark: { bg: 'transparent', pressed: colors.dark2, fg: colors.onDark, border: colors.dark3 },
};

const heights: Record<Size, number> = { lg: 52, md: 46, sm: 38 };

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  loading,
  disabled,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          borderRadius: size === 'sm' ? radius.md : radius.lg,
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? 14 : 18,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={size === 'sm' ? 16 : 18} color={p.fg} strokeWidth={2} /> : null}
          <Text
            style={{ fontFamily: fonts.bodySemi, fontSize: size === 'sm' ? 14 : 16, color: p.fg }}
            numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  tone?: 'onDark' | 'onLight';
  badge?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** 44×44 icon-only button with an accessible label. */
export function IconButton({ icon: Icon, onPress, label, color, size = 22, tone = 'onLight', badge, style }: IconButtonProps) {
  const fg = color ?? (tone === 'onDark' ? colors.onDark : colors.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.icon,
        pressed && { backgroundColor: tone === 'onDark' ? 'rgba(148,163,184,0.18)' : colors.surfaceMuted },
        style,
      ]}>
      <Icon size={size} color={fg} strokeWidth={1.8} />
      {badge ? (
        <View style={[styles.badge, { borderColor: tone === 'onDark' ? colors.dark : colors.surface }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: colors.brand,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.ink },
});
