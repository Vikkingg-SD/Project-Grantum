import React, { useRef, useState } from 'react';
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
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { AUDIT_COPY } from '@/config/copy';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';

export default function AuditScreen() {
  const grantId = useActiveGrantId();
  return <AuditSession key={grantId} grantId={grantId} />;
}

function AuditSession({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const draft = useProposalDraft(grantId);
  const scan = useAuditStatus(grantId);
  const trigger = useTriggerAuditScan(grantId);
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addAuditMessage);
  const [message, setMessage] = useState('');
  const detail = useGrantDetail(grantId);
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
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (scrollAfterNote.current) {
            scrollRef.current?.scrollToEnd({ animated: false });
            scrollAfterNote.current = false;
          }
        }}
      >
        <View style={styles.heading}>
          <AppText variant="h1" style={{ flexShrink: 1 }}>
            {AUDIT_COPY.title}
          </AppText>
          <StatusBadge
            label={
              running
                ? 'Scanning…'
                : scan.data?.status === 'passed'
                  ? 'Checklist check passed'
                  : scan.data?.status === 'failed'
                    ? 'Action required'
                    : 'Not scanned'
            }
            variant={running ? 'pending' : scan.data?.status === 'passed' ? 'verified' : 'neutral'}
          />
        </View>
        <GrantContext grantId={grantId} />
        <AppText color="muted">
          {ENV.DATA_SOURCE === 'mock'
            ? 'This preview checks section presence only. It does not validate budget math, eligibility, or evidence.'
            : 'Run an audit to request a review from your connected service.'}
        </AppText>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Section completeness</AppText>
          <View style={styles.heading}>
            {draft.data.requiredSections.map((section) => (
              <StatusBadge
                key={section}
                label={`${section} - ${draft.data.completedSections.includes(section) ? 'Present' : 'Missing'}`}
                variant={draft.data.completedSections.includes(section) ? 'neutral' : 'failure'}
              />
            ))}
          </View>
          <ConfidenceGaugeReadout
            score={draft.data.requiredSections.length ? draft.data.confidenceScore : 0}
          />
          <AppText color="muted">
            {!scan.data
              ? 'Not scanned yet. Run a check to create a result.'
              : running
                ? 'Checking required sections...'
                : 'Latest check result is recorded below.'}
          </AppText>
          <AppButton
            variant="primary"
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
          Session notes - Saved separately from check results.
        </AppText>
        <View style={styles.heading}>
          {AUDIT_COPY.chips.map((chip) => (
            <AppButton
              key={chip}
              label={chip}
              size="sm"
              variant="outline"
              onPress={() => setMessage(chip)}
            />
          ))}
        </View>
        {detail.data && (
          <View>
            <ChatMessageBubble
              text={AUDIT_COPY.welcome}
              variant="assistant-auditor"
              timestamp="now"
            />
          </View>
        )}
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
          scrollAfterNote.current = true;
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
