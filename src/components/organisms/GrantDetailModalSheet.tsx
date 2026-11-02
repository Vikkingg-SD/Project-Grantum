import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Grant } from '@/types/grant';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, SPACING } from '@/config/theme';
import { MODAL_COPY } from '@/config/copy';
import { ENV } from '@/config/env';
import { matchTier } from '@/utils/scoring';

export interface GrantDetailModalSheetProps {
  grant: Grant | null;
  onApply: (grant: Grant) => void;
}

export function GrantDetailModalSheet({ grant, onApply }: GrantDetailModalSheetProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];

  if (!grant) return null;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.titleArea}>
          <AppText variant="h2">{grant.title}</AppText>
          <StatusBadge label={grant.funder} variant="neutral" />
          <StatusBadge label={`${grant.matchPct}% match`} variant={matchTier(grant.matchPct)} />
        </View>
      </View>

      <View>
        <View style={styles.metaRow}>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.funding}
            </AppText>
            <AppText variant="metric-sm" color="main">
              {grant.amount}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.deadline}
            </AppText>
            <AppText variant="metric-sm" color="main">
              {grant.deadline}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.region}
            </AppText>
            <AppText variant="body" color="main">
              {grant.region}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" color="muted">
              {MODAL_COPY.record}
            </AppText>
            <AppText variant="body">
              {ENV.DATA_SOURCE === 'mock' ? MODAL_COPY.mockRecord : MODAL_COPY.apiRecord}
            </AppText>
          </View>
        </View>

        <AppText variant="body" color="main" style={styles.summary}>
          {grant.summary}
        </AppText>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <AppButton label={MODAL_COPY.apply} variant="primary" onPress={() => onApply(grant)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
    gap: SPACING.sm,
  },
  body: {
    flexGrow: 0,
  },
  content: { padding: SPACING.lg, gap: SPACING.lg },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  summary: {
    flexShrink: 1,
  },
  footer: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
  },
});
