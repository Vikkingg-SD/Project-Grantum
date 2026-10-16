import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export default function PostAwardScreen() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="h1">Post-Award Tracking</AppText>
        <StatusBadge label="Awarded" variant="gold" />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppText variant="h2">Climate Resilience Infrastructure</AppText>
        <AppText variant="caption" color="muted" style={styles.funder}>
          Northstar Foundation · Counter-signed 18 May 2026
        </AppText>

        <View style={styles.grid}>
          <View style={[styles.metricBox, { backgroundColor: theme.subtle }]}>
            <AppText variant="caption" color="muted">
              Award Total
            </AppText>
            <AppText variant="metric-sm" color="main">
              $500,000
            </AppText>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.subtle }]}>
            <AppText variant="caption" color="muted">
              Next Milestone
            </AppText>
            <AppText variant="metric-sm" color="main">
              14 Aug 2026
            </AppText>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.subtle }]}>
            <AppText variant="caption" color="muted">
              Compliance State
            </AppText>
            <AppText variant="metric-sm" color="verified">
              100% Locked
            </AppText>
          </View>
        </View>
      </View>

      <View
        style={[styles.auditCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <AppText variant="h3" style={styles.auditTitle}>
          Immutable Audit Trail
        </AppText>
        <AuditLogLine
          agent="agent-2-deterministic"
          message="Final budget reconciliation passed"
          status="passed"
          timestamp="18 May · 14:32"
        />
        <AuditLogLine
          agent="agent-1-narrative"
          message="Evidence references locked"
          status="passed"
          timestamp="18 May · 14:31"
        />
        <AuditLogLine
          agent="system"
          message="Submission receipt stored on ledger"
          status="passed"
          timestamp="18 May · 14:30"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  funder: {
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
  },
  auditCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  auditTitle: {
    marginBottom: 10,
  },
});
