import type { Ball, ExtraType, Match, MatchPlayer } from './types';

/** Ball-by-ball cricket scoring engine. Everything is derived from the ball log, so undo = delete the last ball. */

export interface BatterLine {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal: string | null;
}

export interface BowlerLine {
  id: string;
  name: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
}

export interface InningsSummary {
  innings: 1 | 2;
  battingTeam: 'a' | 'b';
  bowlingTeam: 'a' | 'b';
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  batters: BatterLine[];
  bowlers: BowlerLine[];
  /** Balls bowled in the current (latest) over, including wides and no-balls. */
  thisOver: Ball[];
  /** Positions suggested by the log after the last ball (null = needs a new batter). */
  nextStriker: string | null;
  nextNonStriker: string | null;
  overJustCompleted: boolean;
  lastBowlerId: string | null;
  complete: boolean;
}

export interface Scoreboard {
  innings: InningsSummary[];
  current: InningsSummary;
  target: number | null;
  needRuns: number | null;
  ballsLeft: number | null;
  crr: number;
  rrr: number | null;
  matchOver: boolean;
  result: string | null;
}

export const isLegal = (b: Pick<Ball, 'extra_type'>) => b.extra_type !== 'wide' && b.extra_type !== 'noball';
export const ballTotal = (b: Pick<Ball, 'runs_bat' | 'extra_runs'>) => b.runs_bat + b.extra_runs;

