import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check, Flag, Clock3, CircleAlert } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface AuditLogLineProps {
  agent: 'agent-1-narrative' | 'agent-2-deterministic' | 'system';
  message: string;
  status: 'running' | 'passed' | 'failed';
  timestamp?: string;
}

export function AuditLogLine({ agent, message, status, timestamp }: AuditLogLineProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  const renderIcon = () => {
    if (status === 'passed') return <Check size={16} color={theme.verified} />;
    if (status === 'failed') return <Flag size={16} color={theme.failure} />;
    if (agent === 'system') return <Clock3 size={16} color={theme.pending} />;
    return <CircleAlert size={16} color={theme.pending} />;
  };

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.iconWrap}>{renderIcon()}</View>
      <AppText variant="metric-sm" color="muted" style={styles.message} numberOfLines={2}>
        {message}
      </AppText>
      {timestamp && (
        <AppText variant="metric-sm" color="muted" style={styles.timestamp}>
          {timestamp}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  iconWrap: {
    marginTop: 2,
  },
  message: {
    flex: 1,
  },
  timestamp: {
    opacity: 0.7,
  },
});
