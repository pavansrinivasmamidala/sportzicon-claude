import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Avatar, Loading, Text } from '@/components/ui';
import { useSearchOrgs } from '@/lib/api/people';
import { orgKindLabels } from '@/lib/format';
import type { OrgKind } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

/** Searchable list of academies/clubs for an athlete to link to. */
export function OrgPicker({ value, onChange, kind = 'all' }: { value: string | null; onChange: (id: string | null) => void; kind?: OrgKind | 'all' }) {
  const [text, setText] = useState('');
  const { data, isLoading } = useSearchOrgs(text, kind);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        <Search size={18} color={colors.inkMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search academies and clubs"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Search academies and clubs"
          style={{ flex: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink }}
        />
      </View>
      {isLoading ? <Loading /> : null}
      {(data ?? [])
        .filter((o) => o.kind !== 'association')
        .map((o) => {
          const on = o.id === value;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(on ? null : o.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: on ? colors.brand : colors.border,
                backgroundColor: on ? colors.accentTint : colors.surface,
              }}>
              <Avatar name={o.name} url={o.logo_url} size={40} square />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{o.name}</Text>
                <Text variant="small" color={colors.inkMuted}>
                  {orgKindLabels[o.kind]}
                  {o.city ? ` · ${o.city}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      {!isLoading && !data?.length ? (
        <Text variant="small" color={colors.inkMuted}>
          No matches. You can link your academy later from your profile.
        </Text>
      ) : null}
    </View>
  );
}
