import type { TextStyle } from 'react-native';
import { FONT } from '@/config/fonts';
import type { ThemeColors, ThemeMode } from '@/types/theme';

export const PALETTE: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: '#000000',
    surface: '#121518',
    subtle: '#1A1E23',
    surfaceMuted: '#161A1E',
    border: '#394047',
    borderStrong: '#4B5563',
    inputBorder: '#30373E',
    textMain: '#EDEFF2',
    textMuted: '#8A929C',
    primary: '#FF8A00',
    primaryForeground: '#140B00',
    verified: '#00B35D',
    mint: '#00FF87',
    pending: '#00E5FF',
    failure: '#A4161A',
    failureText: '#FF5A5F',
    gold: '#FFD700',
    overlay: 'rgba(0,0,0,0.6)',
    tint: '#FF8A00',
  },
  light: {
    background: '#F4F6F8',
    surface: '#FFFFFF',
    subtle: '#E9ECEF',
    surfaceMuted: '#EEF1F4',
    border: '#D1D5DB',
    borderStrong: '#9CA3AF',
    inputBorder: '#7B8490',
    textMain: '#111827',
    textMuted: '#6B7280',
    primary: '#D97000',
    primaryForeground: '#FFFFFF',
    verified: '#008744',
    mint: '#008744',
    pending: '#0094A8',
    failure: '#DC2626',
    failureText: '#DC2626',
    gold: '#D97706',
    overlay: 'rgba(0,0,0,0.6)',
    tint: '#D97000',
  },
};

export const RADIUS = { sm: 8, md: 12, full: 9999 } as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const TYPOGRAPHY = {
  display: { fontFamily: FONT.sans.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: FONT.sans.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
  h2: { fontFamily: FONT.sans.semibold, fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: FONT.sans.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: FONT.sans.semibold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: FONT.sans.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: FONT.sans.medium, fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: FONT.sans.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.92,
    textTransform: 'uppercase',
  },
  'metric-xl': { fontFamily: FONT.mono.bold, fontSize: 30, lineHeight: 36 },
  'metric-lg': { fontFamily: FONT.mono.bold, fontSize: 24, lineHeight: 32 },
  'metric-md': { fontFamily: FONT.mono.bold, fontSize: 18, lineHeight: 28 },
  'metric-sm': { fontFamily: FONT.mono.medium, fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof TYPOGRAPHY;

export const SHADOWS: Record<ThemeMode, string> = {
  dark: '0 8px 32px rgba(0,0,0,0.6)',
  light: '0 4px 16px rgba(17,24,39,0.08)',
};

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${a}`;
}
