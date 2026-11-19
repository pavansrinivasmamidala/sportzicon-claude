import { Building2, ClipboardList, GraduationCap, PersonStanding, Search, Trophy, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import type { UserRole } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

export const ROLE_OPTIONS: { role: UserRole; title: string; body: string; icon: LucideIcon }[] = [
  { role: 'athlete', title: 'Athlete', body: 'Build a verified profile and get scouted', icon: PersonStanding },
  { role: 'coach', title: 'Coach / Academy', body: 'Post trials and manage your roster', icon: GraduationCap },
  { role: 'scout', title: 'Scout / Selector', body: 'Discover and track verified talent', icon: Search },
  { role: 'club', title: 'Club / Franchise', body: 'Recruit players and coaching staff', icon: Building2 },
  { role: 'organizer', title: 'Organizer / Association', body: 'Host tournaments and official trials', icon: Trophy },
  { role: 'scorer', title: 'Official Scorer', body: 'Score matches ball by ball', icon: ClipboardList },
];

export function RolePicker({ value, onChange }: { value: UserRole | null; onChange: (r: UserRole) => void }) {
  return (
    <View style={styles.grid}>
      {ROLE_OPTIONS.map(({ role, title, body, icon: Icon }) => {
        const on = value === role;
        return (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${title}. ${body}`}
            style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && !on && { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.icon, on && { backgroundColor: colors.brand }]}>
              <Icon size={22} color={on ? colors.white : '#334155'} strokeWidth={1.8} />
            </View>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15 }}>{title}</Text>
            <Text variant="small" color={colors.inkSecondary}>
              {body}
            </Text>
            {on ? (
              <Svg width={22} height={22} viewBox="0 0 24 24" style={styles.check}>
                <Circle cx={12} cy={12} r={11} fill={colors.brand} />
                <Path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    flexGrow: 1,
    minHeight: 132,
    padding: 14,
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardOn: { borderColor: colors.brand, backgroundColor: colors.accentTint },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 12, right: 12 },
});
