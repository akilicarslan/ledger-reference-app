import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/theme/contrast';
import { darkColors, lightColors, type ColorTokens } from '../src/theme/tokens';

/** WCAG 2.1 SC 1.4.3: normal text needs 4.5:1. */
const TEXT_PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['text', 'canvas'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textMuted', 'canvas'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceMuted'],
  ['primary', 'surface'],
  ['primary', 'infoSurface'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onDanger', 'danger'],
  ['onDanger', 'dangerPressed'],
  ['dangerText', 'dangerSurface'],
  ['dangerText', 'surface'],
  ['successText', 'successSurface'],
  ['successText', 'surface'],
  ['warningText', 'warningSurface'],
  ['infoText', 'infoSurface'],
];

/** WCAG 2.1 SC 1.4.11: UI component boundaries and focus indicators need 3:1. */
const NON_TEXT_PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'canvas'],
  ['focus', 'surface'],
  ['focus', 'canvas'],
  ['danger', 'surface'],
  ['primary', 'canvas'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme', (_name, colors) => {
  it.each(TEXT_PAIRS)('%s on %s has 4.5:1 or more', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s on %s has 3:1 or more', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(3);
  });
});

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for equal colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});
