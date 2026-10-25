import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { ProgressBar } from '../atoms/ProgressBar';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';

export interface HeroContinueCardProps {
  projectTitle: string;
  completionPct: number;
  onResume: () => void;
}

export function HeroContinueCard({ projectTitle, completionPct, onResume }: HeroContinueCardProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="eyebrow" color="primary">
        ACTIVE SESSION · DRAFTING PIPELINE
      </AppText>
      <AppText variant="h2" color="main" style={styles.title} numberOfLines={2}>
        {projectTitle}
      </AppText>
      <ProgressBar percent={completionPct} label="Drafting progress" />
      <View style={styles.footer}>
        <AppButton
          label="Continue drafting"
          variant="primary"
          onPress={onResume}
          icon={<ArrowRight size={16} color={theme.primaryForeground} />}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 14,
  },
});