export function oversText(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

/** Runs physically run between the wickets (decides strike rotation). */
function runsRan(b: Pick<Ball, 'runs_bat' | 'extra_type' | 'extra_runs'>) {
  switch (b.extra_type) {
    case 'wide':
      return Math.max(0, b.extra_runs - 1);
    case 'noball':
      return Math.max(0, b.extra_runs - 1) + (b.runs_bat === 4 || b.runs_bat === 6 ? 0 : b.runs_bat);
    case 'bye':
    case 'legbye':
      return b.extra_runs;
    default:
      return b.runs_bat === 4 || b.runs_bat === 6 ? 0 : b.runs_bat;
  }
}

/** Short label for a ball chip: "4", "W", "1wd", "nb", "2lb". */
export function ballLabel(b: Pick<Ball, 'runs_bat' | 'extra_type' | 'extra_runs' | 'is_wicket'>) {
  if (b.is_wicket) return 'W';
  const suffix: Record<ExtraType, string> = { none: '', wide: 'wd', noball: 'nb', bye: 'b', legbye: 'lb' };
  if (b.extra_type === 'none') return String(b.runs_bat);
  const n = b.extra_type === 'wide' || b.extra_type === 'noball' ? b.extra_runs - 1 + b.runs_bat : b.extra_runs;
  return `${n > 0 ? n : ''}${suffix[b.extra_type]}`;
}

export function battingTeamFor(match: Pick<Match, 'batting_first'>, innings: 1 | 2): 'a' | 'b' {
  if (innings === 1) return match.batting_first;
  return match.batting_first === 'a' ? 'b' : 'a';
}

export function teamName(match: Pick<Match, 'team_a' | 'team_b'>, team: 'a' | 'b') {
  return team === 'a' ? match.team_a : match.team_b;
}

function summarize(
  match: Match,
  players: MatchPlayer[],
  balls: Ball[],
  innings: 1 | 2,
  target: number | null,
): InningsSummary {
  const battingTeam = battingTeamFor(match, innings);
  const bowlingTeam = battingTeam === 'a' ? 'b' : 'a';
  const name = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Unknown';
  const squadSize = Math.max(2, players.filter((p) => p.team === battingTeam).length || 11);

  const batters = new Map<string, BatterLine>();
  const bowlers = new Map<string, BowlerLine>();
  const order: string[] = [];
  const bat = (id: string) => {
    if (!batters.has(id)) {
      batters.set(id, { id, name: name(id), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null });
      order.push(id);
    }
    return batters.get(id)!;
  };
  const bowl = (id: string) => {
    if (!bowlers.has(id)) bowlers.set(id, { id, name: name(id), legalBalls: 0, runs: 0, wickets: 0, maidens: 0 });
    return bowlers.get(id)!;
  };

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let extras = 0;
  let striker: string | null = null;
  let nonStriker: string | null = null;
  let overStart = 0;
  let overRuns = 0;
  let overJustCompleted = false;
  let lastBowlerId: string | null = null;

  const list = balls.filter((b) => b.innings === innings).sort((x, y) => x.seq - y.seq);
  list.forEach((b, i) => {
    striker = b.striker_id;
    nonStriker = b.non_striker_id;
    lastBowlerId = b.bowler_id;
    const s = bat(b.striker_id);
    if (b.non_striker_id) bat(b.non_striker_id);
    const bw = bowl(b.bowler_id);

    const total = ballTotal(b);
    runs += total;
    if (b.extra_type !== 'none') extras += b.extra_runs;
    s.runs += b.runs_bat;
    if (b.extra_type !== 'wide') s.balls += 1;
    if (b.runs_bat === 4) s.fours += 1;
    if (b.runs_bat === 6) s.sixes += 1;
    const bowlerRuns = b.runs_bat + (b.extra_type === 'wide' || b.extra_type === 'noball' ? b.extra_runs : 0);
    bw.runs += bowlerRuns;
    overRuns += bowlerRuns;

    if (runsRan(b) % 2 === 1) [striker, nonStriker] = [nonStriker, striker];

    if (b.is_wicket) {
      wickets += 1;
      const outId = b.dismissed_id ?? b.striker_id;
      const out = bat(outId);
      out.out = true;
      out.dismissal = b.wicket_kind ?? 'out';
      if (b.wicket_kind !== 'run out' && b.wicket_kind !== 'retired') bw.wickets += 1;
      if (striker === outId) striker = null;
      if (nonStriker === outId) nonStriker = null;
    }

    overJustCompleted = false;
    if (isLegal(b)) {
      legalBalls += 1;
      bw.legalBalls += 1;
      if (legalBalls % 6 === 0) {
        if (overRuns === 0) bw.maidens += 1;
        overRuns = 0;
        overStart = i + 1;
        overJustCompleted = true;
        [striker, nonStriker] = [nonStriker, striker];
      }
    }
  });

  const allOut = wickets >= squadSize - 1;
  const oversDone = legalBalls >= match.overs_limit * 6;
  const chased = target !== null && runs >= target;

  return {
    innings,
    battingTeam,
    bowlingTeam,
    runs,
    wickets,
    legalBalls,
    extras,
    batters: order.map((id) => batters.get(id)!),
    bowlers: [...bowlers.values()],
    thisOver: overJustCompleted ? list.slice(Math.max(0, list.length - 6 - countIllegalTail(list))) : list.slice(overStart),
    nextStriker: striker,
    nextNonStriker: nonStriker,
    overJustCompleted,
    lastBowlerId,
    complete: allOut || oversDone || chased,
  };
}

/** Number of illegal deliveries inside the last completed over (to show the full over in the strip). */
function countIllegalTail(list: Ball[]) {
  let legal = 0;
  let illegal = 0;
  for (let i = list.length - 1; i >= 0 && legal < 6; i--) {
    if (isLegal(list[i])) legal += 1;
    else illegal += 1;
  }
  return illegal;
}

export function buildScoreboard(match: Match, players: MatchPlayer[], balls: Ball[]): Scoreboard {
  const first = summarize(match, players, balls, 1, null);
  const target = first.complete || match.current_innings === 2 ? first.runs + 1 : null;
  const second = match.current_innings === 2 ? summarize(match, players, balls, 2, target) : null;
  const current = second ?? first;
  const innings = second ? [first, second] : [first];

  const crr = current.legalBalls ? (current.runs * 6) / current.legalBalls : 0;
  let needRuns: number | null = null;
  let ballsLeft: number | null = null;
  let rrr: number | null = null;
  if (second && target !== null) {
    needRuns = Math.max(0, target - second.runs);
    ballsLeft = Math.max(0, match.overs_limit * 6 - second.legalBalls);
    rrr = ballsLeft > 0 ? (needRuns * 6) / ballsLeft : null;
  }

  let result: string | null = null;
  const matchOver = !!second && second.complete;
  if (second && matchOver && target !== null) {
    const chasing = teamName(match, second.battingTeam);
    const defending = teamName(match, first.battingTeam);
    const squad = Math.max(2, players.filter((p) => p.team === second.battingTeam).length || 11);
    if (second.runs >= target) {
      // Cricket counts wickets in hand out of 10 (more only if a bigger squad was entered).
      const left = Math.max(10, squad - 1) - second.wickets;
      result = `${chasing} won by ${left} wicket${left === 1 ? '' : 's'}`;
    } else if (second.runs === target - 1) {
      result = 'Match tied';
    } else {
      const margin = target - 1 - second.runs;
      result = `${defending} won by ${margin} run${margin === 1 ? '' : 's'}`;
    }
  }

  return { innings, current, target, needRuns, ballsLeft, crr, rrr, matchOver, result };
}

export interface DeliveryInput {
  runsBat: number;
  extraType: ExtraType;
  /** Runs run on top of the penalty for wides/no-balls, or the bye/leg-bye runs. */
  extraRan: number;
  isWicket: boolean;
  wicketKind?: string;
  dismissedId?: string | null;
}

/** Converts a scorer's tap into the stored ball fields. */
export function toBallFields(input: DeliveryInput) {
  const penalty = input.extraType === 'wide' || input.extraType === 'noball' ? 1 : 0;
  return {
    runs_bat: input.extraType === 'wide' || input.extraType === 'bye' || input.extraType === 'legbye' ? 0 : input.runsBat,
    extra_type: input.extraType,
    extra_runs: input.extraType === 'none' ? 0 : penalty + input.extraRan,
    is_wicket: input.isWicket,
    wicket_kind: input.isWicket ? input.wicketKind ?? 'bowled' : null,
    dismissed_id: input.isWicket ? input.dismissedId ?? null : null,
  };
}

/** Auto commentary when the scorer doesn't type any. */
export function describeBall(b: Ball, players: MatchPlayer[]) {
  const name = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Unknown';
  const lead = `${name(b.bowler_id)} to ${name(b.striker_id)}`;
  if (b.is_wicket) {
    const who = name(b.dismissed_id ?? b.striker_id);
    return `${lead}, OUT! ${who} ${b.wicket_kind ?? 'out'}.`;
  }
  switch (b.extra_type) {
    case 'wide':
      return `${lead}, wide${b.extra_runs > 1 ? `, ${b.extra_runs - 1} run${b.extra_runs > 2 ? 's' : ''} taken` : ''}.`;
    case 'noball':
      return `${lead}, no-ball${b.runs_bat ? `, ${b.runs_bat} off the bat` : ''}. Free hit next.`;
    case 'bye':
      return `${lead}, ${b.extra_runs} bye${b.extra_runs === 1 ? '' : 's'}.`;
    case 'legbye':
      return `${lead}, ${b.extra_runs} leg bye${b.extra_runs === 1 ? '' : 's'}.`;
  }
  if (b.runs_bat === 6) return `${lead}, SIX!`;
  if (b.runs_bat === 4) return `${lead}, FOUR!`;
  if (b.runs_bat === 0) return `${lead}, no run.`;
  return `${lead}, ${b.runs_bat} run${b.runs_bat === 1 ? '' : 's'}.`;
}
