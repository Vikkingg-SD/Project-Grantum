import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { partializeTheme, type ThemeState } from './themePersist';

const getSystemMode = (): ThemeState['mode'] =>
  Appearance.getColorScheme() === 'light' ? 'light' : 'dark';

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
      partialize: partializeTheme,
    }
  )
);

// Listen to system theme changes
if (Appearance && Appearance.addChangeListener) {
  Appearance.addChangeListener(({ colorScheme }) => {
    const state = useThemeStore.getState();
    if (!state.hasExplicitChoice && colorScheme) {
      useThemeStore.setState({ mode: colorScheme === 'light' ? 'light' : 'dark' });
    }
  });
}
