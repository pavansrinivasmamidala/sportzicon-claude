import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Briefcase, House, LayoutGrid, MessageCircle, Radio, Search, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useUnreadConversations } from '@/lib/api/messages';
import { useAuth } from '@/lib/auth';
import { isOrgRole } from '@/lib/format';
import type { UserRole } from '@/lib/types';
import { colors, fonts } from '@/theme';

type TabName = 'index' | 'opportunities' | 'manage' | 'matches' | 'search' | 'messages' | 'me';

const TAB_META: Record<TabName, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: House },
  opportunities: { label: 'Opportunities', icon: Briefcase },
  manage: { label: 'Manage', icon: LayoutGrid },
  matches: { label: 'Matches', icon: Radio },
  search: { label: 'Search', icon: Search },
  messages: { label: 'Messages', icon: MessageCircle },
  me: { label: 'Profile', icon: User },
};

/** Which five tabs a role sees. */
export function tabsForRole(role: UserRole | undefined): TabName[] {
  const second: TabName = isOrgRole(role) ? 'manage' : role === 'scorer' ? 'matches' : 'opportunities';
  return ['index', second, 'search', 'messages', 'me'];
}

function DarkTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const unread = useUnreadConversations();
  const visible = tabsForRole(profile?.role);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {visible.map((name) => {
        const routeIndex = state.routes.findIndex((r) => r.name === name);
        if (routeIndex < 0) return null;
        const route = state.routes[routeIndex];
        const focused = state.index === routeIndex;
        const meta = TAB_META[name];
        const Icon = meta.icon;
        const tint = focused ? colors.brand : colors.onDarkMuted;
        const badge = name === 'messages' ? unread : 0;
        const label = name === 'me' && isOrgRole(profile?.role) ? 'Organization' : meta.label;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            // The long "Opportunities" label gets a little more room so it never truncates on narrow phones.
            style={[styles.item, name === 'opportunities' && { flex: 1.35 }]}>
            <View>
              <Icon size={22} color={tint} strokeWidth={focused ? 2.2 : 1.8} />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: focused ? fonts.bodySemi : fonts.bodyMedium, fontSize: 11, color: tint }} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }} tabBar={(props) => <DarkTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="opportunities" />
      <Tabs.Screen name="manage" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.dark, paddingTop: 6, paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minHeight: 48 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.ink },
});
