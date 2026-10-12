import { create } from 'zustand';
import { Appearance } from 'react-native';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: Appearance.getColorScheme() === 'light' ? 'light' : 'dark',
  toggleTheme: () => set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
  setTheme: (mode) => set({ mode }),
}));
