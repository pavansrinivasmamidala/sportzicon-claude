import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { goReplace } from '@/lib/nav';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { IconButton } from './Button';
import { Text } from './Text';

/** Dark slate app bar used at the top of every screen. */
export function TopBar({
  title,
  subtitle,
  back,
  onBack,
  left,
  right,
  large,
  fillLeft,
  children,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  left?: ReactNode;
  right?: ReactNode;
  /** Big screen title (tab roots) instead of a centered one. */
  large?: boolean;
  /** The `left` content stretches to fill the bar (e.g. a chat header with a name). */
  fillLeft?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : goReplace('/')));
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {back ? <IconButton icon={ChevronLeft} label="Back" tone="onDark" onPress={goBack} /> : null}
        {left}
        {title ? (
          <View style={[styles.titleBox, large ? { paddingLeft: back ? 0 : 10 } : styles.centered]}>
            <Text variant={large ? 'h1' : 'title'} color={colors.onDark} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color={colors.onDarkMuted} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : fillLeft ? null : (
          <View style={{ flex: 1 }} />
        )}
        <View style={styles.right}>{right}</View>
        {!large && back && !right ? <View style={{ width: 44 }} /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.dark },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 2 },
  titleBox: { flex: 1, minWidth: 0 },
  centered: { alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center' },
});
