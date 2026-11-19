import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius } from '@/theme';

/** Dark brand hero with the logo, and a light sheet holding the form. */
export function AuthShell({ title, subtitle, children, top }: { title: string; subtitle?: string; children: ReactNode; top?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.dark }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          {top}
          <Image
            source={require('@/assets/brand/logo-lockup-light.png')}
            style={{ width: 156, height: 52 }}
            contentFit="contain"
            accessibilityLabel="Sportzicon"
          />
          <Text variant="h1" color={colors.onDark} style={{ marginTop: 12 }}>
            {title}
          </Text>
          {subtitle ? <Text color={colors.onDarkMuted}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text variant="small" color={colors.inkMuted}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  sheet: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 14,
  },
});
