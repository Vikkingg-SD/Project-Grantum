import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import Flag from 'lucide-react-native/icons/flag';
import Clock3 from 'lucide-react-native/icons/clock-3';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, SPACING } from '@/config/theme';
import { formatEventDate } from '@/utils/presentation';

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
      <View style={styles.message}>
        <AppText variant="body">{message}</AppText>
        {timestamp && (
          <AppText variant="caption" color="muted" style={styles.timestamp}>
            {formatEventDate(timestamp)}
          </AppText>
        )}
      </View>
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
  timestamp: { marginTop: SPACING.xs },
});
