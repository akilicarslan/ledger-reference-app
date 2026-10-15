/**
 * Design tokens. Components must use these tokens, not literal values.
 *
 * Every text/background pair in this file has a contrast ratio of 4.5:1 or
 * more (WCAG 2.1 SC 1.4.3). Every UI boundary (`borderStrong`, `focus`) has
 * 3:1 or more against `surface` and `canvas` (SC 1.4.11). The unit test
 * test/contrast.test.ts checks these rules. Do not change a color without
 * running that test.
 */

export interface ColorTokens {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  danger: string;
  dangerPressed: string;
  onDanger: string;
  focus: string;
  dangerSurface: string;
  dangerText: string;
  successSurface: string;
  successText: string;
  warningSurface: string;
  warningText: string;
  infoSurface: string;
  infoText: string;
  skeleton: string;
}

export const lightColors: ColorTokens = {
  canvas: '#F3F5F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F8FA',
  borderSubtle: '#D9DEE5',
  borderStrong: '#6B7480',
  text: '#17202B',
  textMuted: '#4F5B67',
  primary: '#0B5394',
  primaryPressed: '#083D6E',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  dangerPressed: '#8C1D18',
  onDanger: '#FFFFFF',
  focus: '#0B5394',
  dangerSurface: '#FDECEA',
  dangerText: '#8C1D18',
  successSurface: '#E7F4EA',
  successText: '#17552A',
  warningSurface: '#FFF4D6',
  warningText: '#6B4700',
  infoSurface: '#E8F1FB',
  infoText: '#0B4275',
  skeleton: '#E3E8EE',
};

export const darkColors: ColorTokens = {
  canvas: '#0E1217',
  surface: '#161C24',
  surfaceMuted: '#1C232D',
  borderSubtle: '#2C3542',
  borderStrong: '#8B96A5',
  text: '#E8EDF3',
  textMuted: '#A9B4C2',
  primary: '#6CB0FF',
  primaryPressed: '#4A98F0',
  onPrimary: '#0E1217',
  danger: '#FF8A80',
  dangerPressed: '#F06B60',
  onDanger: '#1A0B0A',
  focus: '#6CB0FF',
  dangerSurface: '#3A1714',
  dangerText: '#FFB4AB',
  successSurface: '#12301C',
  successText: '#8FD5A6',
  warningSurface: '#3A2E0B',
  warningText: '#F5D27A',
  infoSurface: '#102A45',
  infoText: '#A8CBFF',
  skeleton: '#2A333F',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/**
 * Text styles. Sizes are in density-independent points. The app does not
 * limit system font scaling, so text can grow to 200 % (SC 1.4.4).
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export type TypographyVariant = keyof typeof typography;

/**
 * Minimum size of a touch target. 48 dp is the Android guideline and is
 * more than the 44 pt iOS guideline and the 44 px of WCAG SC 2.5.5.
 */
export const MIN_TOUCH_TARGET = 48;

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  minTouchTarget: number;
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
  minTouchTarget: MIN_TOUCH_TARGET,
};

export const darkTheme: Theme = { ...lightTheme, scheme: 'dark', colors: darkColors };
