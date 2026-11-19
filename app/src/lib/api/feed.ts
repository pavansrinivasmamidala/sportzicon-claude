import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { FeedPost, Performance, PostComment, PostKind } from '../types';

const POST_SELECT = `*,
  author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role, headline, playing_role,
    organization:organizations!profiles_org_id_fkey(name)),
  performance:performances(*),
  endorsement_count:post_endorsements(count),
  comment_count:post_comments(count)`;

type RawPost = Omit<FeedPost, 'endorsements' | 'comments' | 'endorsed_by_me' | 'saved_by_me'> & {
  endorsement_count: { count: number }[];
  comment_count: { count: number }[];
};

async function decorate(rows: RawPost[], me: string): Promise<FeedPost[]> {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const [endorsed, saved] = await Promise.all([
    supabase.from('post_endorsements').select('post_id').eq('user_id', me).in('post_id', ids),
    supabase.from('saved_posts').select('post_id').eq('user_id', me).in('post_id', ids),
  ]);
  const e = new Set((endorsed.data ?? []).map((r) => r.post_id as string));
  const s = new Set((saved.data ?? []).map((r) => r.post_id as string));
  return rows.map(({ endorsement_count, comment_count, ...r }) => ({
    ...r,
    endorsements: endorsement_count?.[0]?.count ?? 0,
    comments: comment_count?.[0]?.count ?? 0,
    endorsed_by_me: e.has(r.id),
    saved_by_me: s.has(r.id),
  }));
}

export function useFeed(authorId?: string) {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  return useQuery({
    queryKey: ['feed', authorId ?? 'all'],
    enabled: !!me,
    queryFn: async () => {
      let q = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(40);
      if (authorId) q = q.eq('author_id', authorId);
      const rows = unwrap(await q) as unknown as RawPost[];
      return decorate(rows, me);
    },
  });
}

export function usePost(id: string) {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  return useQuery({
    queryKey: ['post', id],
    enabled: !!me && !!id,
    queryFn: async () => {
      const row = unwrap(await supabase.from('posts').select(POST_SELECT).eq('id', id).single()) as unknown as RawPost;
      return (await decorate([row], me))[0];
    },
  });
}

/** Optimistically patches a post everywhere it's cached. */
function patchPost(qc: ReturnType<typeof useQueryClient>, id: string, patch: (p: FeedPost) => FeedPost) {
  qc.setQueriesData<FeedPost[]>({ queryKey: ['feed'] }, (old) => old?.map((p) => (p.id === id ? patch(p) : p)));
  qc.setQueryData<FeedPost>(['post', id], (old) => (old ? patch(old) : old));
}

export function useToggleEndorse() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (post: FeedPost) => {
      const me = session!.user.id;
      if (post.endorsed_by_me) {
        unwrap(await supabase.from('post_endorsements').delete().eq('post_id', post.id).eq('user_id', me));
      } else {
        unwrap(await supabase.from('post_endorsements').insert({ post_id: post.id, user_id: me }));
      }
    },
    onMutate: (post) =>
      patchPost(qc, post.id, (p) => ({
        ...p,
        endorsed_by_me: !p.endorsed_by_me,
        endorsements: p.endorsements + (p.endorsed_by_me ? -1 : 1),
      })),
    onError: (_e, post) => patchPost(qc, post.id, () => post),
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (post: FeedPost) => {
      const me = session!.user.id;
      if (post.saved_by_me) unwrap(await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', me));
      else unwrap(await supabase.from('saved_posts').insert({ post_id: post.id, user_id: me }));
    },
    onMutate: (post) => patchPost(qc, post.id, (p) => ({ ...p, saved_by_me: !p.saved_by_me })),
    onError: (_e, post) => patchPost(qc, post.id, () => post),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: { kind: PostKind; body: string; media_url?: string | null; performance_id?: string | null }) =>
      unwrap(await supabase.from('posts').insert({ ...input, author_id: session!.user.id }).select('id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('posts').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from('post_comments')
          .select('*, author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at'),
      ) as unknown as PostComment[],
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (body: string) =>
      unwrap(await supabase.from('post_comments').insert({ post_id: postId, body, author_id: session!.user.id })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      patchPost(qc, postId, (p) => ({ ...p, comments: p.comments + 1 }));
    },
  });
}

export type { Performance };
