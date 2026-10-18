import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { Grant } from '@/types/grant';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { StatusBadge } from '../atoms/StatusBadge';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface GrantDetailModalSheetProps {
  grant: Grant | null;
  visible: boolean;
  onClose: () => void;
  onApply: (grant: Grant) => void;
}

export function GrantDetailModalSheet({
  grant,
  visible,
  onClose,
  onApply,
}: GrantDetailModalSheetProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  if (!grant) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: theme.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleArea}>
              <AppText variant="h2" numberOfLines={2}>
                {grant.title}
              </AppText>
              <StatusBadge label={grant.funder} variant="neutral" />
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.metaRow}>
              <View>
                <AppText variant="caption" color="muted">
                  Funding Amount
                </AppText>
                <AppText variant="metric-sm" color="main">
                  {grant.amount}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" color="muted">
                  Deadline
                </AppText>
                <AppText variant="metric-sm" color="main">
                  {grant.deadline}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" color="muted">
                  Match Score
                </AppText>
                <AppText variant="metric-sm" color="verified">
                  {grant.matchPct}%
                </AppText>
              </View>
            </View>

            <AppText variant="body" color="main" style={styles.summary}>
              {grant.summary}
            </AppText>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <AppButton label="Start Draft" variant="primary" onPress={() => onApply(grant)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
    gap: 6,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summary: {
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
