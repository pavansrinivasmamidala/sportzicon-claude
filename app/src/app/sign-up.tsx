import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RolePicker } from '@/components/RolePicker';
import { Button, EmptyState, Field, IconButton, Text } from '@/components/ui';
import { isOrgRole, roleLabels } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { colors } from '@/theme';

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 'check-email'>(1);
  const [role, setRole] = useState<UserRole | null>('athlete');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (!email.includes('@')) return setError('Enter a valid email.');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), role } },
    });
    setBusy(false);
    if (e) return setError(e.message);
    if (!data.session) setStep('check-email');
  };

  const progress = step === 1 ? 1 : 2;
  // Profile setup continues the count: details (+ academy for athletes).
  const totalSteps = role === 'athlete' ? 4 : 3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ backgroundColor: colors.dark, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 6 }}>
          <IconButton
            icon={ChevronLeft}
            tone="onDark"
            label="Back"
            onPress={() => (step === 2 ? setStep(1) : router.back())}
          />
          <Text variant="title" color={colors.onDark} style={{ flex: 1 }}>
            Create account
          </Text>
          {step !== 'check-email' ? (
            <Text variant="small" color={colors.onDarkMuted} style={{ paddingRight: 12 }}>
              Step {progress} of {totalSteps}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 }} accessibilityElementsHidden>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= progress ? colors.brand : colors.dark3 }} />
          ))}
        </View>
      </View>

      {step === 'check-email' ? (
        <EmptyState
          icon={MailCheck}
          title="Check your email"
          body={`We sent a confirmation link to ${email}. Open it on this phone to finish creating your account.`}
          actionLabel="Back to sign in"
          onAction={() => router.replace('/sign-in')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <View style={{ gap: 6 }}>
                  <Text variant="h1">How will you use Sportzicon?</Text>
                  <Text color={colors.inkSecondary}>We’ll set up your home screen around your role.</Text>
                </View>
                <RolePicker value={role} onChange={setRole} />
                <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 14 }}>
                  <Text variant="small" color={colors.inkSecondary}>
                    Academies, clubs and organizers are organization accounts. You can invite staff after sign-up.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={{ gap: 6 }}>
                  <Text variant="h1">Your details</Text>
                  <Text color={colors.inkSecondary}>
                    Signing up as {roleLabels[role ?? 'athlete']}.{isOrgRole(role) ? ' You’ll add your organization next.' : ''}
                  </Text>
                </View>
                <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="e.g. Rohan Verma" />
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!show}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  hint="At least 8 characters"
                  right={
                    <IconButton icon={show ? EyeOff : Eye} label={show ? 'Hide password' : 'Show password'} color={colors.inkSecondary} size={18} onPress={() => setShow(!show)} />
                  }
                />
                {error ? (
                  <Text variant="small" color={colors.live}>
                    {error}
                  </Text>
                ) : null}
              </>
            )}
          </ScrollView>
          <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
            {step === 1 ? (
              <Button label={`Continue as ${role ? roleLabels[role].split(' /')[0] : '…'}`} disabled={!role} onPress={() => setStep(2)} />
            ) : (
              <Button label="Create account" loading={busy} onPress={create} />
            )}
          </View>
        </>
      )}
    </View>
  );
}
