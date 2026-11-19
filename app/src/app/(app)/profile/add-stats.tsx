import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Field, Segmented, Text, TopBar } from '@/components/ui';
import { useAddPerformance } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import { formatDobInput, parseDob } from '@/lib/cricket-options';
import { colors } from '@/theme';

const num = (s: string) => (s.trim() === '' ? null : Number(s));

export default function AddStats() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const add = useAddPerformance();
  const today = new Date();
  const [opponent, setOpponent] = useState('');
  const [format, setFormat] = useState<'T20' | 'One-day' | 'Multi-day'>('T20');
  const [date, setDate] = useState(`${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`);
  const [runs, setRuns] = useState('');
  const [balls, setBalls] = useState('');
  const [notOut, setNotOut] = useState(false);
  const [overs, setOvers] = useState('');
  const [conceded, setConceded] = useState('');
  const [wickets, setWickets] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const playedOn = parseDob(date);
    if (opponent.trim().length < 2) return setError('Enter the opponent.');
    if (!playedOn) return setError('Enter the match date as DD/MM/YYYY.');
    if (!runs && !overs) return setError('Add your batting or bowling figures.');
    if (overs && !/^\d+(\.[0-5])?$/.test(overs)) return setError('Overs look like 4 or 3.2.');
    try {
      await add.mutateAsync({
        opponent: opponent.trim(),
        format,
        played_on: playedOn,
        runs: num(runs),
        balls_faced: num(balls),
        not_out: notOut,
        overs: num(overs),
        runs_conceded: num(conceded),
        wickets: num(wickets),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="Add match stats" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card style={{ backgroundColor: colors.verifiedSoft, borderColor: colors.verifiedSoft }}>
            <Text variant="small" color="#1E40AF">
              {me.organization
                ? `${me.organization.name} will be asked to confirm these numbers. Once confirmed, they show a Verified badge.`
                : 'Link your academy in Edit profile so it can confirm these numbers and give them a Verified badge.'}
            </Text>
          </Card>
          <Field label="Opponent" value={opponent} onChangeText={setOpponent} placeholder="e.g. Coastal XI" />
          <View style={{ gap: 6 }}>
            <Text variant="smallStrong" style={{ fontSize: 14 }}>
              Format
            </Text>
            <Segmented
              options={[
                { value: 'T20', label: 'T20' },
                { value: 'One-day', label: 'One-day' },
                { value: 'Multi-day', label: 'Multi-day' },
              ]}
              value={format}
              onChange={setFormat}
            />
          </View>
          <Field label="Match date" value={date} onChangeText={(t) => setDate(formatDobInput(t))} keyboardType="number-pad" placeholder="DD/MM/YYYY" />

          <Text variant="overline" color={colors.inkSecondary} style={{ marginTop: 6 }}>
            Batting
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label="Runs" value={runs} onChangeText={setRuns} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Balls faced" value={balls} onChangeText={setBalls} keyboardType="number-pad" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Not out</Text>
            <Switch value={notOut} onValueChange={setNotOut} trackColor={{ true: colors.brand, false: colors.borderStrong }} thumbColor={colors.white} accessibilityLabel="Not out" />
          </View>

          <Text variant="overline" color={colors.inkSecondary} style={{ marginTop: 6 }}>
            Bowling
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label="Overs" value={overs} onChangeText={setOvers} keyboardType="decimal-pad" placeholder="4" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Runs given" value={conceded} onChangeText={setConceded} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Wickets" value={wickets} onChangeText={setWickets} keyboardType="number-pad" />
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {error ? (
            <Text variant="small" color={colors.live} style={{ marginBottom: 10 }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label="Save match" loading={add.isPending} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
