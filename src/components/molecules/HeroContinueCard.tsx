import React from 'react';
import { View, StyleSheet } from 'react-native';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { ProgressBar } from '../atoms/ProgressBar';
import { useThemeStore } from '@/store/useThemeStore';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { HERO_CONTINUE_COPY } from '@/config/copy';
import { progressLabel } from '@/utils/presentation';

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
  const { desktop: wide } = useLayoutMetrics();
  const inactive = props.variant === 'no-session';
  const title =
    props.variant === 'no-session'
      ? HERO_CONTINUE_COPY.inactiveTitle
      : (props.projectTitle ?? HERO_CONTINUE_COPY.untitled);
  const onPress = props.variant === 'no-session' ? props.onStartNew : props.onResume;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.heading, wide && styles.headingWide]}>
        <View
          style={[
            styles.content,
            { backgroundColor: theme.subtle, borderRadius: RADIUS.sm, padding: SPACING.md },
          ]}
        >
          <AppText variant="h2" color="main" align="center">
            {title}
          </AppText>
          <AppText variant="caption" color="muted" align="center" style={styles.title}>
            {inactive ? 'Create your first application' : 'Active application'}
          </AppText>
        </View>
        {wide && (
          <View style={styles.action}>
            <AppButton
              label={inactive ? HERO_CONTINUE_COPY.start : HERO_CONTINUE_COPY.resume}
              variant="primary"
              onPress={onPress}
              icon={<ArrowRight size={SPACING.lg} color={theme.primaryForeground} />}
              iconPosition="right"
            />
          </View>
        )}
      </View>
      {props.variant !== 'no-session' && (
        <View
          style={{ backgroundColor: theme.subtle, padding: SPACING.md, borderRadius: RADIUS.sm }}
        >
          <ProgressBar percent={props.completionPct} label={progressLabel(props.completionPct)} />
        </View>
      )}
      {!wide && (
        <AppButton
          label={inactive ? HERO_CONTINUE_COPY.start : HERO_CONTINUE_COPY.resume}
          variant="primary"
          onPress={onPress}
          icon={<ArrowRight size={SPACING.lg} color={theme.primaryForeground} />}
          iconPosition="right"
        />
      )}
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
    gap: SPACING.md,
    marginVertical: SPACING.sm,
  },
  heading: { gap: SPACING.lg },
  headingWide: { flexDirection: 'row', alignItems: 'center' },
  content: { minWidth: 0, flex: 1 },
  title: { marginTop: SPACING.sm },
  action: { maxWidth: '100%', flexShrink: 1, marginRight: SPACING.xl },
});
