import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { ProgressBar } from '../atoms/ProgressBar';
import { useThemeStore } from '@/store/useThemeStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { HERO_CONTINUE_COPY } from '@/config/copy';

export type HeroContinueCardProps =
  | {
      variant?: 'active-session';
      projectTitle?: string;
      completionPct: number;
      onResume: () => void;
    }
  | {
      variant: 'no-session';
      onStartNew: () => void;
    };

export function HeroContinueCard(props: HeroContinueCardProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const wide = useBreakpoint() !== 'mobile';
  const inactive = props.variant === 'no-session';
  const title =
    props.variant === 'no-session'
      ? HERO_CONTINUE_COPY.inactiveTitle
      : (props.projectTitle ?? HERO_CONTINUE_COPY.untitled);
  const onPress = props.variant === 'no-session' ? props.onStartNew : props.onResume;

  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={[styles.content, wide && styles.contentWide]}>
        <AppText variant="eyebrow" color={inactive ? 'muted' : 'primary'}>
          {inactive ? HERO_CONTINUE_COPY.inactiveEyebrow : HERO_CONTINUE_COPY.activeEyebrow}
        </AppText>
        <AppText variant="h2" color="main" style={styles.title}>
          {title}
        </AppText>
        {props.variant !== 'no-session' && (
          <View style={styles.progress}>
            <ProgressBar percent={props.completionPct} label={HERO_CONTINUE_COPY.progress} />
          </View>
        )}
      </View>
      <View style={styles.action}>
        <AppButton
          label={inactive ? HERO_CONTINUE_COPY.start : HERO_CONTINUE_COPY.resume}
          variant="primary"
          onPress={onPress}
          icon={<ArrowRight size={SPACING.lg} color={theme.primaryForeground} />}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.xl,
    marginVertical: SPACING.sm,
  },
  cardWide: { flexDirection: 'row', alignItems: 'center' },
  content: { minWidth: 0, flexShrink: 1 },
  contentWide: { flex: 1 },
  title: { marginTop: SPACING.sm },
  progress: { marginTop: SPACING.lg },
  action: { maxWidth: '100%', flexShrink: 1 },
});
