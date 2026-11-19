import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { Ball, Match, MatchPlayer } from '../types';

export interface MatchBundle {
  match: Match;
  players: MatchPlayer[];
  balls: Ball[];
}

export function useMatches(status: 'live' | 'scheduled' | 'completed' | 'mine') {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['matches', status],
    queryFn: async () => {
      let q = supabase.from('matches').select('*, balls(count)').order('starts_at', { ascending: false }).limit(30);
      if (status === 'mine') q = q.or(`scorer_id.eq.${session!.user.id},created_by.eq.${session!.user.id}`);
      else q = q.eq('status', status);
      return unwrap(await q) as unknown as (Match & { balls: { count: number }[] })[];
    },
  });
}

/** Live matches with their ball logs (for feed cards). */
export function useLiveMatchCards() {
  return useQuery({
    queryKey: ['live-cards'],
    refetchInterval: 20000,
    queryFn: async () => {
      const matches = unwrap(
        await supabase.from('matches').select('*').eq('status', 'live').order('starts_at', { ascending: false }).limit(8),
      ) as Match[];
      if (!matches.length) return [] as MatchBundle[];
      const ids = matches.map((m) => m.id);
      const [players, balls] = await Promise.all([
        supabase.from('match_players').select('*').in('match_id', ids),
        supabase.from('balls').select('*').in('match_id', ids).order('seq'),
      ]);
      return matches.map((m) => ({
        match: m,
        players: ((players.data ?? []) as MatchPlayer[]).filter((p) => p.match_id === m.id),
        balls: ((balls.data ?? []) as Ball[]).filter((b) => b.match_id === m.id),
      }));
    },
  });
}

/** Full match with realtime updates of balls and match state. */
export function useMatchBundle(id: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['match', id],
    queryFn: async (): Promise<MatchBundle> => {
      const [m, p, b] = await Promise.all([
        supabase.from('matches').select('*').eq('id', id).single(),
        supabase.from('match_players').select('*').eq('match_id', id).order('batting_order'),
        supabase.from('balls').select('*').eq('match_id', id).order('innings').order('seq'),
      ]);
      return { match: unwrap(m) as Match, players: unwrap(p) as MatchPlayer[], balls: unwrap(b) as Ball[] };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`match:${id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balls', filter: `match_id=eq.${id}` }, (payload) => {
        qc.setQueryData<MatchBundle>(['match', id], (old) => {
          if (!old) return old;
          if (payload.eventType === 'INSERT') {
            const nb = payload.new as Ball;
            if (old.balls.some((x) => x.id === nb.id)) return old;
            return { ...old, balls: [...old.balls.filter((x) => x.id > 0), nb] };
          }
          if (payload.eventType === 'DELETE') {
            const gone = (payload.old as Partial<Ball>).id;
            return { ...old, balls: old.balls.filter((x) => x.id !== gone) };
          }
          return old;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, (payload) => {
        qc.setQueryData<MatchBundle>(['match', id], (old) => (old ? { ...old, match: { ...old.match, ...(payload.new as Match) } } : old));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return query;
}

export interface NewMatchInput {
  team_a: string;
  team_b: string;
  competition: string;
  venue: string;
  format: string;
  overs_limit: number;
  batting_first: 'a' | 'b';
  players: { team: 'a' | 'b'; name: string; profile_id: string | null }[];
}

export function useCreateMatch() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: NewMatchInput) => {
      const me = session!.user.id;
      const { players, ...rest } = input;
      const match = unwrap(
        await supabase
          .from('matches')
          .insert({ ...rest, created_by: me, scorer_id: me, status: 'scheduled' })
          .select('*')
          .single(),
      ) as Match;
      if (players.length) {
        const order = { a: 0, b: 0 };
        unwrap(
          await supabase.from('match_players').insert(
            players.map((p) => ({ ...p, match_id: match.id, batting_order: ++order[p.team] })),
          ),
        );
      }
      return match;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });
}

/** Scorer actions. All writes are small; the UI updates optimistically from the ball log. */
export function useScorer(id: string) {
  const qc = useQueryClient();
  const set = (fn: (b: MatchBundle) => MatchBundle) =>
    qc.setQueryData<MatchBundle>(['match', id], (old) => (old ? fn(old) : old));

  const updateMatch = useMutation({
    mutationFn: async (patch: Partial<Match>) => unwrap(await supabase.from('matches').update(patch).eq('id', id)),
    onMutate: (patch) => set((b) => ({ ...b, match: { ...b.match, ...patch } })),
    onError: () => qc.invalidateQueries({ queryKey: ['match', id] }),
  });

  const recordBall = useMutation({
    mutationFn: async (ball: Omit<Ball, 'id' | 'created_at'>) =>
      unwrap(await supabase.from('balls').insert(ball).select('*').single()) as Ball,
    onMutate: (ball) =>
      set((b) => ({ ...b, balls: [...b.balls, { ...ball, id: -Date.now(), created_at: new Date().toISOString() } as Ball] })),
    onSuccess: (saved) =>
      set((b) => ({ ...b, balls: [...b.balls.filter((x) => x.id > 0 && x.id !== saved.id), saved].sort((x, y) => x.innings - y.innings || x.seq - y.seq) })),
    onError: () => qc.invalidateQueries({ queryKey: ['match', id] }),
  });

  const undoBall = useMutation({
    mutationFn: async (ballId: number) => unwrap(await supabase.from('balls').delete().eq('id', ballId)),
    onMutate: (ballId) => set((b) => ({ ...b, balls: b.balls.filter((x) => x.id !== ballId) })),
    onError: () => qc.invalidateQueries({ queryKey: ['match', id] }),
  });

  const addPlayer = useMutation({
    mutationFn: async (p: { team: 'a' | 'b'; name: string }) => {
      const bundle = qc.getQueryData<MatchBundle>(['match', id]);
      const order = (bundle?.players.filter((x) => x.team === p.team).length ?? 0) + 1;
      return unwrap(
        await supabase.from('match_players').insert({ ...p, match_id: id, batting_order: order }).select('*').single(),
      ) as MatchPlayer;
    },
    onSuccess: (player) => set((b) => ({ ...b, players: [...b.players, player] })),
  });

  const completeMatch = useMutation({
    mutationFn: async (result: string) => unwrap(await supabase.rpc('complete_match', { p_match: id, p_result: result })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', id] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['live-cards'] });
    },
  });

  return { updateMatch, recordBall, undoBall, addPlayer, completeMatch };
}
