import { router } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, IconButton, Segmented, Text, TopBar } from '@/components/ui';
import { useCreateOpportunity } from '@/lib/api/opportunities';
import { useMe } from '@/lib/auth';
import { formatDobInput, parseDate } from '@/lib/cricket-options';
import type { OpportunityType } from '@/lib/types';
import { colors } from '@/theme';
import { goReplace } from '@/lib/nav';
import { notify } from '@/lib/dialog';

export default function NewOpportunity() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const create = useCreateOpportunity();
  const [type, setType] = useState<OpportunityType>('trial');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(me.organization?.city ?? me.city ?? '');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [fee, setFee] = useState('');
  const [pay, setPay] = useState('');
  const [spots, setSpots] = useState('');
  const [reqs, setReqs] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    setError(null);
    if (!me.org_id) return setError('Your account isn’t linked to an organization.');
    if (title.trim().length < 3) return setError('Add a title.');
    const deadlineIso = parseDate(deadline);
    if (!deadlineIso) return setError('Add an application deadline (DD/MM/YYYY).');
    const startIso = startDate ? parseDate(startDate) : null;
    if (startDate && !startIso) return setError('Start date should be DD/MM/YYYY.');
    try {
      const res = await create.mutateAsync({
        type,
        title: title.trim(),
        description: description.trim(),
        city: city.trim() || null,
        venue: venue.trim() || null,
        starts_at: startIso ? `${startIso}T09:00:00` : null,
        deadline: deadlineIso,
        age_group: ageGroup.trim() || null,
        fee_inr: type === 'job' ? null : fee ? Number(fee) : 0,
        compensation: type === 'job' ? pay.trim() || null : null,
        vacancies: spots ? Number(spots) : null,
        requirements: reqs.map((r) => r.trim()).filter(Boolean),
      });
      goReplace(`/opportunity/${res.id}`);
    } catch (e) {
      notify('Could not publish', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Post an opportunity" left={<IconButton icon={X} label="Cancel" tone="onDark" onPress={() => router.back()} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Segmented
            options={[
              { value: 'trial', label: 'Trial' },
              { value: 'job', label: 'Job' },
              { value: 'tournament', label: 'Tournament' },
            ]}
            value={type}
            onChange={setType}
          />
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'trial' ? 'e.g. U-19 Fast Bowling Selection Camp' : type === 'job' ? 'e.g. Assistant Bowling Coach' : 'e.g. Western Zone T20 Championship'}
          />
          <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What happens, who it’s for, what selected players get." />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label="City" value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Venue" optional value={venue} onChangeText={setVenue} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label={type === 'job' ? 'Start date' : 'Event date'} optional value={startDate} onChangeText={(t) => setStartDate(formatDobInput(t))} placeholder="DD/MM/YYYY" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Apply by" value={deadline} onChangeText={(t) => setDeadline(formatDobInput(t))} placeholder="DD/MM/YYYY" keyboardType="number-pad" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            {type !== 'job' ? (
              <View style={{ flex: 1 }}>
                <Field label="Age group" optional value={ageGroup} onChangeText={setAgeGroup} placeholder="Under 19" />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              {type === 'job' ? (
                <Field label="Pay" optional value={pay} onChangeText={setPay} placeholder="₹45,000 / month" />
              ) : (
                <Field label="Fee (₹)" optional value={fee} onChangeText={setFee} keyboardType="number-pad" placeholder="0 = free" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Field label={type === 'tournament' ? 'Teams' : 'Spots'} optional value={spots} onChangeText={setSpots} keyboardType="number-pad" />
            </View>
          </View>
          <Text variant="smallStrong" style={{ fontSize: 14 }}>
            Requirements
          </Text>
          {reqs.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={`Requirement ${i + 1}`}
                  value={r}
                  onChangeText={(t) => setReqs((all) => all.map((x, j) => (j === i ? t : x)))}
                  placeholder="e.g. Bring your own whites"
                />
              </View>
              {reqs.length > 1 ? (
                <IconButton icon={Trash2} label={`Remove requirement ${i + 1}`} color={colors.inkSecondary} onPress={() => setReqs((all) => all.filter((_, j) => j !== i))} style={{ marginTop: 22 }} />
              ) : null}
            </View>
          ))}
          <Pressable onPress={() => setReqs((all) => [...all, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }} accessibilityRole="button">
            <Plus size={16} color={colors.accent} />
            <Text variant="smallStrong" color={colors.accent} style={{ fontSize: 14 }}>
              Add requirement
            </Text>
          </Pressable>
        </ScrollView>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {error ? (
            <Text variant="small" color={colors.live} style={{ marginBottom: 10 }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label="Publish" loading={create.isPending} onPress={publish} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
