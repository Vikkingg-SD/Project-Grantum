import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ConfidenceGaugeReadout } from '@/components/molecules/ConfidenceGaugeReadout';
import { AuditLogLine } from '@/components/molecules/AuditLogLine';
import { InfoCard } from '@/components/molecules/InfoCard';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus, useTriggerAuditScan } from '@/api/hooks/useAuditScan';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { AUDIT_COPY } from '@/config/copy';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';

export default function AuditScreen() {
  const grantId = useActiveGrantId();
  return <AuditSession key={grantId} grantId={grantId} />;
}

function AuditSession({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [promptsOpen, setPromptsOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
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
  const missingRequirement = draft.data.requiredSections.some(
    (section) => !draft.data.completedSections.includes(section)
  );
  const failed = scan.data?.status === 'failed' || missingRequirement;
  const passed = !failed && scan.data?.status === 'passed';
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
          <AppText variant="h1" align="center">
            {AUDIT_COPY.title}
          </AppText>
          <StatusBadge
            label={
              running
                ? 'Scanning…'
                : passed
                  ? 'Checklist check passed'
                  : failed
                    ? 'Action required'
                    : 'Not scanned'
            }
            variant={running ? 'pending' : passed ? 'verified' : failed ? 'failure' : 'neutral'}
            style={styles.centerBadge}
          />
        </View>
        <GrantContext grantId={grantId} />
        <InfoCard tone="surface">
          <AppText color="muted" align="center">
            {ENV.DATA_SOURCE === 'mock'
              ? 'Preview - section presence only.'
              : 'Run an audit to request a review from your connected service.'}
          </AppText>
        </InfoCard>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3" align="center">
            Section completeness
          </AppText>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {[true, false].map((complete) => (
              <View
                key={String(complete)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  gap: SPACING.sm,
                  padding: SPACING.sm,
                  borderRadius: RADIUS.sm,
                  backgroundColor: theme.subtle,
                }}
              >
                <AppText variant="caption" color={complete ? 'verified' : 'failure'}>
                  {complete ? 'Complete' : 'Incomplete'}
                </AppText>
                {draft.data.requiredSections
                  .filter((section) => draft.data.completedSections.includes(section) === complete)
                  .map((section) => (
                    <AppText
                      key={section}
                      variant="caption"
                      color={complete ? 'verified' : 'failure'}
                    >
                      {section}
                    </AppText>
                  ))}
                {!draft.data.requiredSections.some(
                  (section) => draft.data.completedSections.includes(section) === complete
                ) && (
                  <AppText variant="caption" color="muted">
                    None
                  </AppText>
                )}
              </View>
            ))}
          </View>
          <ConfidenceGaugeReadout
            score={draft.data.requiredSections.length ? draft.data.confidenceScore : 0}
          />
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
        <View style={styles.chat}>
          <AppText variant="h3" align="center">
            Agent chat
          </AppText>
          {local.auditMessages.length === 0 && (
            <AppText color="muted" align="center">
              Agent offline - messages stay in this session.
            </AppText>
          )}
          {mobile && (
            <AppButton
              label="Audit prompts"
              size="sm"
              expanded={promptsOpen}
              onPress={() => setPromptsOpen(!promptsOpen)}
            />
          )}
          {(!mobile || promptsOpen) && (
            <View style={styles.chipsRow}>
              {AUDIT_COPY.chips.map((chip) => (
                <AppButton
                  key={chip}
                  label={chip}
                  size="sm"
                  style={styles.flexible}
                  onPress={() => setMessage(chip)}
                />
              ))}
            </View>
          )}
          {local.auditMessages.map((item) => (
            <ChatMessageBubble key={item.id} {...item} />
          ))}
        </View>
      </ScrollView>
      <ChatInputRow
        value={message}
        onChangeText={setMessage}
        grantId={grantId}
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
  heading: { alignItems: 'center', gap: SPACING.sm },
  centerBadge: { alignSelf: 'center' },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  chat: { gap: SPACING.lg, minHeight: 320 },
  flexible: { flexShrink: 1, minWidth: 0 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
});
