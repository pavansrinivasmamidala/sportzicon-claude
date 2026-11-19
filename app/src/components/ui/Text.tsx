import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong'
  | 'caption'
  | 'overline'
  | 'stat'
  | 'statLg';

const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.9, textTransform: 'uppercase' },
  stat: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
  statLg: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  numeric?: boolean;
}

export function Text({ variant = 'body', color = colors.ink, center, numeric, style, ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        variants[variant],
        { color },
        center && { textAlign: 'center' },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
