import { useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, Ellipsis, Undo2, UserPlus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BallChip } from '@/components/Scoreboard';
import { Button, Chip, IconButton, LiveBadge, Sheet, Text, TopBar } from '@/components/ui';
import { useMatchBundle, useScorer } from '@/lib/api/matches';
import { useMe } from '@/lib/auth';
import { buildScoreboard, oversText, teamName, toBallFields, type DeliveryInput } from '@/lib/cricket';
import type { Ball, ExtraType, MatchPlayer } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { goReplace } from '@/lib/nav';
import { ScreenState } from '@/components/ScreenState';
import { confirm, notify } from '@/lib/dialog';

type PickTarget = 'striker' | 'non_striker' | 'bowler';
const WICKET_KINDS = ['bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket'];
const SHOT_ZONES = ['Fine leg', 'Square leg', 'Mid-wicket', 'Long on', 'Long off', 'Cover', 'Point', 'Third man'];
const PITCH_ZONES = ['Yorker', 'Full', 'Good length', 'Short', 'Bouncer'];

export default function ScorerConsole() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const q = useMatchBundle(id);
  const { updateMatch, recordBall, undoBall, addPlayer, completeMatch } = useScorer(id);

  const [pick, setPick] = useState<PickTarget | null>(null);
  const [extra, setExtra] = useState<Exclude<ExtraType, 'none'> | null>(null);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [pending, setPending] = useState<DeliveryInput | null>(null);

  const sb = useMemo(() => (q.data ? buildScoreboard(q.data.match, q.data.players, q.data.balls) : null), [q.data]);

  if (q.isLoading) return <ScreenState />;
  if (q.error || !q.data || !sb) return <ScreenState error={q.error?.message ?? 'Match not found'} />;
  const { match, players, balls } = q.data;
  if (match.scorer_id !== me.id) return <ScreenState error="Only the match’s official scorer can open the scoring console." />;

  const cur = sb.current;
  const battingTeam = cur.battingTeam;
  const bowlingTeam = cur.bowlingTeam;
  const inningsBalls = balls.filter((b) => b.innings === match.current_innings).sort((a, b) => a.seq - b.seq);
  const lastBall = inningsBalls[inningsBalls.length - 1];
  const nameOf = (pid: string | null) => players.find((p) => p.id === pid)?.name ?? null;
  const striker = cur.batters.find((b) => b.id === match.striker_id);
  const nonStriker = cur.batters.find((b) => b.id === match.non_striker_id);
  const bowler = cur.bowlers.find((b) => b.id === match.bowler_id);
  const ready = !!match.striker_id && !!match.non_striker_id && !!match.bowler_id;
  const inningsDone = cur.complete;
  const canScore = match.status === 'live' && ready && !inningsDone;

  // ---- Recording -----------------------------------------------------------
  const commit = async (input: DeliveryInput, shot?: string | null, pitch?: string | null) => {
    if (!canScore) return;
    const fields = toBallFields(input);
    const seq = (lastBall?.seq ?? 0) + 1;
    const ball = {
      match_id: match.id,
      innings: match.current_innings,
      seq,
      striker_id: match.striker_id!,
      non_striker_id: match.non_striker_id,
      bowler_id: match.bowler_id!,
      ...fields,
      shot_zone: shot ?? null,
      pitch_zone: pitch ?? null,
      commentary: null,
    } as Omit<Ball, 'id' | 'created_at'>;
    // Work out who's on strike next from the log including this ball.
    const after = buildScoreboard(match, players, [...balls, { ...ball, id: -1, created_at: '' } as Ball]).current;
    try {
      await recordBall.mutateAsync(ball);
      await updateMatch.mutateAsync({
        striker_id: after.nextStriker,
        non_striker_id: after.nextNonStriker,
        bowler_id: after.overJustCompleted ? null : match.bowler_id,
      });
      if (!after.complete) {
        if (!after.nextStriker || !after.nextNonStriker) setPick(!after.nextStriker ? 'striker' : 'non_striker');
        else if (after.overJustCompleted) setPick('bowler');
      }
    } catch (e) {
      notify('Ball not saved', e instanceof Error ? e.message : 'Check your connection and try again.');
    }
  };

  const tap = (input: DeliveryInput) => {
    if (details && !input.isWicket) setPending(input);
    else commit(input);
  };

  const undo = () => {
    if (!lastBall) return;
    undoBall.mutate(lastBall.id, {
      onSuccess: () =>
        updateMatch.mutate({ striker_id: lastBall.striker_id, non_striker_id: lastBall.non_striker_id, bowler_id: lastBall.bowler_id }),
    });
  };

  const setPlayer = (target: PickTarget, p: MatchPlayer) => {
    updateMatch.mutate({ [`${target}_id`]: p.id } as never);
    setPick(null);
    // Continue setup in order: striker → non-striker → bowler.
    const next = { ...match, [`${target}_id`]: p.id };
    if (!next.striker_id) setTimeout(() => setPick('striker'), 250);
    else if (!next.non_striker_id) setTimeout(() => setPick('non_striker'), 250);
    else if (!next.bowler_id) setTimeout(() => setPick('bowler'), 250);
  };

  const startSecondInnings = () =>
    updateMatch.mutate(
      { current_innings: 2, striker_id: null, non_striker_id: null, bowler_id: null },
      { onSuccess: () => setTimeout(() => setPick('striker'), 300) },
    );

  const finish = async (result: string) => {
    const yes = await confirm({
      title: 'Complete this match?',
      message: `${result}\n\nStats for linked Sportzicon athletes are added to their profiles as verified. Scoring will be locked.`,
      confirmLabel: 'Complete',
    });
    if (!yes) return;
    try {
      await completeMatch.mutateAsync(result);
      goReplace(`/match/${match.id}`);
    } catch (e) {
      notify('Could not complete', e instanceof Error ? e.message : '');
    }
  };

  // ---- Eligibility for pickers -----------------------------------------------
  const pickTeam = pick === 'bowler' ? bowlingTeam : battingTeam;
  const outIds = new Set(cur.batters.filter((b) => b.out).map((b) => b.id));
  const eligible = players
    .filter((p) => p.team === pickTeam)
    .filter((p) => {
      if (pick === 'bowler') return !(cur.overJustCompleted && p.id === cur.lastBowlerId);
      return !outIds.has(p.id) && p.id !== match.striker_id && p.id !== match.non_striker_id;
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar
        left={<IconButton icon={X} label="Exit scorer" tone="onDark" onPress={() => goReplace(`/match/${match.id}`)} />}
        title={`${match.team_a} vs ${match.team_b}`}
        subtitle={`${match.format} · ${match.current_innings === 1 ? '1st' : '2nd'} innings`}
        right={
          <>
            {match.status === 'live' ? <LiveBadge /> : null}
            <IconButton icon={Ellipsis} label="More scoring options" tone="onDark" onPress={() => setMoreOpen(true)} />
          </>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Score */}
        <View style={{ backgroundColor: colors.dark2, paddingHorizontal: 18, paddingVertical: 14, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong" color={colors.onDarkSecondary} style={{ fontSize: 14 }}>
              {teamName(match, battingTeam)}
            </Text>
            <Text variant="small" color={colors.onDarkSecondary} numeric>
              CRR {sb.crr.toFixed(2)}
              {sb.rrr !== null ? ` · RRR ${sb.rrr.toFixed(2)}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text variant="statLg" color={colors.onDark}>
              {cur.runs}/{cur.wickets}
            </Text>
            <Text color={colors.onDarkSecondary} numeric>
              {oversText(cur.legalBalls)} / {match.overs_limit} ov
            </Text>
          </View>
          <Text variant="bodyStrong" color={colors.brand} style={{ fontSize: 14 }}>
            {sb.needRuns !== null && !sb.matchOver ? `Need ${sb.needRuns} runs off ${sb.ballsLeft} balls` : match.current_innings === 1 && sb.innings[0] ? `${teamName(match, battingTeam)} batting first` : ''}
          </Text>
        </View>

        {/* Batters & bowler */}
        <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Row head cols={['Batter', 'R', 'B', '4s', 'SR']} />
          <SlotRow
            label={striker?.name ?? nameOf(match.striker_id)}
            onStrike
            stats={striker ? [striker.runs, striker.balls, striker.fours, striker.balls ? ((striker.runs * 100) / striker.balls).toFixed(1) : '0.0'] : ['0', '0', '0', '0.0']}
            onPick={() => setPick('striker')}
            placeholder="Choose striker"
          />
          <SlotRow
            label={nonStriker?.name ?? nameOf(match.non_striker_id)}
            stats={nonStriker ? [nonStriker.runs, nonStriker.balls, nonStriker.fours, nonStriker.balls ? ((nonStriker.runs * 100) / nonStriker.balls).toFixed(1) : '0.0'] : ['0', '0', '0', '0.0']}
            onPick={() => setPick('non_striker')}
            placeholder="Choose non-striker"
          />
          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 4 }} />
          <Row head cols={['Bowler', 'O', 'R', 'W', 'Econ']} />
          <SlotRow
            label={bowler?.name ?? nameOf(match.bowler_id)}
            stats={bowler ? [oversText(bowler.legalBalls), bowler.runs, bowler.wickets, bowler.legalBalls ? ((bowler.runs * 6) / bowler.legalBalls).toFixed(2) : '0.00'] : ['0.0', '0', '0', '0.00']}
            onPick={() => setPick('bowler')}
            placeholder={inningsDone ? '—' : cur.overJustCompleted ? 'Choose next bowler' : 'Choose bowler'}
          />
        </View>

        {/* This over */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 }} accessibilityLabel="This over">
          <Text variant="smallStrong" color={colors.inkSecondary} style={{ marginRight: 4 }}>
            This over
          </Text>
          {cur.overJustCompleted ? null : cur.thisOver.map((b) => <BallChip key={b.id} b={b} size={32} />)}
          {Array.from({ length: Math.max(0, 6 - (cur.overJustCompleted ? 0 : cur.thisOver.filter((b) => b.extra_type !== 'wide' && b.extra_type !== 'noball').length)) }).map((_, i) => (
            <View key={i} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }} />
          ))}
        </View>

        {/* State banners */}
        {match.status === 'scheduled' ? (
          <Banner
            title="Ready to start"
            body={`${teamName(match, battingTeam)} bat first. Choose the opening batters and bowler, then start.`}
            action={ready ? 'Start match' : 'Choose openers'}
            onAction={() => (ready ? updateMatch.mutate({ status: 'live' }) : setPick(!match.striker_id ? 'striker' : !match.non_striker_id ? 'non_striker' : 'bowler'))}
          />
        ) : sb.matchOver && sb.result ? (
          <Banner title="Match over" body={sb.result} action="Complete match" onAction={() => finish(sb.result!)} />
        ) : inningsDone && match.current_innings === 1 ? (
          <Banner title="Innings complete" body={`${teamName(match, cur.bowlingTeam)} need ${cur.runs + 1} to win.`} action="Start 2nd innings" onAction={startSecondInnings} />
        ) : !ready ? (
          <Banner
            title={!lastBall ? 'Choose openers' : !match.bowler_id && match.striker_id && match.non_striker_id ? 'Over complete' : 'New batter needed'}
            body={!lastBall ? `${teamName(match, battingTeam)} are batting. Choose the opening batters and bowler.` : !match.bowler_id && match.striker_id && match.non_striker_id ? 'Choose who bowls the next over.' : 'Choose the incoming batter.'}
            action="Choose player"
            onAction={() => setPick(!match.striker_id ? 'striker' : !match.non_striker_id ? 'non_striker' : 'bowler')}
          />
        ) : null}

        {/* Run pad */}
        <View style={[styles.pad, !canScore && { opacity: 0.4 }]} pointerEvents={canScore ? 'auto' : 'none'} accessibilityLabel="Record delivery">
          {[0, 1, 2, 3].map((r) => (
            <Key key={r} label={String(r)} onPress={() => tap({ runsBat: r, extraType: 'none', extraRan: 0, isWicket: false })} />
          ))}
          <Key label="4" tone="boundary" onPress={() => tap({ runsBat: 4, extraType: 'none', extraRan: 0, isWicket: false })} />
          <Key label="6" tone="boundary" onPress={() => tap({ runsBat: 6, extraType: 'none', extraRan: 0, isWicket: false })} />
          <Key label="Wide" tone="extra" onPress={() => setExtra('wide')} />
          <Key label="No ball" tone="extra" onPress={() => setExtra('noball')} />
          <Key label="Bye" tone="extra" onPress={() => setExtra('bye')} />
          <Key label="Leg bye" tone="extra" onPress={() => setExtra('legbye')} />
          <Key label="Wicket" tone="wicket" wide onPress={() => setWicketOpen(true)} />
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>
              Add shot &amp; pitch details
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              Ask for direction and line/length after each ball
            </Text>
          </View>
          <Switch value={details} onValueChange={setDetails} trackColor={{ true: colors.brand, false: colors.borderStrong }} thumbColor={colors.white} accessibilityLabel="Add shot and pitch details" />
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button label="Undo" icon={Undo2} variant="secondary" size="md" style={{ flex: 1 }} disabled={!lastBall || match.status !== 'live'} onPress={undo} />
        <Button
          label="Swap strike"
          icon={ArrowLeftRight}
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          disabled={!match.striker_id || !match.non_striker_id}
          onPress={() => updateMatch.mutate({ striker_id: match.non_striker_id, non_striker_id: match.striker_id })}
        />
      </View>

      {/* Player picker */}
      <Sheet
        visible={!!pick}
        onClose={() => setPick(null)}
        title={pick === 'bowler' ? 'Who’s bowling?' : pick === 'striker' ? 'Batter on strike' : 'Non-striker'}
        subtitle={teamName(match, pickTeam)}>
        {eligible.map((p) => (
          <Pressable key={p.id} onPress={() => setPlayer(pick!, p)} accessibilityRole="button" style={({ pressed }) => [styles.pickRow, pressed && { backgroundColor: colors.surfaceMuted }]}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {p.name}
            </Text>
            {p.profile_id ? <Text variant="caption" color={colors.verified}>On Sportzicon</Text> : null}
          </Pressable>
        ))}
        <AddPlayerRow team={pickTeam} onAdd={(name) => addPlayer.mutate({ team: pickTeam, name })} />
      </Sheet>

      {/* Extras */}
      <Sheet
        visible={!!extra}
        onClose={() => setExtra(null)}
        title={extra === 'wide' ? 'Wide' : extra === 'noball' ? 'No ball' : extra === 'bye' ? 'Byes' : 'Leg byes'}
        subtitle={extra === 'noball' ? '1 run penalty. How many runs off the bat?' : extra === 'wide' ? '1 run penalty. Any extra runs taken?' : 'How many runs were taken?'}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(extra === 'noball' ? [0, 1, 2, 3, 4, 6] : extra === 'wide' ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]).map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                const e = extra!;
                setExtra(null);
                tap(e === 'noball' ? { runsBat: n, extraType: e, extraRan: 0, isWicket: false } : { runsBat: 0, extraType: e, extraRan: n, isWicket: false });
              }}
              accessibilityRole="button"
              accessibilityLabel={`${n} runs`}
              style={({ pressed }) => [styles.runChip, pressed && { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="stat">{extra === 'wide' ? `+${n}` : n}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      <WicketSheet
        visible={wicketOpen}
        onClose={() => setWicketOpen(false)}
        strikerName={striker?.name ?? nameOf(match.striker_id) ?? 'Striker'}
        nonStrikerName={nonStriker?.name ?? nameOf(match.non_striker_id) ?? 'Non-striker'}
        onConfirm={(kind, who, ran) => {
          setWicketOpen(false);
          commit({ runsBat: ran, extraType: 'none', extraRan: 0, isWicket: true, wicketKind: kind, dismissedId: who === 'non_striker' ? match.non_striker_id : match.striker_id });
        }}
      />

      <DetailsSheet
        visible={!!pending}
        onClose={() => setPending(null)}
        onSave={(shot, pitch) => {
          const p = pending!;
          setPending(null);
          commit(p, shot, pitch);
        }}
      />

      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="Scoring options">
        <Button
          label="Add a player"
          icon={UserPlus}
          variant="secondary"
          onPress={() => {
            setMoreOpen(false);
            setPick(match.striker_id && match.non_striker_id ? 'bowler' : 'striker');
          }}
        />
        {match.current_innings === 1 && match.status === 'live' ? (
          <Button
            label="End 1st innings now"
            variant="secondary"
            onPress={async () => {
              setMoreOpen(false);
              const yes = await confirm({ title: 'End the innings?', message: `${teamName(match, battingTeam)} finish on ${cur.runs}/${cur.wickets}.`, confirmLabel: 'End innings' });
              if (yes) startSecondInnings();
            }}
          />
        ) : null}
        {match.status === 'live' ? (
          <Button
            label="Complete match now"
            variant="danger"
            onPress={() => {
              setMoreOpen(false);
              finish(sb.result ?? 'No result');
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function Row({ cols, head }: { cols: string[]; head?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      {cols.map((c, i) => (
        <Text key={c} variant="caption" color={head ? colors.inkMuted : colors.ink} style={i === 0 ? { flex: 1 } : { width: i === cols.length - 1 ? 52 : 40, textAlign: 'right' }}>
          {c}
        </Text>
      ))}
    </View>
  );
}

function SlotRow({ label, stats, onPick, placeholder, onStrike }: { label: string | null; stats: (string | number)[]; onPick: () => void; placeholder: string; onStrike?: boolean }) {
  return (
    <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel={label ? `${label}. Tap to change` : placeholder} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
      <Text variant={onStrike ? 'bodyStrong' : 'body'} color={label ? colors.ink : colors.accent} style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
        {label ?? placeholder}
        {label && onStrike ? <Text color={colors.brand}> ●</Text> : null}
      </Text>
      {stats.map((s, i) => (
        <Text key={i} numeric variant="small" style={{ width: i === stats.length - 1 ? 52 : 40, textAlign: 'right', fontFamily: i === 0 ? fonts.bodySemi : fonts.body }}>
          {s}
        </Text>
      ))}
    </Pressable>
  );
}

function Banner({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <View style={{ margin: 16, marginBottom: 0, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.brand, borderRadius: radius.lg, padding: 14, gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color={colors.inkSecondary}>
          {body}
        </Text>
      </View>
      <Button label={action} size="md" onPress={onAction} />
    </View>
  );
}

function Key({ label, onPress, tone, wide }: { label: string; onPress: () => void; tone?: 'boundary' | 'extra' | 'wicket'; wide?: boolean }) {
  const bg = tone === 'boundary' ? colors.brand : tone === 'wicket' ? colors.live : tone === 'extra' ? colors.surfaceMuted : colors.surface;
  const fg = tone === 'wicket' ? colors.white : colors.ink;
  const big = !tone || tone === 'boundary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={big ? `${label} run${label === '1' ? '' : 's'}` : label}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: bg, borderColor: tone === 'boundary' ? colors.brand : tone === 'wicket' ? colors.live : colors.border, width: wide ? '48.5%' : '23.3%' },
        pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
      ]}>
      <Text style={{ fontFamily: big ? fonts.display : fonts.bodySemi, fontSize: big ? 24 : 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

function AddPlayerRow({ team, onAdd }: { team: 'a' | 'b'; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Add a player to this team"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel={`Add a player to team ${team.toUpperCase()}`}
        style={{ flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
      />
      <Button
        label="Add"
        size="sm"
        variant="secondary"
        fullWidth={false}
        style={{ height: 44 }}
        onPress={() => {
          if (name.trim()) onAdd(name.trim());
          setName('');
        }}
      />
    </View>
  );
}

function WicketSheet({
  visible,
  onClose,
  strikerName,
  nonStrikerName,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  strikerName: string;
  nonStrikerName: string;
  onConfirm: (kind: string, who: 'striker' | 'non_striker', ran: number) => void;
}) {
  const [kind, setKind] = useState('bowled');
  const [who, setWho] = useState<'striker' | 'non_striker'>('striker');
  const [ran, setRan] = useState(0);
  const runOut = kind === 'run out';
  return (
    <Sheet visible={visible} onClose={onClose} title="Wicket" footer={<Button label="Record wicket" variant="danger" onPress={() => onConfirm(kind, runOut ? who : 'striker', runOut ? ran : 0)} />}>
      <Text variant="smallStrong">How out?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {WICKET_KINDS.map((k) => (
          <Chip key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      {runOut ? (
        <>
          <Text variant="smallStrong">Who’s out?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={strikerName} selected={who === 'striker'} onPress={() => setWho('striker')} />
            <Chip label={nonStrikerName} selected={who === 'non_striker'} onPress={() => setWho('non_striker')} />
          </View>
          <Text variant="smallStrong">Runs completed before the run out</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2, 3].map((n) => (
              <Chip key={n} label={String(n)} selected={ran === n} onPress={() => setRan(n)} />
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function DetailsSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (shot: string | null, pitch: string | null) => void }) {
  const [shot, setShot] = useState<string | null>(null);
  const [pitch, setPitch] = useState<string | null>(null);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Ball details"
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Skip" variant="secondary" style={{ flex: 1 }} onPress={() => onSave(null, null)} />
          <Button
            label="Record ball"
            style={{ flex: 2 }}
            onPress={() => {
              onSave(shot, pitch);
              setShot(null);
              setPitch(null);
            }}
          />
        </View>
      }>
      <Text variant="smallStrong">Shot direction</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SHOT_ZONES.map((z) => (
          <Chip key={z} label={z} selected={shot === z} onPress={() => setShot(shot === z ? null : z)} />
        ))}
      </View>
      <Text variant="smallStrong">Length</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PITCH_ZONES.map((z) => (
          <Chip key={z} label={z} selected={pitch === z} onPress={() => setPitch(pitch === z ? null : z)} />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14, justifyContent: 'space-between' },
  key: { height: 60, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider },
  runChip: { width: 60, height: 60, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
