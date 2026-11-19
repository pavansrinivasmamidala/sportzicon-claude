import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';

import { Text } from './Text';

/** Underlined tab row. `tone="dark"` sits inside the dark top bar. */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  tone = 'light',
  scrollable,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: 'light' | 'dark';
  scrollable?: boolean;
}) {
  const items = tabs.map((t) => {
    const on = t.value === value;
    return (
      <Pressable
        key={t.value}
        onPress={() => onChange(t.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[styles.tab, !scrollable && { flex: 1 }, on && { borderBottomColor: colors.brand }]}>
        <Text
          style={{
            fontFamily: on ? fonts.bodySemi : fonts.bodyMedium,
            fontSize: 14,
            color: tone === 'dark' ? (on ? colors.white : colors.onDarkMuted) : on ? colors.ink : colors.inkMuted,
          }}>
          {t.label}
        </Text>
      </Pressable>
    );
  });
  const wrapStyle = [styles.wrap, tone === 'light' && styles.light];
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={wrapStyle}
        contentContainerStyle={{ gap: 18, paddingHorizontal: 16 }}
        accessibilityRole="tablist">
        {items}
      </ScrollView>
    );
  }
  return (
    <View style={[wrapStyle, { flexDirection: 'row', paddingHorizontal: 8 }]} accessibilityRole="tablist">
      {items}
    </View>
  );
}

/** Pill segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, on && styles.segOn]}>
            <Text style={{ fontFamily: on ? fonts.bodySemi : fonts.bodyMedium, fontSize: 13, color: on ? colors.ink : colors.inkSecondary }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0 },
  light: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 3 },
  segItem: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: {
    backgroundColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
