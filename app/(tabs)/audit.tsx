import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ConfidenceGaugeReadout } from '@/components/molecules/ConfidenceGaugeReadout';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus, useTriggerAuditScan } from '@/api/hooks/useAuditScan';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';

export default function AuditScreen() {
  const theme = useTheme();
  const grantId = useUIStore((state) => state.activeGrantId);
  const draft = useProposalDraft(grantId);
  const scan = useAuditStatus(grantId);
  const trigger = useTriggerAuditScan(grantId);
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addAuditMessage);
  const [message, setMessage] = useState('');
  if (!grantId || draft.isPending || draft.isError || !draft.data) {
    return (
      <ScreenContainer>
        <EmptyStateLayout
          title={
            !grantId
              ? 'Select an opportunity'
              : draft.isError
                ? 'Instrument fault'
                : 'Calibrating instrument…'
          }
          description={draft.error?.message ?? 'Open an application to inspect its audit.'}
          ctaLabel={draft.isError ? 'Try again' : undefined}
          onCtaPress={() => {
            void draft.refetch();
          }}
        />
      </ScreenContainer>
    );
  }
  const running = trigger.isPending || scan.data?.status === 'running';
  const error = trigger.error ?? scan.error;
  return (
    <ScreenContainer scrollable={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <AppText variant="h1" style={{ flexShrink: 1 }}>
            Deterministic Auditor
          </AppText>
          <StatusBadge
            label={
              running
                ? 'Scanning…'
                : scan.data?.status === 'passed'
                  ? 'Live pass'
                  : scan.data?.status === 'failed'
                    ? 'Action required'
                    : 'Not scanned'
            }
            variant={running ? 'pending' : scan.data?.status === 'passed' ? 'verified' : 'neutral'}
          />
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="caption" color="muted">
            SCAN STATUS · REQUIRED PROPOSAL SECTIONS
          </AppText>
          {draft.data.requiredSections.map((section) => (
            <AppText
              key={section}
              color={draft.data.completedSections.includes(section) ? 'main' : 'failure'}
            >
              {section}
            </AppText>
          ))}
          <ConfidenceGaugeReadout
            score={draft.data.requiredSections.length ? draft.data.confidenceScore : 0}
          />
          <AppButton
            label={running ? 'Scanning…' : 'Run audit'}
            isLoading={running}
            disabled={!draft.data.requiredSections.length}
            onPress={() => trigger.mutate()}
          />
          {error && (
            <AppText color="failure" accessibilityRole="alert">
              {error.message}
            </AppText>
          )}
          {scan.isError && (
            <AppButton
              label="Try again"
              onPress={() => {
                void scan.refetch();
              }}
            />
          )}
          {scan.data?.events.map((event) => (
            <AuditLogLine key={event.id} {...event} />
          ))}
        </View>
        <AppText variant="caption" color="muted">
          Local audit notes. Run audit to request a compliance scan.
        </AppText>
        {local.auditMessages.map((item) => (
          <ChatMessageBubble key={item.id} {...item} />
        ))}
      </ScrollView>
      <ChatInputRow
        value={message}
        onChangeText={setMessage}
        placeholder="Add an audit note…"
        onSend={() => {
          if (!message.trim()) return;
          addNote(grantId, message.trim(), 'user');
          setMessage('');
        }}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.lg },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
});
