import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '@/types/theme';

interface ThemeState {
  mode: ThemeMode;
  hasExplicitChoice: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const getSystemMode = (): ThemeMode => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark');

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: getSystemMode(),
      hasExplicitChoice: false,
      toggleTheme: () =>
        set((state) => ({
          mode: state.mode === 'dark' ? 'light' : 'dark',
          hasExplicitChoice: true,
        })),
      setTheme: (mode) => set({ mode, hasExplicitChoice: true }),
    }),
    {
      name: 'grantum-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, hasExplicitChoice: state.hasExplicitChoice }),
    }
  )
);
