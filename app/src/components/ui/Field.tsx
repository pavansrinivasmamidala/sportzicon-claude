import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  right?: React.ReactNode;
}

export function Field({ label, hint, error, optional, right, style, multiline, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong" style={{ fontSize: 14 }}>
        {label}
        {optional ? <Text variant="small" color={colors.inkMuted}> (optional)</Text> : null}
      </Text>
      <View>
        <TextInput
          placeholderTextColor={colors.inkFaint}
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && { height: undefined, minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
            focused && { borderColor: colors.brand, borderWidth: 1.5 },
            !!error && { borderColor: colors.live },
            !!right && { paddingRight: 52 },
            style,
          ]}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.live}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** A tappable field that opens a picker (select, date…). */
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  optional,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong" style={{ fontSize: 14 }}>
        {label}
        {optional ? <Text variant="small" color={colors.inkMuted}> (optional)</Text> : null}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        style={({ pressed }) => [styles.input, styles.select, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <Text color={value ? colors.ink : colors.inkFaint} style={{ fontSize: 16 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  select: { justifyContent: 'center' },
  right: { position: 'absolute', right: 4, top: 4 },
});
