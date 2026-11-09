import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import House from 'lucide-react-native/icons/house';
import Sun from 'lucide-react-native/icons/sun';
import Moon from 'lucide-react-native/icons/moon';
import { AppText } from '@/components/atoms/AppText';
import { IconButton } from '@/components/atoms/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { HEADER_COPY } from '@/config/copy';
import { LAYOUT } from '@/config/layout';
import { SPACING, RADIUS } from '@/config/theme';
import { useThemeStore } from '@/store/useThemeStore';

export interface AppHeaderProps {
  title?: string;
  canGoBack: boolean;
  onBack: () => void;
  onHome: () => void;
}

export function AppHeader({ canGoBack, onBack, onHome }: AppHeaderProps) {
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.keyCode === 229
      )
        return;
      // RN Web's Modal owns Escape on keyup and traps/restores focus itself.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const focused = document.activeElement;
      if (
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ||
        (focused instanceof HTMLElement && focused.isContentEditable)
      ) {
        focused.blur();
      } else if (canGoBack) {
        onBack();
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canGoBack, onBack]);
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}
    >
      <IconButton
        label={HEADER_COPY.back}
        icon={<ArrowLeft size={SPACING.lg} color={theme.textMain} />}
        disabled={!canGoBack}
        onPress={onBack}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={HEADER_COPY.home}
        onPress={onHome}
        style={({ pressed }) => [
          styles.titles,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <AppText variant="h2" color="primary" align="center">
          {HEADER_COPY.brand}
        </AppText>
        <House size={20} color={theme.primaryText} />
      </Pressable>
      <IconButton
        label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        icon={
          mode === 'dark' ? (
            <Sun size={SPACING.lg} color={theme.textMain} />
          ) : (
            <Moon size={SPACING.lg} color={theme.textMain} />
          )
        }
        onPress={toggleTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  titles: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flex: 1,
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
});
