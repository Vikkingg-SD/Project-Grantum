import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Check, Flag, Clock3, CircleAlert } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, SPACING } from '@/config/theme';

export interface AuditLogLineProps {
  agent: 'agent-1-narrative' | 'agent-2-deterministic' | 'system';
  message: string;
  status: 'running' | 'passed' | 'failed';
  timestamp?: string;
}

export const AuditLogLine = memo(function AuditLogLine({
  agent,
  message,
  status,
  timestamp,
}: AuditLogLineProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const Icon =
    status === 'passed'
      ? Check
      : status === 'failed'
        ? Flag
        : agent === 'system'
          ? Clock3
          : CircleAlert;
  const color =
    status === 'passed' ? theme.verified : status === 'failed' ? theme.failure : theme.pending;
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.iconWrap}>
        <Icon size={SPACING.lg} color={color} />
      </View>
      <AppText variant="metric-sm" color="muted" style={styles.message}>
        {message}
      </AppText>
      {timestamp && (
        <AppText variant="metric-sm" color="muted" style={styles.timestamp}>
          {timestamp}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  iconWrap: { flexShrink: 0, paddingTop: SPACING.xs },
  message: { flex: 1, minWidth: 0 },
  timestamp: { opacity: 0.7, flexShrink: 1 },
});
