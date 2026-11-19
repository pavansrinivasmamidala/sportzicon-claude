import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrgPicker } from '@/components/OrgPicker';
import { RolePicker } from '@/components/RolePicker';
import { Button, Field, IconButton, OptionSheet, SelectField, Text } from '@/components/ui';
import { useCreateOrganization } from '@/lib/api/people';
import { useAuth } from '@/lib/auth';
import { BATTING_STYLES, BOWLING_STYLES, formatDobInput, parseDob, PLAYING_ROLES } from '@/lib/cricket-options';
import { isOrgRole, orgKindForRole, roleLabels } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import { colors } from '@/theme';
import { confirm } from '@/lib/dialog';

type Step = 'role' | 'details' | 'academy';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { profile, session, refreshProfile, signOut } = useAuth();
  // People who signed up with email already chose their role on the sign-up screen, so skip asking again.
  const roleChosenAtSignUp = typeof session?.user.user_metadata?.role === 'string';
  const createOrg = useCreateOrganization();

  const [askRole, setAskRole] = useState(!roleChosenAtSignUp);
  const [step, setStep] = useState<Step>(roleChosenAtSignUp ? 'details' : 'role');
  const [role, setRole] = useState<UserRole>(profile?.role ?? 'athlete');
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [playingRole, setPlayingRole] = useState<string | null>(profile?.playing_role ?? null);
  const [batting, setBatting] = useState<string | null>(null);
  const [bowling, setBowling] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [headline, setHeadline] = useState('');
  const [orgName, setOrgName] = useState('');
  const [academy, setAcademy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'playing' | 'batting' | 'bowling' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: Step[] = [...(askRole ? (['role'] as Step[]) : []), 'details', ...(role === 'athlete' ? (['academy'] as Step[]) : [])];
  const index = steps.indexOf(step);
  // Step numbers continue from sign-up (role + account details = 2 steps).
  const offset = roleChosenAtSignUp && !askRole ? 2 : 0;
  const total = steps.length + offset;
  const isOrg = isOrgRole(role);

  const validateDetails = () => {
    if (name.trim().length < 2) return 'Enter your full name.';
    if (!city.trim()) return 'Enter your city.';
    if (role === 'athlete') {
      if (!playingRole) return 'Choose your playing role.';
      if (dob && !parseDob(dob)) return 'Enter your date of birth as DD/MM/YYYY.';
    }
    if (isOrg && orgName.trim().length < 2) return 'Enter your organization’s name.';
    return null;
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isOrg && !profile?.org_id) {
        await createOrg.mutateAsync({ kind: orgKindForRole[role]!, name: orgName.trim(), city: city.trim() });
        // Keep the new org id in context so a retry doesn't create a second organization.
        await refreshProfile();
      }
      const { error: e } = await supabase
        .from('profiles')
        .update({
          role,
          full_name: name.trim(),
          city: city.trim(),
          headline: headline.trim() || (isOrg ? `${roleLabels[role].split(' /')[0]} · ${orgName.trim()}` : null),
          playing_role: role === 'athlete' ? playingRole : null,
          batting_style: batting,
          bowling_style: bowling === 'Does not bowl' ? null : bowling,
          date_of_birth: role === 'athlete' ? parseDob(dob) : null,
          ...(role === 'athlete' ? { org_id: academy } : {}),
          onboarded: true,
        })
        .eq('id', profile!.id);
      if (e) throw new Error(e.message);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 'role') return setStep('details');
    if (step === 'details') {
      const v = validateDetails();
      if (v) return setError(v);
      setError(null);
      if (role === 'athlete') return setStep('academy');
      return finish();
    }
    return finish();
  };

  const back = async () => {
    if (index > 0) return setStep(steps[index - 1]);
    const yes = await confirm({
      title: 'Sign out?',
      message: 'You can finish setting up your profile next time you sign in.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay',
      destructive: true,
    });
    if (yes) signOut();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ backgroundColor: colors.dark, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 6 }}>
          <IconButton icon={ChevronLeft} tone="onDark" label="Back" onPress={back} />
          <Text variant="title" color={colors.onDark} style={{ flex: 1 }}>
            Set up your profile
          </Text>
          <Text variant="small" color={colors.onDarkMuted} style={{ paddingRight: 12 }}>
            Step {offset + index + 1} of {total}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= offset + index ? colors.brand : colors.dark3 }} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        {step === 'role' ? (
          <>
            <View style={{ gap: 6 }}>
              <Text variant="h1">How will you use Sportzicon?</Text>
              <Text color={colors.inkSecondary}>We’ll set up your home screen around your role.</Text>
            </View>
            <RolePicker value={role} onChange={setRole} />
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <View style={{ gap: 6 }}>
              <Text variant="h1">{isOrg ? 'Your organization' : 'About you'}</Text>
              <Text color={colors.inkSecondary}>
                {role === 'athlete' ? 'Scouts and academies search by these details.' : 'This appears on your profile.'}
              </Text>
              {!askRole ? (
                <Text variant="small" color={colors.inkMuted}>
                  Signing up as {roleLabels[role]}.{' '}
                  <Text
                    variant="smallStrong"
                    color={colors.accent}
                    accessibilityRole="button"
                    onPress={() => {
                      setAskRole(true);
                      setStep('role');
                    }}>
                    Change
                  </Text>
                </Text>
              ) : null}
            </View>
            <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            {isOrg ? (
              <Field
                label={role === 'coach' ? 'Academy name' : role === 'club' ? 'Club name' : 'Association or organizer name'}
                value={orgName}
                onChangeText={setOrgName}
                placeholder={role === 'coach' ? 'e.g. Apex Cricket Academy' : undefined}
              />
            ) : null}
            <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Mumbai" autoComplete="postal-address-locality" />
            {role === 'athlete' ? (
              <>
                <SelectField label="Playing role" value={playingRole} placeholder="Choose your role" onPress={() => setSheet('playing')} />
                <Field
                  label="Date of birth"
                  optional
                  value={dob}
                  onChangeText={(t) => setDob(formatDobInput(t))}
                  placeholder="DD/MM/YYYY"
                  keyboardType="number-pad"
                  hint="Used for age-group trials. Only your age is shown."
                />
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <SelectField label="Batting" optional value={batting} placeholder="Choose" onPress={() => setSheet('batting')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectField label="Bowling" optional value={bowling} placeholder="Choose" onPress={() => setSheet('bowling')} />
                  </View>
                </View>
              </>
            ) : null}
            {role === 'scout' || role === 'scorer' ? (
              <Field
                label="Headline"
                optional
                value={headline}
                onChangeText={setHeadline}
                placeholder={role === 'scout' ? 'e.g. Senior Scout · West Zone' : 'e.g. BCCI-certified scorer'}
              />
            ) : null}
          </>
        ) : null}

        {step === 'academy' ? (
          <>
            <View style={{ gap: 6 }}>
              <Text variant="h1">Your academy or club</Text>
              <Text color={colors.inkSecondary}>
                Your academy can confirm your match stats, which gives you a Verified badge. You can skip this.
              </Text>
            </View>
            <OrgPicker value={academy} onChange={setAcademy} />
          </>
        ) : null}

        {error ? (
          <Text variant="small" color={colors.live}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
        <Button
          label={step === 'role' ? `Continue as ${roleLabels[role].split(' /')[0]}` : index === steps.length - 1 ? 'Finish' : 'Continue'}
          loading={busy}
          onPress={next}
        />
        {step === 'academy' && !academy ? <Button label="Skip for now" variant="ghost" onPress={finish} disabled={busy} /> : null}
      </View>

      <OptionSheet visible={sheet === 'playing'} onClose={() => setSheet(null)} title="Playing role" options={PLAYING_ROLES} value={playingRole} onSelect={setPlayingRole} />
      <OptionSheet visible={sheet === 'batting'} onClose={() => setSheet(null)} title="Batting style" options={BATTING_STYLES} value={batting} onSelect={setBatting} />
      <OptionSheet visible={sheet === 'bowling'} onClose={() => setSheet(null)} title="Bowling style" options={BOWLING_STYLES} value={bowling} onSelect={setBowling} />
    </View>
  );
}
