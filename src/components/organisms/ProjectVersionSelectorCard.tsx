import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { RADIUS, SPACING } from '@/config/theme';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useTheme } from '@/hooks/useTheme';
import type { ActiveSectionItem } from '@/hooks/useApplicationAuditState';
import { useDraftStore } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useProgressStore } from '@/store/useProgressStore';
import {
  evaluateWorkSlotAudit,
  restoreVersion,
  saveVersion,
  upsertWorkbenchSection,
} from '@/utils/drafting';
import { evaluateFinishReview } from '@/utils/finishReview';
import { normalizeSectionTitle } from '@/utils/sectionCatalog';
import { generateId } from '@/utils/uuid';
import { getProfileSyncLag } from '@/utils/workspace';
import { posthog } from '@/config/posthog';

export interface ProjectVersionSelectorCardProps {
  slotKey: string;
  grantId: string;
  sectionItems: readonly ActiveSectionItem[];
  filledSections: readonly ActiveSectionItem[];
  allSectionsFilled: boolean;
  canEdit: boolean;
  canReview: boolean;
  isLocked?: boolean;
}

export function ProjectVersionSelectorCard({
  slotKey,
  grantId,
  sectionItems,
  filledSections,
  allSectionsFilled,
  canEdit,
  canReview,
  isLocked = false,
}: ProjectVersionSelectorCardProps) {
  const canEditSlot = canEdit && !isLocked;
  const canReviewSlot = canReview && !isLocked;
  const theme = useTheme();
  const [finishInfoOpen, setFinishInfoOpen] = useState(false);
  const [selectedSectionNorm, setSelectedSectionNorm] = useState('');
  const [sectionDraftState, setSectionDraftState] = useState<{
    norm: string;
    baseText: string;
    text: string;
  } | null>(null);
  const [commitSummary, setCommitSummary] = useState('');
  const [slotNotice, setSlotNotice] = useState('');
  const [slotError, setSlotError] = useState('');
  useEscapeDismiss(finishInfoOpen, () => setFinishInfoOpen(false));

  const markContentChanged = useDraftStore((state) => state.markContentChanged);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const setWorkSlotProfileRevision = useWorkspaceStore((state) => state.setWorkSlotProfileRevision);
  const setWorkSlotReviewStatus = useWorkspaceStore((state) => state.setWorkSlotReviewStatus);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const updateWorkbench = useWorkbenchStore((state) => state.update);
  const recordActivity = useProgressStore((state) => state.recordActivity);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const pinnedProfileRevisionId =
    activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest';
  const projectRevisions = useMemo(
    () => workspace.revisions.filter((r) => r.projectId === (activeProject?.id ?? activeProjectId)),
    [activeProject?.id, activeProjectId, workspace.revisions]
  );
  const syncLag = activeApp ? getProfileSyncLag(workspace, activeApp.id) : 0;
  const slotAudit = useMemo(() => evaluateWorkSlotAudit(work, syncLag), [syncLag, work]);
  const finishReview = useMemo(
    () =>
      evaluateFinishReview({
        status: activeApp?.status ?? 'drafting',
        filledSections: filledSections.length,
        totalSections: sectionItems.length,
        approvedRequirements: slotAudit.approvedRequirements,
        totalRequirements: slotAudit.totalRequirements,
        syncLag,
      }),
    [
      activeApp?.status,
      filledSections.length,
      sectionItems.length,
      slotAudit.approvedRequirements,
      slotAudit.totalRequirements,
      syncLag,
    ]
  );

  const selectedSectionItem = useMemo(() => {
    if (!sectionItems.length) return undefined;
    return (
      sectionItems.find((item) => normalizeSectionTitle(item.title) === selectedSectionNorm) ??
      sectionItems[0]
    );
  }, [sectionItems, selectedSectionNorm]);
  const activeSectionNorm = selectedSectionItem
    ? normalizeSectionTitle(selectedSectionItem.title)
    : '';
  const storeSectionText = selectedSectionItem?.text ?? '';
  const currentSectionText =
    sectionDraftState &&
    sectionDraftState.norm === activeSectionNorm &&
    sectionDraftState.baseText === storeSectionText
      ? sectionDraftState.text
      : storeSectionText;

  const pinnedStepIndex = projectRevisions.findIndex((rev) => rev.id === pinnedProfileRevisionId);
  const pinnedStepLabel =
    pinnedStepIndex >= 0
      ? `#${pinnedStepIndex + 1} (${pinnedProfileRevisionId})`
      : pinnedProfileRevisionId;

  return (
    <View
      testID="project-version-selector-card"
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.rowBetween}>
        <AppText variant="h3">Project Profile Versions &amp; Section Text Selector</AppText>
        <StatusBadge
          label={finishReview.status.toUpperCase()}
          variant={
            finishReview.status === 'submitted' || finishReview.status === 'ready'
              ? 'verified'
              : 'pending'
          }
        />
      </View>
      <AppText variant="caption" color="muted">
        Active Slot: {slotKey} · Project: {activeProject?.name ?? activeProjectId} · Pinned Profile:{' '}
        {pinnedStepLabel}
      </AppText>

      <View style={[styles.subSection, { borderTopColor: theme.border }]}>
        <AppText variant="label">Project Profile version commits</AppText>
        <View style={styles.chipsRow}>
          {projectRevisions.map((rev, idx) => {
            const stepNum = idx + 1;
            const isPinned = rev.id === pinnedProfileRevisionId;
            const isHead = rev.id === activeProject?.currentRevisionId;
            return (
              <AppButton
                key={rev.id}
                size="sm"
                variant="outline"
                selected={isPinned}
                disabled={!activeApp || !canEditSlot}
                label={`#${stepNum} ${rev.id}${isHead ? ' (HEAD)' : ''}`}
                accessibilityLabel={`#${stepNum} ${rev.id}${isHead ? ' (HEAD)' : ''}. Select profile commit`}
                onPress={() => {
                  if (!activeApp || !canEditSlot || isPinned) return;
                  try {
                    setWorkSlotProfileRevision(activeApp.id, rev.id);
                    markContentChanged(slotKey);
                    recordActivity(slotKey, {
                      actor: nickname || 'Founder Lead',
                      agent: 'system',
                      message: `Pinned profile commit #${stepNum} (${rev.id})`,
                    });
                    setSlotError('');
                    setSlotNotice(
                      `Pinned work slot to profile commit #${stepNum} (${rev.id}: ${rev.summary}).`
                    );
                  } catch (e) {
                    setSlotError(
                      e instanceof Error ? e.message : 'Unable to switch profile commit'
                    );
                  }
                }}
              />
            );
          })}
        </View>
        {projectRevisions[pinnedStepIndex] ? (
          <AppText variant="caption" color="muted">
            Pinned commit #{pinnedStepIndex + 1}: {projectRevisions[pinnedStepIndex].summary}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.subSection, { borderTopColor: theme.border }]}>
        <AppText variant="label">Section text selector &amp; version commits</AppText>
        {sectionItems.length > 0 ? (
          <>
            <View style={styles.chipsRow}>
              {sectionItems.map((item) => {
                const norm = normalizeSectionTitle(item.title);
                const isSelected = norm === activeSectionNorm;
                return (
                  <AppButton
                    key={norm}
                    size="sm"
                    variant="outline"
                    selected={isSelected}
                    label={`${item.title} (${item.isFilled ? `${item.completionPct}%` : 'Empty'})`}
                    accessibilityLabel={`${item.title} (${item.isFilled ? `${item.completionPct}%` : 'Empty'}). Select section`}
                    onPress={() => {
                      setSelectedSectionNorm(norm);
                      setSectionDraftState(null);
                    }}
                  />
                );
              })}
            </View>
            {selectedSectionItem && (
              <View style={{ gap: SPACING.xs }}>
                <AppText variant="caption" color="muted">
                  Requirement: {selectedSectionItem.description}
                </AppText>
                <AppTextArea
                  label={`Section text (${selectedSectionItem.title})`}
                  placeholder={`Write or inspect ${selectedSectionItem.title} text...`}
                  value={currentSectionText}
                  editable={canEditSlot}
                  charLimit={10000}
                  onChangeText={(text) =>
                    setSectionDraftState({
                      norm: activeSectionNorm,
                      baseText: storeSectionText,
                      text,
                    })
                  }
                />
                <View style={styles.chipsRow}>
                  <AppButton
                    size="sm"
                    variant="primary"
                    label="Save section text"
                    disabled={!canEditSlot}
                    onPress={() => {
                      if (!canEditSlot) return;
                      const prevText = selectedSectionItem.text ?? '';
                      if (currentSectionText === prevText) {
                        setSlotError('');
                        setSlotNotice(`No changes in "${selectedSectionItem.title}".`);
                        return;
                      }
                      updateWorkbench(slotKey, (current) =>
                        upsertWorkbenchSection(current, {
                          title: selectedSectionItem.title,
                          text: currentSectionText,
                          description: selectedSectionItem.isFixed
                            ? undefined
                            : selectedSectionItem.description,
                        })
                      );
                      markContentChanged(slotKey);
                      recordActivity(slotKey, {
                        actor: nickname || 'Founder Lead',
                        agent: 'agent-1-narrative',
                        message: `Updated section text: ${selectedSectionItem.title}`,
                      });
                      setSectionDraftState(null);
                      setSlotError('');
                      setSlotNotice(
                        `Saved "${selectedSectionItem.title}" section text. Run Audit to verify.`
                      );
                    }}
                  />
                </View>
              </View>
            )}
          </>
        ) : (
          <AppText variant="caption" color="muted">
            No required sections in this work slot yet.
          </AppText>
        )}

        <View style={{ gap: SPACING.xs, paddingTop: SPACING.xs }}>
          <AppInput
            label="Section version commit summary"
            placeholder="Describe this section text commit (e.g. Added pilot budget breakdown)"
            value={commitSummary}
            editable={canEditSlot}
            onChangeText={setCommitSummary}
          />
          <AppButton
            size="sm"
            variant="outline"
            label={`Commit section version (#${work.versions.length + 1})`}
            disabled={!canEditSlot}
            onPress={() => {
              if (!canEditSlot) return;
              try {
                const nextStep = work.versions.length + 1;
                const versionId = `v${nextStep}-${generateId('commit').slice(-4)}`;
                const summaryText = commitSummary.trim() || `Section snapshot #${nextStep}`;
                const editedActive = Boolean(
                  selectedSectionItem && currentSectionText !== (selectedSectionItem.text ?? '')
                );
                updateWorkbench(slotKey, (current) => {
                  const synced =
                    editedActive && selectedSectionItem
                      ? upsertWorkbenchSection(current, {
                          title: selectedSectionItem.title,
                          text: currentSectionText,
                          description: selectedSectionItem.isFixed
                            ? undefined
                            : selectedSectionItem.description,
                        })
                      : current;
                  return saveVersion(
                    synced,
                    versionId,
                    new Date().toISOString(),
                    summaryText,
                    nickname || 'You'
                  );
                });
                if (editedActive) markContentChanged(slotKey);
                recordActivity(slotKey, {
                  actor: nickname || 'Founder Lead',
                  agent: 'system',
                  message: `Committed section version #${nextStep}: ${summaryText}`,
                });
                setSectionDraftState(null);
                setCommitSummary('');
                setSlotError('');
                setSlotNotice(`Committed section version #${nextStep}: ${summaryText}`);
              } catch (e) {
                setSlotError(e instanceof Error ? e.message : 'Unable to commit section version');
              }
            }}
          />
          {work.versions.length > 0 && (
            <View style={styles.chipsRow}>
              {work.versions.map((ver, idx) => {
                const stepNum = idx + 1;
                return (
                  <AppButton
                    key={ver.id}
                    size="sm"
                    variant="outline"
                    disabled={!canEditSlot}
                    label={`Restore #${stepNum}: ${ver.summary}`}
                    accessibilityLabel={`Restore #${stepNum}: ${ver.summary}. Section text version`}
                    onPress={() => {
                      if (!canEditSlot) return;
                      try {
                        const backupId = `v${work.versions.length + 1}-${generateId('backup').slice(-4)}`;
                        updateWorkbench(slotKey, (current) =>
                          restoreVersion(current, ver.id, backupId, new Date().toISOString())
                        );
                        setSectionDraftState(null);
                        markContentChanged(slotKey);
                        recordActivity(slotKey, {
                          actor: nickname || 'Founder Lead',
                          agent: 'system',
                          message: `Restored section version #${stepNum} (${ver.summary})`,
                        });
                        setSlotError('');
                        setSlotNotice(
                          `Restored section text from commit #${stepNum} (${ver.summary}).`
                        );
                      } catch (e) {
                        setSlotError(
                          e instanceof Error ? e.message : 'Unable to restore section version'
                        );
                      }
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      </View>

      <AppText variant="body">
        • Sections filled: {filledSections.length}/{sectionItems.length}
        {'\n'}• Requirement Matrix Approvals: {slotAudit.approvedRequirements}/
        {slotAudit.totalRequirements} approved
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
      {slotNotice ? (
        <AppText color="verified" accessibilityLiveRegion="polite">
          {slotNotice}
        </AppText>
      ) : null}
      {activeApp && (
        <View style={styles.chipsRow}>
          <AppButton
            size="sm"
            variant="outline"
            label="Mark in review"
            disabled={
              !finishReview.canTransition ||
              (!canEditSlot && !canReviewSlot) ||
              finishReview.status === 'review'
            }
            onPress={() => {
              if (!finishReview.canTransition || (!canEditSlot && !canReviewSlot)) return;
              try {
                setWorkSlotReviewStatus(activeApp.id, 'review');
                recordActivity(slotKey, {
                  actor: nickname || 'Founder Lead',
                  agent: 'system',
                  message: 'Marked application IN REVIEW',
                });
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
              (!canEditSlot && !canReviewSlot) ||
              !allSectionsFilled ||
              finishReview.status === 'ready'
            }
            onPress={() => {
              if (!finishReview.canTransition || (!canEditSlot && !canReviewSlot)) return;
              try {
                setWorkSlotReviewStatus(
                  activeApp.id,
                  'ready',
                  sectionItems.map((item) => item.title)
                );
                recordActivity(slotKey, {
                  actor: nickname || 'Founder Lead',
                  agent: 'system',
                  message: 'Finished application review checks (marked READY)',
                });
                posthog?.capture('application_marked_ready', {
                  filled_section_count: filledSections.length,
                  required_section_count: sectionItems.length,
                  approved_requirement_count: slotAudit.approvedRequirements,
                });
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
              !finishReview.canTransition || !canEditSlot || finishReview.status === 'drafting'
            }
            onPress={() => {
              if (!finishReview.canTransition || !canEditSlot) return;
              try {
                setWorkSlotReviewStatus(activeApp.id, 'drafting');
                recordActivity(slotKey, {
                  actor: nickname || 'Founder Lead',
                  agent: 'system',
                  status: 'running',
                  message: 'Reopened application to DRAFTING',
                });
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
        <View style={[styles.subSection, { borderTopColor: theme.border }]}>
          <AppText variant="caption" color="pending">
            Cross-Slot Profile Sync Lag: Project Profile is {syncLag} commit(s) ahead of this
            application slot ({activeApp.profileRevisionId} → {activeProject?.currentRevisionId}).
          </AppText>
          <AppButton
            size="sm"
            variant="outline"
            label="Pull Latest Profile Revision"
            disabled={!canEditSlot}
            onPress={() => {
              if (!canEditSlot) return;
              try {
                pullWorkSlotProfile(activeApp.id);
                markContentChanged(slotKey);
                recordActivity(slotKey, {
                  actor: nickname || 'Founder Lead',
                  agent: 'system',
                  message: `Pulled latest profile revision ${activeProject?.currentRevisionId}`,
                });
                setSlotError('');
                setSlotNotice(
                  `Pulled latest profile revision ${activeProject?.currentRevisionId} into work slot.`
                );
              } catch (e) {
                setSlotError(e instanceof Error ? e.message : 'Unable to pull profile revision');
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
          disabled={!canReviewSlot}
          onPress={() => {
            if (!canReviewSlot) return;
            updateWorkbench(slotKey, (current) => ({
              ...current,
              requirementMappings: (current.requirementMappings ?? []).map((m) => ({
                ...m,
                reviewStatus: 'approved',
              })),
            }));
            recordActivity(slotKey, {
              actor: nickname || 'Founder Lead',
              agent: 'agent-2-deterministic',
              message: `Approved all ${slotAudit.totalRequirements} requirement mappings`,
            });
            setSlotNotice(
              `Approved all ${slotAudit.totalRequirements} requirement mappings as ${activeRole.toUpperCase()}.`
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  subSection: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
});
