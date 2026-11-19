import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrgPicker } from '@/components/OrgPicker';
import { Avatar, Button, Field, OptionSheet, SelectField, Sheet, Text, TopBar } from '@/components/ui';
import { useUpdateProfile } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { BATTING_STYLES, BOWLING_STYLES, dobToInput, formatDobInput, parseDob, PLAYING_ROLES } from '@/lib/cricket-options';
import { pickMedia, publicUrl, uploadFile } from '@/lib/upload';
import { colors } from '@/theme';
import { notify } from '@/lib/dialog';

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const update = useUpdateProfile();
  const athlete = me.role === 'athlete';

  const [name, setName] = useState(me.full_name);
  const [headline, setHeadline] = useState(me.headline ?? '');
  const [city, setCity] = useState(me.city ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [playingRole, setPlayingRole] = useState(me.playing_role);
  const [batting, setBatting] = useState(me.batting_style);
  const [bowling, setBowling] = useState(me.bowling_style);
  const [dob, setDob] = useState(dobToInput(me.date_of_birth));
  const [open, setOpen] = useState(me.open_to_opportunities);
  const [orgId, setOrgId] = useState(me.org_id);
  const [avatar, setAvatar] = useState(me.avatar_url);
  const [sheet, setSheet] = useState<'playing' | 'batting' | 'bowling' | 'academy' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePhoto = async () => {
    const f = await pickMedia('image');
    if (!f) return;
    setUploading(true);
    try {
      setAvatar(publicUrl('avatars', await uploadFile('avatars', me.id, f)));
    } catch (e) {
      notify('Upload failed', e instanceof Error ? e.message : '');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (dob && !parseDob(dob)) return setError('Enter your date of birth as DD/MM/YYYY.');
    try {
      await update.mutateAsync({
        full_name: name.trim(),
        headline: headline.trim() || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatar,
        ...(athlete
          ? {
              playing_role: playingRole,
              batting_style: batting,
              bowling_style: bowling === 'Does not bowl' ? null : bowling,
              date_of_birth: parseDob(dob),
              open_to_opportunities: open,
              org_id: orgId,
            }
          : {}),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Edit profile" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={changePhoto} style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Avatar name={name} url={avatar} size={96} ring />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Camera size={16} color={colors.accent} />
              <Text variant="smallStrong" color={colors.accent}>
                {uploading ? 'Uploading…' : 'Change photo'}
              </Text>
            </View>
          </Pressable>
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field label="Headline" optional value={headline} onChangeText={setHeadline} placeholder={athlete ? 'e.g. Pace bowler · State U-19 probable' : 'e.g. Senior Scout · West Zone'} />
          <Field label="City" value={city} onChangeText={setCity} />
          {athlete ? (
            <>
              <SelectField label="Playing role" value={playingRole} placeholder="Choose" onPress={() => setSheet('playing')} />
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <SelectField label="Batting" value={batting} placeholder="Choose" onPress={() => setSheet('batting')} />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField label="Bowling" value={bowling} placeholder="Choose" onPress={() => setSheet('bowling')} />
                </View>
              </View>
              <Field label="Date of birth" value={dob} onChangeText={(t) => setDob(formatDobInput(t))} placeholder="DD/MM/YYYY" keyboardType="number-pad" />
              <SelectField label="Academy or club" value={orgId ? (orgId === me.org_id ? me.organization?.name : 'Selected') : null} placeholder="Not linked" onPress={() => setSheet('academy')} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">Open to trials and offers</Text>
                  <Text variant="small" color={colors.inkMuted}>
                    Shows a badge on your passport and in scout searches.
                  </Text>
                </View>
                <Switch value={open} onValueChange={setOpen} trackColor={{ true: colors.brand, false: colors.borderStrong }} thumbColor={colors.white} accessibilityLabel="Open to trials and offers" />
              </View>
            </>
          ) : null}
          <Field label="About" optional value={bio} onChangeText={setBio} multiline placeholder="Achievements, goals, what you’re looking for…" />
        </ScrollView>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {error ? (
            <Text variant="small" color={colors.live} style={{ marginBottom: 10 }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label="Save changes" loading={update.isPending} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <OptionSheet visible={sheet === 'playing'} onClose={() => setSheet(null)} title="Playing role" options={PLAYING_ROLES} value={playingRole} onSelect={setPlayingRole} />
      <OptionSheet visible={sheet === 'batting'} onClose={() => setSheet(null)} title="Batting style" options={BATTING_STYLES} value={batting} onSelect={setBatting} />
      <OptionSheet visible={sheet === 'bowling'} onClose={() => setSheet(null)} title="Bowling style" options={BOWLING_STYLES} value={bowling} onSelect={setBowling} />
      <Sheet visible={sheet === 'academy'} onClose={() => setSheet(null)} title="Academy or club" subtitle="Your academy confirms your self-reported stats.">
        <OrgPicker value={orgId} onChange={(v) => setOrgId(v)} />
      </Sheet>
    </View>
  );
}
