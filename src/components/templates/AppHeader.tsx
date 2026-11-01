import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowLeft, Sun, Moon } from 'lucide-react-native';
import { AppText } from '@/components/atoms/AppText';
import { IconButton } from '@/components/atoms/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { HEADER_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';
import { useThemeStore } from '@/store/useThemeStore';

export interface AppHeaderProps {
  title?: string;
  canGoBack: boolean;
  onBack: () => void;
}

export function AppHeader({ title, canGoBack, onBack }: AppHeaderProps) {
  const theme = useTheme();
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
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
      <View style={styles.titles}>
        <AppText variant="h3">{HEADER_COPY.brand}</AppText>
        {title ? (
          <AppText variant="caption" color="muted">
            {title}
          </AppText>
        ) : null}
      </View>
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
  titles: { flex: 1, minWidth: 0 },
});
