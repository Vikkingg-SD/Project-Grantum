import { Platform, ViewStyle } from 'react-native';
import type { ThemeMode } from '@/types/theme';
import { SHADOWS } from '@/config/theme';

export function platformShadow(mode: ThemeMode): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: SHADOWS[mode] };
  }
  // Native shadows require shadowColor/Offset/Opacity/RADIUS.
  // Web-first parity returns empty for native until a specific native elevation is ruled.
  return {};
}
