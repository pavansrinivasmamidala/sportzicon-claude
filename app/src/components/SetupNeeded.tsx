import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius } from '@/theme';

const steps = [
  'Create a free project at supabase.com.',
  'In the SQL editor, run supabase/migrations/20261119000000_init.sql, then supabase/seed.sql.',
  'Copy the project URL and publishable key (Project Settings → API).',
  'Create app/.env from .env.example and paste both values.',
  'Restart the dev server: npx expo start -c',
];

/** Shown in development until Supabase credentials are configured. */
export function SetupNeeded() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Image source={require('@/assets/brand/logo-lockup-light.png')} style={{ width: 168, height: 56 }} contentFit="contain" />
        <Text variant="h1" color={colors.onDark}>
          Connect your backend
        </Text>
        <Text color={colors.onDarkSecondary}>
          Sportzicon needs a Supabase project for sign-in, data and live scores. It takes about five minutes.
        </Text>
        <View style={{ backgroundColor: colors.dark2, borderRadius: radius.xl, padding: 16, gap: 14 }}>
          {steps.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="smallStrong" color={colors.ink}>
                  {i + 1}
                </Text>
              </View>
              <Text color={colors.onDark} style={{ flex: 1 }}>
                {s}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="small" color={colors.onDarkMuted}>
          Full instructions are in README.md.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
