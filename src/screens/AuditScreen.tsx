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
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { BudgetChecklistCard } from '@/components/organisms/BudgetChecklistCard';
import { ProjectVersionSelectorCard } from '@/components/organisms/ProjectVersionSelectorCard';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus, useTriggerAuditScan } from '@/api/hooks/useAuditScan';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useApplicationAuditState } from '@/hooks/useApplicationAuditState';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import { AUDIT_COPY } from '@/config/copy';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';
import { formatEventDate } from '@/utils/presentation';
import { resolveApplicationNarrative } from '@/utils/drafting';
import { normalizeSectionTitle } from '@/utils/sectionCatalog';
import { canRolePerform, workSlotKey } from '@/utils/workspace';

export default function AuditScreen() {
  const grantId = useActiveGrantId();
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const slotKey = grantId ? workSlotKey(activeProjectId, grantId) : '';
  return <AuditSession key={slotKey} grantId={grantId} slotKey={slotKey} />;
}

function AuditSession({ grantId, slotKey }: { grantId: string; slotKey: string }) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  useEscapeDismiss(mobile && promptsOpen, () => setPromptsOpen(false));
  useEscapeDismiss(historyOpen, () => setHistoryOpen(false));
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const draft = useProposalDraft(grantId);
  const scan = useAuditStatus(grantId, false, slotKey);
  const trigger = useTriggerAuditScan(grantId, slotKey);
  const local = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addAuditMessage);
  const setAttachments = useDraftStore((state) => state.setAttachments);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const [message, setMessage] = useState('');

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const pinnedProfileRevisionId =
    activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest';
  const isLocked = Boolean(
    activeApp &&
    (activeApp.status === 'submitted' ||
      activeApp.status === 'archived' ||
      activeApp.submittedSnapshot)
  );
  const canReview = canRolePerform(activeRole, 'review');
  const canEdit = canRolePerform(activeRole, 'edit');

  const rawRequired = draft.data?.requiredSections;
  const rawCompleted = draft.data?.completedSections;
  const rawBody = draft.data?.body;
  const running =
    trigger.isPending || (ENV.DATA_SOURCE !== 'mock' && scan.data?.status === 'running');

  const {
    sectionItems,
    completeSections,
    incompleteSections,
    filledSections,
    allSectionsFilled,
    confidenceScore,
    currentSignature,
    auditStale,
    latestAuditFailedCurrent,
    failed,
    passed,
    auditHistory,
  } = useApplicationAuditState({
    requiredSections: rawRequired,
    completedSections: rawCompleted,
    work,
    exportBody: resolveApplicationNarrative(local.exportDocument, work, rawBody),
    contentRevision: local.contentRevision,
    auditedSignature: local.auditedSignature,
    profileRevisionId: pinnedProfileRevisionId,
    scanStatus: scan.data?.status,
    running,
  });

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

  const error = trigger.error ?? scan.error;

  const statusLabel = running
    ? 'Scanning…'
    : failed
      ? 'Action required'
      : auditStale
        ? 'Checks incomplete'
        : passed
          ? 'Checklist check passed'
          : 'Not scanned';
  const statusVariant = running
    ? 'pending'
    : failed
      ? 'failure'
      : auditStale
        ? 'pending'
        : passed
          ? 'verified'
          : 'neutral';

  const latestHistoryEntry = auditHistory[auditHistory.length - 1];
  const inspectedHistoryEntry =
    (selectedHistoryId
      ? auditHistory.find((entry) => entry.id === selectedHistoryId)
      : undefined) ?? latestHistoryEntry;

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
          <View style={styles.statusRow}>
            <StatusBadge label={statusLabel} variant={statusVariant} style={styles.centerBadge} />
            {auditStale && failed && (
              <StatusBadge label="Checks incomplete" variant="pending" style={styles.centerBadge} />
            )}
            <AppButton
              size="sm"
              variant="outline"
              label={`Audit history (${auditHistory.length})`}
              expanded={historyOpen}
              onPress={() => setHistoryOpen((current) => !current)}
            />
          </View>
          {historyOpen && (
            <View
              testID="audit-history-dropdown"
              style={[
                styles.historyPanel,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <AppText variant="label">Audit run history</AppText>
              {auditHistory.length === 0 ? (
                <AppText variant="caption" color="muted">
                  No audit turns recorded yet. Run an audit to log turn-by-turn results.
                </AppText>
              ) : (
                auditHistory
                  .slice()
                  .reverse()
                  .map((entry) => {
                    const selected = inspectedHistoryEntry?.id === entry.id;
                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.historyRow,
                          {
                            borderBottomColor: theme.border,
                            backgroundColor: selected
                              ? withAlpha(theme.primary, 0.1)
                              : theme.subtle,
                          },
                        ]}
                      >
                        <View style={styles.rowBetween}>
                          <AppButton
                            size="sm"
                            variant="outline"
                            selected={selected}
                            label={`Turn #${entry.turn} · ${entry.statusLabel}`}
                            accessibilityLabel={`Turn #${entry.turn} · ${entry.statusLabel}. Inspect audit run`}
                            onPress={() => setSelectedHistoryId(entry.id)}
                          />
                          <StatusBadge
                            label={`${entry.confidenceScore}%`}
                            variant={entry.status === 'passed' ? 'verified' : 'failure'}
                          />
                        </View>
                        <AppText variant="caption">
                          {entry.message} · {formatEventDate(entry.timestamp)}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          Profile: {entry.profileRevisionId}
                          {entry.sectionVersionId
                            ? ` · Draft commit: ${entry.sectionVersionId}`
                            : ''}
                        </AppText>
                      </View>
                    );
                  })
              )}
            </View>
          )}
        </View>
        <GrantContext grantId={grantId} />
        <WorkspaceStudioBar />
        <InfoCard tone="surface">
          <AppText color="muted" align="center">
            {ENV.DATA_SOURCE === 'mock'
              ? 'Checks required section completeness and flags edits requiring a fresh audit.'
              : 'Run an audit to request a review from your connected service.'}
          </AppText>
        </InfoCard>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3" align="center">
            Section completeness
          </AppText>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {[true, false].map((complete) => {
              const bucket = complete ? completeSections : incompleteSections;
              return (
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
                  {bucket.map((item) => (
                    <AppText
                      key={normalizeSectionTitle(item.title)}
                      variant="caption"
                      color={complete ? 'verified' : 'failure'}
                    >
                      {complete ? item.title : `${item.title} (${item.completionPct}% complete)`}
                    </AppText>
                  ))}
                  {bucket.length === 0 && (
                    <AppText variant="caption" color="muted">
                      None
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
          <ConfidenceGaugeReadout score={confidenceScore} />
          {auditStale && (
            <AppText
              variant="caption"
              color="pending"
              align="center"
              accessibilityLiveRegion="polite"
            >
              {latestAuditFailedCurrent
                ? 'Latest audit reported incomplete sections. Complete all required sections and run audit again before exporting.'
                : 'Checks incomplete — sections, descriptions, profile version, or Export text changed since your last audit. Run audit again before exporting.'}
            </AppText>
          )}
          <AppButton
            variant="primary"
            label={running ? 'Scanning…' : 'Run audit'}
            isLoading={running}
            disabled={!sectionItems.length || !canReview || isLocked}
            onPress={() => {
              if (!sectionItems.length || !canReview || isLocked) return;
              setSelectedHistoryId(null);
              trigger.mutate({
                snapshotSignature: currentSignature,
                allComplete: incompleteSections.length === 0,
                incompleteSectionTitles: incompleteSections.map((item) => item.title),
                confidenceScore,
                profileRevisionId: pinnedProfileRevisionId,
                sectionVersionId: work.versions[work.versions.length - 1]?.id ?? null,
                actor: nickname || 'Founder Lead',
              });
            }}
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
          {inspectedHistoryEntry ? (
            <AuditLogLine
              key={inspectedHistoryEntry.id}
              agent="agent-2-deterministic"
              message={`Turn #${inspectedHistoryEntry.turn}: ${inspectedHistoryEntry.message}`}
              status={inspectedHistoryEntry.status}
              timestamp={inspectedHistoryEntry.timestamp}
            />
          ) : ENV.DATA_SOURCE !== 'mock' ? (
            scan.data?.events.map((event) => <AuditLogLine key={event.id} {...event} />)
          ) : null}
        </View>

        <ProjectVersionSelectorCard
          slotKey={slotKey}
          grantId={grantId}
          sectionItems={sectionItems}
          filledSections={filledSections}
          allSectionsFilled={allSectionsFilled}
          canEdit={canEdit}
          canReview={canReview}
          isLocked={isLocked}
        />

        <BudgetChecklistCard slotKey={slotKey} canEdit={canEdit && !isLocked} />

        <View style={styles.chat}>
          <AppText variant="h3" align="center">
            Agent chat
          </AppText>
          <AppText variant="caption" color="muted" align="center">
            {AUDIT_COPY.llmDisclosure}
          </AppText>
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
        draftKey={slotKey}
        onSend={() => {
          if (!message.trim() && local.attachments.length === 0) return;
          scrollAfterNote.current = true;
          addNote(slotKey, message.trim(), 'user', { attachments: local.attachments });
          if (local.attachments.length > 0) setAttachments(slotKey, []);
          setMessage('');
        }}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.lg },
  heading: { alignItems: 'center', gap: SPACING.sm },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  historyPanel: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  historyRow: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderBottomWidth: 1,
    gap: SPACING.xs,
  },
  centerBadge: { alignSelf: 'center' },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
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
