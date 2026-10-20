import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  return PALETTE[mode];
}
