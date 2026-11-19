import { Link, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell, OrDivider } from '@/components/AuthShell';
import { Button, Field, IconButton, Text } from '@/components/ui';
import { appleSignInAvailable, isCancel, signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { notify } from '@/lib/dialog';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.includes('@') || password.length < 6) {
      setError('Enter your email and password.');
      return;
    }
    setBusy('email');
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (e) setError(e.message === 'Invalid login credentials' ? 'That email and password don’t match. Try again or reset your password.' : e.message);
  };

  const social = async (provider: 'google' | 'apple') => {
    setError(null);
    setBusy(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (e) {
      if (!isCancel(e)) notify('Sign-in failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthShell title="Where talent gets seen." subtitle="The network for athletes, academies, scouts and teams.">
      {appleSignInAvailable ? (
        <Button label="Continue with Apple" variant="dark" loading={busy === 'apple'} onPress={() => social('apple')} />
      ) : null}
      <Button label="Continue with Google" variant="secondary" loading={busy === 'google'} onPress={() => social('google')} />
      <OrDivider label="or with email" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <View style={{ gap: 6 }}>
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!show}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          right={
            <IconButton icon={show ? EyeOff : Eye} label={show ? 'Hide password' : 'Show password'} color={colors.inkSecondary} size={18} onPress={() => setShow(!show)} />
          }
        />
        <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', paddingVertical: 6 }} accessibilityRole="link">
          <Text variant="smallStrong" color={colors.accent} style={{ fontSize: 14 }}>
            Forgot password?
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text variant="small" color={colors.live}>
          {error}
        </Text>
      ) : null}
      <Button label="Sign in" onPress={submit} loading={busy === 'email'} />
      <View style={{ flex: 1, minHeight: 16 }} />
      <Text center color={colors.inkSecondary}>
        New to Sportzicon?{' '}
        <Link href="/sign-up" style={{ color: colors.accent, fontFamily: 'Inter_600SemiBold' }}>
          Create an account
        </Link>
      </Text>
    </AuthShell>
  );
}
