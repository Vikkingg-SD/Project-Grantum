import React, { useMemo, useRef, useState } from 'react';
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
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus, useTriggerAuditScan } from '@/api/hooks/useAuditScan';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useApplicationAuditState } from '@/hooks/useApplicationAuditState';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { AUDIT_COPY } from '@/config/copy';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';
import { evaluateWorkSlotAudit, hasAuthoredDraft } from '@/utils/drafting';
import { evaluateFinishReview } from '@/utils/finishReview';
import { normalizeSectionTitle } from '@/utils/sectionCatalog';
import { canRolePerform, getProfileSyncLag, workSlotKey } from '@/utils/workspace';

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
  const [finishInfoOpen, setFinishInfoOpen] = useState(false);
  useEscapeDismiss(mobile && promptsOpen, () => setPromptsOpen(false));
  useEscapeDismiss(finishInfoOpen, () => setFinishInfoOpen(false));
  const [slotNotice, setSlotNotice] = useState('');
  const [slotError, setSlotError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const draft = useProposalDraft(grantId);
  const scan = useAuditStatus(grantId);
  const trigger = useTriggerAuditScan(grantId, slotKey);
  const local = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addAuditMessage);
  const setAttachments = useDraftStore((state) => state.setAttachments);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const setWorkSlotReviewStatus = useWorkspaceStore((state) => state.setWorkSlotReviewStatus);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const updateWorkbench = useWorkbenchStore((state) => state.update);
  const [message, setMessage] = useState('');

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const syncLag = activeApp ? getProfileSyncLag(workspace, activeApp.id) : 0;
  const slotAudit = useMemo(() => evaluateWorkSlotAudit(work, syncLag), [syncLag, work]);
  const finishReview = useMemo(
    () =>
      evaluateFinishReview({
        status: activeApp?.status ?? 'drafting',
        filledSections: slotAudit.filledSections,
        totalSections: slotAudit.totalSections,
        approvedRequirements: slotAudit.approvedRequirements,
        totalRequirements: slotAudit.totalRequirements,
        syncLag,
      }),
    [activeApp?.status, slotAudit, syncLag]
  );
  const canReview = canRolePerform(activeRole, 'review');
  const canEdit = canRolePerform(activeRole, 'edit');

  const rawRequired = draft.data?.requiredSections;
  const rawCompleted = draft.data?.completedSections;
  const rawBody = draft.data?.body;
  const running = trigger.isPending || scan.data?.status === 'running';

  const {
    sectionItems,
    completeSections,
    incompleteSections,
    confidenceScore,
    currentSignature,
    auditStale,
    failed,
    passed,
  } = useApplicationAuditState({
    requiredSections: rawRequired,
    completedSections: rawCompleted,
    work,
    exportBody: local.exportDocument ?? rawBody ?? '',
    contentRevision: local.contentRevision,
    auditedSignature: local.auditedSignature,
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
          <StatusBadge label={statusLabel} variant={statusVariant} style={styles.centerBadge} />
          {auditStale && failed && (
            <StatusBadge label="Checks incomplete" variant="pending" style={styles.centerBadge} />
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
              Checks incomplete — sections, descriptions, or Export text changed since your last
              audit. Run audit again before exporting.
            </AppText>
          )}
          <AppButton
            variant="primary"
            label={running ? 'Scanning…' : 'Run audit'}
            isLoading={running}
            disabled={!sectionItems.length}
            onPress={() => {
              trigger.mutate({
                snapshotSignature: currentSignature,
                allComplete: incompleteSections.length === 0,
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
          {scan.data?.events.map((event) => (
            <AuditLogLine key={event.id} {...event} />
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">Work Slot Grounding &amp; Reviewer Compliance</AppText>
            <View style={styles.chipsRow}>
              <StatusBadge
                label={finishReview.status.toUpperCase()}
                variant={
                  finishReview.status === 'submitted' || finishReview.status === 'ready'
                    ? 'verified'
                    : 'pending'
                }
              />
              <StatusBadge
                label={slotAudit.readyForHandoff ? 'Handoff Ready' : 'Review Items'}
                variant={slotAudit.readyForHandoff ? 'verified' : 'pending'}
              />
            </View>
          </View>
          <AppText variant="caption" color="muted">
            Active Slot: {slotKey} · Project: {activeProject?.name ?? activeProjectId} · Pinned
            Profile: {activeApp?.profileRevisionId ?? activeProject?.currentRevisionId}
          </AppText>
          <AppText variant="body">
            • Sections drafted: {slotAudit.filledSections}/{slotAudit.totalSections}
            {'\n'}• Requirement Matrix Approvals: {slotAudit.approvedRequirements}/
            {slotAudit.totalRequirements} approved
            {'\n'}• File Attachments: {local.attachments.length} staged
            {'\n'}• Finish review checks: {finishReview.passedCount}/{finishReview.totalCount} ready
          </AppText>
          <AppButton
            size="sm"
            variant="ghost"
            label={finishReview.reversibilityTitle}
            expanded={finishInfoOpen}
            onPress={() => setFinishInfoOpen(!finishInfoOpen)}
          />
          {finishInfoOpen && (
            <AppText variant="caption" color="muted">
              {finishReview.reversibilityNote}
            </AppText>
          )}
          {slotError ? (
            <AppText color="failureText" accessibilityRole="alert">
              {slotError}
            </AppText>
          ) : null}
          {slotNotice ? <AppText color="verified">{slotNotice}</AppText> : null}
          {activeApp && (
            <View style={styles.chipsRow}>
              <AppButton
                size="sm"
                variant="outline"
                label="Mark in review"
                disabled={
                  !finishReview.canTransition ||
                  (!canEdit && !canReview) ||
                  finishReview.status === 'review'
                }
                onPress={() => {
                  try {
                    setWorkSlotReviewStatus(activeApp.id, 'review');
                    setSlotError('');
                    setSlotNotice('Application marked IN REVIEW. Editing remains reversible.');
                  } catch (e) {
                    setSlotError(e instanceof Error ? e.message : 'Unable to update status');
                  }
                }}
              />
              <AppButton
                size="sm"
                variant="primary"
                label="Finish application (mark ready)"
                disabled={
                  !finishReview.canTransition ||
                  (!canEdit && !canReview) ||
                  !hasAuthoredDraft(work) ||
                  finishReview.status === 'ready'
                }
                onPress={() => {
                  try {
                    setWorkSlotReviewStatus(activeApp.id, 'ready');
                    setSlotError('');
                    setSlotNotice(
                      'Application marked READY. You can reopen it at any time; nothing was sent externally.'
                    );
                  } catch (e) {
                    setSlotError(e instanceof Error ? e.message : 'Unable to finish application');
                  }
                }}
              />
              <AppButton
                size="sm"
                variant="outline"
                label="Reopen for drafting"
                disabled={
                  !finishReview.canTransition || !canEdit || finishReview.status === 'drafting'
                }
                onPress={() => {
                  try {
                    setWorkSlotReviewStatus(activeApp.id, 'drafting');
                    setSlotError('');
                    setSlotNotice('Work slot reopened to DRAFTING for further edits.');
                  } catch (e) {
                    setSlotError(e instanceof Error ? e.message : 'Unable to reopen application');
                  }
                }}
              />
            </View>
          )}
          {syncLag > 0 && activeApp && (
            <View
              style={[styles.subBox, { backgroundColor: theme.subtle, borderColor: theme.border }]}
            >
              <AppText variant="caption" color="pending">
                Cross-Slot Profile Sync Lag: Project Profile is {syncLag} commit(s) ahead of this
                application slot ({activeApp.profileRevisionId} → {activeProject?.currentRevisionId}
                ).
              </AppText>
              <AppButton
                size="sm"
                variant="outline"
                label="Pull Latest Profile Revision"
                disabled={!canEdit || activeApp.status === 'submitted'}
                onPress={() => {
                  try {
                    pullWorkSlotProfile(activeApp.id);
                    setSlotError('');
                    setSlotNotice(
                      `Pulled latest profile revision ${activeProject?.currentRevisionId} into work slot.`
                    );
                  } catch (e) {
                    setSlotError(
                      e instanceof Error ? e.message : 'Unable to pull profile revision'
                    );
                  }
                }}
              />
            </View>
          )}
          {slotAudit.pendingRequirements > 0 && (
            <AppButton
              size="sm"
              variant="outline"
              label={`Approve All Mapped Requirements (${slotAudit.pendingRequirements} pending)`}
              disabled={!canReview}
              onPress={() => {
                updateWorkbench(slotKey, (current) => ({
                  ...current,
                  requirementMappings: (current.requirementMappings ?? []).map((m) => ({
                    ...m,
                    reviewStatus: 'approved',
                  })),
                }));
                setSlotNotice(
                  `Approved all ${slotAudit.totalRequirements} requirement mappings as ${activeRole.toUpperCase()}.`
                );
              }}
            />
          )}
        </View>

        <BudgetChecklistCard slotKey={slotKey} canEdit={canEdit} />

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
  centerBadge: { alignSelf: 'center' },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  subBox: { padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, gap: SPACING.xs },
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
