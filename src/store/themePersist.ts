import type { ThemeMode } from '@/types/theme';

export interface ThemeState {
  mode: ThemeMode;
  hasExplicitChoice: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const partializeTheme = (state: ThemeState) => ({
  hasExplicitChoice: state.hasExplicitChoice,
  mode: state.hasExplicitChoice ? state.mode : undefined,
});
