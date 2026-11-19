import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { Sheet, Text } from '@/components/ui';
import { registerActionMenu, type MenuAction } from '@/lib/dialog';
import { colors, fonts } from '@/theme';

/** Renders menus opened with chooseAction() on Android and web. Mount once near the root. */
export function ActionMenuHost() {
  const [menu, setMenu] = useState<{ title?: string; actions: MenuAction[] } | null>(null);

  useEffect(() => {
    registerActionMenu(setMenu);
    return () => registerActionMenu(null);
  }, []);

  return (
    <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu?.title ?? 'Options'}>
      {menu?.actions.map((a, i) => (
        <Pressable
          key={a.label}
          onPress={() => {
            setMenu(null);
            // Let the sheet close before running the action (it may open another dialog).
            setTimeout(a.onPress, 250);
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({
            paddingVertical: 16,
            paddingHorizontal: 4,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.divider,
            backgroundColor: pressed ? colors.surfaceMuted : undefined,
          })}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: a.destructive ? colors.live : colors.ink }}>{a.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}
