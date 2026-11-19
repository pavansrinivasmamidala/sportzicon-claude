import { router } from 'expo-router';
import { Search, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Field, IconButton, Segmented, Sheet, Text, TopBar, VerifiedBadge } from '@/components/ui';
import { useCreateMatch } from '@/lib/api/matches';
import { useSearchPeople } from '@/lib/api/people';
import { colors, fonts, radius } from '@/theme';
import { goReplace } from '@/lib/nav';
import { notify } from '@/lib/dialog';

interface Player {
  name: string;
  profile_id: string | null;
}

function Squad({ label, team, players, setPlayers, onLink }: { label: string; team: string; players: Player[]; setPlayers: (p: Player[]) => void; onLink: () => void }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim();
    if (!n) return;
    setPlayers([...players, { name: n, profile_id: null }]);
    setName('');
  };
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="h3" style={{ fontSize: 16 }}>
          {team || label}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {players.length} player{players.length === 1 ? '' : 's'}
        </Text>
      </View>
      {players.map((p, i) => (
        <View key={`${p.name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text variant="caption" color={colors.inkMuted} numeric style={{ width: 18 }}>
            {i + 1}
          </Text>
          <Text style={{ flex: 1 }}>{p.name}</Text>
          {p.profile_id ? <VerifiedBadge size={14} /> : null}
          <IconButton icon={X} label={`Remove ${p.name}`} size={16} color={colors.inkSecondary} onPress={() => setPlayers(players.filter((_, j) => j !== i))} style={{ width: 36, height: 36 }} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder="Player name"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel={`Add player to ${team || label}`}
          style={{ flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
        />
        <Button label="Add" size="sm" variant="secondary" fullWidth={false} onPress={add} style={{ height: 44 }} />
      </View>
      <Pressable onPress={onLink} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }} accessibilityRole="button">
        <UserPlus size={16} color={colors.accent} />
        <Text variant="smallStrong" color={colors.accent} style={{ fontSize: 14, flex: 1 }}>
          Add a Sportzicon athlete (stats go to their profile)
        </Text>
      </Pressable>
    </Card>
  );
}

export default function NewMatch() {
  const insets = useSafeAreaInsets();
  const create = useCreateMatch();
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [competition, setCompetition] = useState('');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState<'T20' | 'One-day' | 'Custom'>('T20');
  const [customOvers, setCustomOvers] = useState('10');
  const [battingFirst, setBattingFirst] = useState<'a' | 'b'>('a');
  const [a, setA] = useState<Player[]>([]);
  const [b, setB] = useState<Player[]>([]);
  const [linkFor, setLinkFor] = useState<'a' | 'b' | null>(null);
  const [q, setQ] = useState('');
  const athletes = useSearchPeople({ text: q, role: 'athlete' });

  const overs = format === 'T20' ? 20 : format === 'One-day' ? 50 : Number(customOvers) || 0;

  const save = async () => {
    if (!teamA.trim() || !teamB.trim()) return notify('Add both team names');
    if (overs < 1 || overs > 50) return notify('Overs must be between 1 and 50');
    if (a.length < 2 || b.length < 2) return notify('Add at least two players per team', 'You can add more players while scoring.');
    try {
      const m = await create.mutateAsync({
        team_a: teamA.trim(),
        team_b: teamB.trim(),
        competition: competition.trim(),
        venue: venue.trim(),
        format: format === 'Custom' ? `${overs}-over` : format,
        overs_limit: overs,
        batting_first: battingFirst,
        players: [...a.map((p) => ({ ...p, team: 'a' as const })), ...b.map((p) => ({ ...p, team: 'b' as const }))],
      });
      goReplace(`/match/${m.id}/score`);
    } catch (e) {
      notify('Could not create match', e instanceof Error ? e.message : '');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar title="New match" left={<IconButton icon={X} label="Cancel" tone="onDark" onPress={() => router.back()} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label="Team A" value={teamA} onChangeText={setTeamA} placeholder="Apex CA" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Team B" value={teamB} onChangeText={setTeamB} placeholder="Coastal XI" />
            </View>
          </View>
          <Field label="Competition" optional value={competition} onChangeText={setCompetition} placeholder="Konkan U-19 League" />
          <Field label="Venue" optional value={venue} onChangeText={setVenue} />
          <View style={{ gap: 6 }}>
            <Text variant="smallStrong" style={{ fontSize: 14 }}>
              Format
            </Text>
            <Segmented
              options={[
                { value: 'T20', label: 'T20' },
                { value: 'One-day', label: 'One-day' },
                { value: 'Custom', label: 'Custom' },
              ]}
              value={format}
              onChange={setFormat}
            />
          </View>
          {format === 'Custom' ? <Field label="Overs per side" value={customOvers} onChangeText={setCustomOvers} keyboardType="number-pad" /> : null}
          <View style={{ gap: 6 }}>
            <Text variant="smallStrong" style={{ fontSize: 14 }}>
              Batting first
            </Text>
            <Segmented
              options={[
                { value: 'a', label: teamA || 'Team A' },
                { value: 'b', label: teamB || 'Team B' },
              ]}
              value={battingFirst}
              onChange={setBattingFirst}
            />
          </View>
          <Squad label="Team A" team={teamA} players={a} setPlayers={setA} onLink={() => setLinkFor('a')} />
          <Squad label="Team B" team={teamB} players={b} setPlayers={setB} onLink={() => setLinkFor('b')} />
        </ScrollView>
        <View style={{ padding: 20, paddingBottom: insets.bottom + 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button label="Create match" loading={create.isPending} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={!!linkFor} onClose={() => setLinkFor(null)} title="Add a Sportzicon athlete" subtitle="Their batting and bowling figures are added to their profile as verified stats when you complete the match.">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.inkMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search athletes" placeholderTextColor={colors.inkFaint} autoFocus accessibilityLabel="Search athletes" style={{ flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink }} />
        </View>
        {(athletes.data ?? []).slice(0, 15).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              const entry = { name: p.full_name, profile_id: p.id };
              if (linkFor === 'a') setA([...a, entry]);
              else setB([...b, entry]);
              setLinkFor(null);
              setQ('');
            }}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <Avatar name={p.full_name} url={p.avatar_url} size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{p.full_name}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {[p.playing_role, p.organization?.name].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
