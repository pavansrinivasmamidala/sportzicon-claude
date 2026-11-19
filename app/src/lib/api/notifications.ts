import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../auth';
import { supabase, unwrap } from '../supabase';
import type { AppNotification } from '../types';

export function useNotifications() {
  const { session } = useAuth();
  const me = session?.user.id;
  return useQuery({
    queryKey: ['notifications'],
    enabled: !!me,
    queryFn: async () =>
      unwrap(
        await supabase.from('notifications').select('*').eq('user_id', me!).order('created_at', { ascending: false }).limit(100),
      ) as AppNotification[],
  });
}

/** One realtime subscription for the signed-in user's notifications. Mount once (in the signed-in layout). */
export function useNotificationsRealtime() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const me = session?.user.id;
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`notifications:${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` }, () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, qc]);
}

export function useUnreadNotifications() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read_at && n.kind !== 'message').length ?? 0;
}

export function useMarkRead() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (id?: string) => {
      let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', session!.user.id).is('read_at', null);
      if (id) q = q.eq('id', id);
      unwrap(await q);
    },
    onMutate: (id) =>
      qc.setQueryData<AppNotification[]>(['notifications'], (old) =>
        old?.map((n) => (!id || n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
      ),
  });
}
