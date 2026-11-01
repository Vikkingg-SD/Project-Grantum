import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { AppText } from '@/components/atoms/AppText';
import { IconButton } from '@/components/atoms/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { HEADER_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';

export interface AppHeaderProps {
  title?: string;
  canGoBack: boolean;
  onBack: () => void;
}

export function AppHeader({ title, canGoBack, onBack }: AppHeaderProps) {
  const theme = useTheme();
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
