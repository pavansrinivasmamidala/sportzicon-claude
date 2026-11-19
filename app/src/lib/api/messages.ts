import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { Conversation, Message, MessageAttachment, Profile } from '../types';

type Other = Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'headline' | 'playing_role'>;

export interface ConversationSummary extends Conversation {
  other: Other | null;
  unread: boolean;
}

export function useConversations() {
  const { session } = useAuth();
  const me = session?.user.id;
  return useQuery({
    queryKey: ['conversations'],
    enabled: !!me,
    queryFn: async () => {
      const mine = unwrap(
        await supabase
          .from('conversation_members')
          .select('last_read_at, conversation:conversations(*, conversation_members(user_id, profile:profiles(id, full_name, avatar_url, role, headline, playing_role)))')
          .eq('user_id', me!),
      ) as unknown as {
        last_read_at: string;
        conversation: Conversation & { conversation_members: { user_id: string; profile: Other }[] };
      }[];
      return mine
        .map(({ last_read_at, conversation: c }) => ({
          id: c.id,
          created_at: c.created_at,
          last_message_at: c.last_message_at,
          last_message_preview: c.last_message_preview,
          other: c.conversation_members.find((m) => m.user_id !== me)?.profile ?? null,
          unread: !!c.last_message_preview && new Date(c.last_message_at) > new Date(last_read_at),
        }))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)) as ConversationSummary[];
    },
  });
}

export function useUnreadConversations() {
  const { data } = useConversations();
  return data?.filter((c) => c.unread).length ?? 0;
}

export function useMessages(conversationId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () =>
      unwrap(
        await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(300),
      ) as Message[],
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          qc.setQueryData<Message[]>(['messages', conversationId], (old = []) =>
            old.some((x) => x.id === m.id) ? old : [...old.filter((x) => !x.id.startsWith('temp-')), m],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  // Mark as read whenever the thread is open and new messages arrive.
  const count = query.data?.length ?? 0;
  useEffect(() => {
    if (!session) return;
    supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .then(() => qc.invalidateQueries({ queryKey: ['conversations'] }));
  }, [count, conversationId, session, qc]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: { body: string; attachment?: MessageAttachment | null }) =>
      unwrap(
        await supabase
          .from('messages')
          .insert({ conversation_id: conversationId, sender_id: session!.user.id, body: input.body, attachment: input.attachment ?? null })
          .select('*')
          .single(),
      ) as Message,
    onMutate: (input) => {
      const temp: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: session!.user.id,
        body: input.body,
        attachment: input.attachment ?? null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(['messages', conversationId], (old = []) => [...old, temp]);
    },
    onSuccess: (m) => {
      qc.setQueryData<Message[]>(['messages', conversationId], (old = []) => {
        const rest = old.filter((x) => !x.id.startsWith('temp-') && x.id !== m.id);
        return [...rest, m];
      });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => qc.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });
}

export async function startConversation(otherUserId: string) {
  return unwrap(await supabase.rpc('start_conversation', { p_other: otherUserId })) as string;
}

export function useConversationOther(conversationId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['conversation-other', conversationId],
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('conversation_members')
          .select('user_id, profile:profiles(id, full_name, avatar_url, role, headline, playing_role)')
          .eq('conversation_id', conversationId),
      ) as unknown as { user_id: string; profile: Other }[];
      return rows.find((r) => r.user_id !== session?.user.id)?.profile ?? null;
    },
  });
}

export function useClearConversation() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (conversationId: string) =>
      unwrap(
        await supabase.from('conversation_members').delete().eq('conversation_id', conversationId).eq('user_id', session!.user.id),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
