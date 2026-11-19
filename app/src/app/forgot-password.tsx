import { router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useState } from 'react';

import { AuthShell } from '@/components/AuthShell';
import { Button, EmptyState, Field, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!email.includes('@')) return setError('Enter the email you signed up with.');
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (e) setError(e.message);
    else setSent(true);
  };

  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a link to choose a new one.">
      {sent ? (
        <EmptyState icon={MailCheck} title="Link sent" body={`If ${email} has an account, a reset link is on its way.`} actionLabel="Back to sign in" onAction={() => router.back()} />
      ) : (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
          {error ? (
            <Text variant="small" color={colors.live}>
              {error}
            </Text>
          ) : null}
          <Button label="Send reset link" loading={busy} onPress={send} />
          <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </AuthShell>
  );
}
