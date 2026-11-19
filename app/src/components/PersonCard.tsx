import { Bookmark } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, Text, VerifiedBadge } from '@/components/ui';
import { startConversation } from '@/lib/api/messages';
import { useShortlist, useToggleShortlist } from '@/lib/api/people';
import { useAuth } from '@/lib/auth';
import { ageFrom, roleLabels } from '@/lib/format';
import type { ProfileWithOrg } from '@/lib/types';
import { colors } from '@/theme';
import { go } from '@/lib/nav';
import { notify } from '@/lib/dialog';

export async function openChatWith(userId: string) {
  try {
    const id = await startConversation(userId);
    go(`/chat/${id}`);
  } catch (e) {
    notify('Could not open chat', e instanceof Error ? e.message : 'Please try again.');
  }
}

export function PersonCard({ p, actions = true }: { p: ProfileWithOrg; actions?: boolean }) {
  const { session } = useAuth();
  const { data: shortlist } = useShortlist();
  const toggle = useToggleShortlist();
  const [opening, setOpening] = useState(false);
  const on = shortlist?.has(p.id) ?? false;
  const age = ageFrom(p.date_of_birth);
  const line1 = p.role === 'athlete' ? [p.playing_role, age ? `${age}` : null, p.city].filter(Boolean).join(' · ') : [p.headline || roleLabels[p.role], p.city].filter(Boolean).join(' · ');
  const isMe = p.id === session?.user.id;

  return (
    <Card style={{ gap: 12 }}>
      <Pressable onPress={() => go(`/profile/${p.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} accessibilityRole="link" accessibilityLabel={`${p.full_name}, ${line1}`}>
        <Avatar name={p.full_name} url={p.avatar_url} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="title" numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.organization && p.role === 'athlete' ? <VerifiedBadge /> : null}
          </View>
          <Text variant="small" color={colors.inkSecondary} numberOfLines={1}>
            {line1}
          </Text>
          {p.organization ? (
            <Text variant="small" color={colors.inkMuted} numberOfLines={1}>
              {p.organization.name}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {actions && !isMe ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label="Message"
            size="sm"
            style={{ flex: 1, height: 42 }}
            loading={opening}
            onPress={async () => {
              setOpening(true);
              await openChatWith(p.id);
              setOpening(false);
            }}
          />
          {p.role === 'athlete' ? (
            <Pressable
              onPress={() => toggle.mutate({ athleteId: p.id, on: !on })}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={on ? `Remove ${p.full_name} from shortlist` : `Shortlist ${p.full_name}`}
              style={{
                width: 44,
                height: 42,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: on ? colors.brand : colors.borderStrong,
                backgroundColor: on ? colors.accentTint : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Bookmark size={18} color={on ? colors.accent : colors.ink} fill={on ? colors.accent : 'none'} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
