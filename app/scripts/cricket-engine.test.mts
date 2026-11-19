// Scenario test for the ball-by-ball scoring engine. Run: node scripts/cricket-engine.test.mts
import { buildScoreboard, toBallFields, ballLabel } from '../src/lib/cricket.ts';
import assert from 'node:assert/strict';

const match: any = { id: 'm', team_a: 'Apex', team_b: 'Coastal', batting_first: 'a', overs_limit: 2, current_innings: 1, format: 'T20' };
const players: any[] = [
  ...['A1','A2','A3'].map((n,i)=>({ id:n, name:n, team:'a', match_id:'m', profile_id:null, batting_order:i })),
  ...['B1','B2','B3'].map((n,i)=>({ id:n, name:n, team:'b', match_id:'m', profile_id:null, batting_order:i })),
];
let balls: any[] = [];
let st = { s: 'A1', ns: 'A2', b: 'B1' };
const add = (inn: 1|2, input: any) => {
  const ball = { id: balls.length+1, match_id:'m', innings: inn, seq: balls.filter(x=>x.innings===inn).length+1, striker_id: st.s, non_striker_id: st.ns, bowler_id: st.b, ...toBallFields(input), created_at:'' };
  balls.push(ball);
  const sb = buildScoreboard({ ...match, current_innings: inn }, players, balls).current;
  st = { s: sb.nextStriker!, ns: sb.nextNonStriker!, b: sb.overJustCompleted ? null as any : st.b };
  return sb;
};
const R = (n: number) => ({ runsBat: n, extraType: 'none', extraRan: 0, isWicket: false });
// Over 1: 1, 4, wide+1, 0, 2, W(bowled), 6? (6 legal balls total)
add(1, R(1));                       // A2 on strike
assert.equal(st.s, 'A2');
add(1, R(4));                       // still A2
add(1, { runsBat: 0, extraType: 'wide', extraRan: 1, isWicket: false }); // 2 wides, ran 1 -> swap -> A1
assert.equal(st.s, 'A1');
add(1, R(0));
add(1, R(2));
let sb = add(1, { runsBat: 0, extraType: 'none', extraRan: 0, isWicket: true, wicketKind: 'bowled' }); // A1 out, end of over
assert.equal(sb.legalBalls, 5);
assert.equal(st.s, null as any); // striker slot empty -> needs new batter
st.s = 'A3';
sb = add(1, R(1)); // 6th legal ball, odd run swap then over-end swap -> A3 back on strike? 1 run: A3->nonstriker, A2 strike; over end swap -> A3 strike
assert.equal(sb.legalBalls, 6); assert.equal(sb.overJustCompleted, true); assert.equal(st.s, 'A3'); assert.equal(st.b, null);
assert.equal(sb.runs, 1+4+2+0+2+0+1); assert.equal(sb.wickets, 1); assert.equal(sb.extras, 2);
const b1 = sb.bowlers.find(b=>b.id==='B1')!; assert.equal(b1.runs, 10); assert.equal(b1.wickets, 1); assert.equal(b1.legalBalls, 6);
// Over 2 by B2: noball + 4 off bat, then all out (A2 caught, 2 wickets with 3 players => all out)
st.b = 'B2';
sb = add(1, { runsBat: 4, extraType: 'noball', extraRan: 0, isWicket: false });
assert.equal(sb.runs, 15); assert.equal(sb.legalBalls, 6);
sb = add(1, { runsBat: 0, extraType: 'none', extraRan: 0, isWicket: true, wicketKind: 'caught' });
assert.equal(sb.wickets, 2); assert.equal(sb.complete, true, 'all out with 3-player squad');
// Second innings chase of 16
match.current_innings = 2; st = { s: 'B1', ns: 'B2', b: 'A1' };
add(2, R(6)); add(2, R(6)); let full = buildScoreboard(match, players, balls);
assert.equal(full.target, 16); assert.equal(full.needRuns, 4);
add(2, R(4)); full = buildScoreboard(match, players, balls);
assert.equal(full.matchOver, true); assert.equal(full.result, 'Coastal won by 10 wickets');
assert.equal(ballLabel({ runs_bat:0, extra_type:'wide', extra_runs:2, is_wicket:false } as any), '1wd');
console.log('engine OK', full.result, full.innings.map(i=>`${i.runs}/${i.wickets}`));
