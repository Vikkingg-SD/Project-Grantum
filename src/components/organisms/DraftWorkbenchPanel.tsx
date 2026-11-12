import React, { useState } from 'react';
import { View, ScrollView, Linking, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { AppInput } from '../atoms/AppInput';
import { AppTextArea } from '../atoms/AppTextArea';
import { StatusBadge } from '../atoms/StatusBadge';
import { ModalSheetLayout } from '../templates/ModalSheetLayout';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  acceptSuggestion,
  type TextSuggestion,
  applyTemplate,
  buildSectionSuggestion,
  bundleText,
  computeLineDiff,
  DEFAULT_PITCH_SLIDES,
  fullArtifactBundleText,
  recordSubmission,
  restoreVersion,
  saveVersion,
  syncGrantRequirements,
  templates,
  validSource,
} from '@/utils/drafting';
import { canRolePerform, getProfileSyncLag, parseVaultDocs, workSlotKey } from '@/utils/workspace';
import { generateId } from '@/utils/uuid';
import type { OutputKind, ProjectKind } from '@/types/workspace';
import { RADIUS, SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useTheme } from '@/hooks/useTheme';

export function DraftWorkbenchPanel({
  grantId,
  grantRequirements = [],
  visible,
  onClose,
  suggestion,
  onDismissSuggestion,
}: {
  grantId: string;
  grantRequirements?: string[];
  visible: boolean;
  onClose: () => void;
  suggestion?: TextSuggestion;
  onDismissSuggestion?: () => void;
}) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const markWorkSlotSubmitted = useWorkspaceStore((state) => state.markWorkSlotSubmitted);

  const key = workSlotKey(activeProjectId, grantId);
  const work = useWorkbenchStore((state) => state.work[key] ?? EMPTY_WORKBENCH);
  const update = useWorkbenchStore((state) => state.update);
  const setExport = useDraftStore((state) => state.setExportDocument);
  const localDraft = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);
  const vaultDocs = parseVaultDocs(activeRevision?.fields.vaultDocs);
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const syncLag = activeApp ? getProfileSyncLag(workspace, activeApp.id) : 0;

  const canEdit = canRolePerform(activeRole, 'edit');
  const canReview = canRolePerform(activeRole, 'review');
  const canSubmit = canRolePerform(activeRole, 'submit');

  const [kind, setKind] = useState<ProjectKind>(work.kind);
  const [outputs, setOutputs] = useState<OutputKind[]>([...work.outputs]);
  const [summary, setSummary] = useState('');
  const [receipt, setReceipt] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [compare, setCompare] = useState<string | null>(null);
  const [localSuggestion, setLocalSuggestion] = useState<TextSuggestion | null>(null);
  const activeSuggestion = suggestion ?? localSuggestion;
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSource, setSectionSource] = useState('');
  const [tab, setTab] = useState<'templates' | 'edit' | 'requirements' | 'history' | 'review'>(
    'templates'
  );

  const act = (action: () => void, message = '') => {
    try {
      action();
      setError('');
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update draft');
    }
  };

  const officialGrantUrl = `https://grants.example.org/opportunities/${encodeURIComponent(grantId)}`;
  const slides = work.pitchSlides ?? DEFAULT_PITCH_SLIDES;
  const mappings = work.requirementMappings ?? [];

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Form templates and drafting"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}
      >
        <View style={styles.headerRow}>
          <AppText variant="h2">Form templates and drafting</AppText>
          <StatusBadge
            label={`${activeRole.toUpperCase()} · ${persistenceStatus === 'device-saved' ? 'Saved on device' : 'Session preview'}`}
            variant={persistenceStatus === 'device-saved' ? 'verified' : 'neutral'}
          />
        </View>
        <AppText color="muted">
          Isolated Work Slot ({key}) for project &quot;{activeProject?.name ?? activeProjectId}
          &quot;. Switch Project Profile Slots to draft a separate application for this same grant.
        </AppText>

        {!canEdit && (
          <StatusBadge
            label={`Read-only editing (${activeRole.toUpperCase()} role cannot modify sections)`}
            variant="pending"
          />
        )}

        <View style={!mobile ? styles.splitLayout : styles.stackedLayout}>
          <View
            style={[
              styles.contextDock,
              !mobile && styles.contextDockWide,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <AppText variant="h3">Workspace Context Dock</AppText>
            <AppText variant="caption" color="muted">
              Active Project Profile Slot:
            </AppText>
            <View style={styles.rowWrap}>
              {workspace.projects
                .filter((p) => !p.archivedAt)
                .map((proj) => (
                  <AppButton
                    key={proj.id}
                    size="sm"
                    label={proj.name}
                    selected={proj.id === activeProjectId}
                    onPress={() => {
                      setActiveProject(proj.id);
                      setNotice(`Switched studio slot to "${proj.name}".`);
                    }}
                  />
                ))}
            </View>

            {syncLag > 0 && activeApp && (
              <View
                style={[
                  styles.syncBox,
                  { backgroundColor: theme.subtle, borderColor: theme.border },
                ]}
              >
                <AppText variant="caption">
                  Profile Sync Alert: Project Profile is {syncLag} commit(s) ahead of this work slot
                  ({activeApp.profileRevisionId} → {activeProject?.currentRevisionId}).
                </AppText>
                <AppButton
                  size="sm"
                  label="Pull Latest Profile Revision"
                  disabled={!canEdit || activeApp.status === 'submitted'}
                  onPress={() =>
                    act(
                      () => pullWorkSlotProfile(activeApp.id),
                      `Pulled profile revision ${activeProject?.currentRevisionId}.`
                    )
                  }
                />
              </View>
            )}

            <AppText variant="caption" color="muted">
              Grounded local files attached: {localDraft.attachments.length} · Profile Vault Docs:{' '}
              {vaultDocs.length} · Saved versions: {work.versions.length}
            </AppText>
            {vaultDocs.length > 0 && (
              <View style={styles.rowWrap}>
                {vaultDocs.map((doc) => (
                  <StatusBadge key={doc} label={doc} variant="neutral" />
                ))}
              </View>
            )}
          </View>

          <View style={styles.mainCanvas}>
            <View style={styles.rowWrap}>
              {(['templates', 'edit', 'requirements', 'history', 'review'] as const).map(
                (value) => (
                  <AppButton
                    key={value}
                    label={
                      {
                        templates: 'Templates',
                        edit: 'Sections',
                        requirements: 'Requirements',
                        history: 'History',
                        review: 'Review & handoff',
                      }[value]
                    }
                    selected={tab === value}
                    onPress={() => setTab(value)}
                  />
                )
              )}
            </View>

            {error ? (
              <AppText accessibilityRole="alert" color="failureText">
                {error}
              </AppText>
            ) : null}
            {notice ? <AppText accessibilityLiveRegion="polite">{notice}</AppText> : null}

            {tab === 'templates' && (
              <>
                <AppText variant="h3">Project type</AppText>
                <View style={styles.rowWrap}>
                  {(Object.keys(templates) as ProjectKind[]).map((value) => (
                    <AppButton
                      key={value}
                      label={value}
                      selected={kind === value}
                      disabled={!canEdit}
                      onPress={() => setKind(value)}
                    />
                  ))}
                </View>
                <AppText variant="h3">Requested outputs</AppText>
                <View style={styles.rowWrap}>
                  {(['application', 'pitch-deck', 'document'] as OutputKind[]).map((value) => (
                    <AppButton
                      key={value}
                      label={value}
                      selected={outputs.includes(value)}
                      disabled={!canEdit}
                      onPress={() =>
                        setOutputs((current) =>
                          current.includes(value)
                            ? current.filter((item) => item !== value)
                            : [...current, value]
                        )
                      }
                    />
                  ))}
                </View>
                <AppText>
                  Suggested sections: {templates[kind].join(', ')}. Applying adds missing sections
                  and preserves existing text.
                </AppText>
                <View style={styles.rowWrap}>
                  <AppButton
                    label="Apply template"
                    disabled={!outputs.length || !canEdit}
                    onPress={() =>
                      act(() => {
                        update(key, (current) => applyTemplate(current, kind, outputs));
                        setTab('edit');
                      }, 'Template applied in this session.')
                    }
                  />
                  {grantRequirements.length > 0 && (
                    <AppButton
                      variant="outline"
                      label={`Sync grant track requirements (${grantRequirements.length})`}
                      disabled={!canEdit}
                      onPress={() =>
                        act(() => {
                          update(key, (current) =>
                            syncGrantRequirements(current, grantRequirements, officialGrantUrl)
                          );
                          setTab('requirements');
                        }, 'Synced grant track requirements with official source URL.')
                      }
                    />
                  )}
                </View>
                <AppText color="muted">
                  Add a source-backed requirement manually below or sync official grant requirements
                  above.
                </AppText>
                <AppInput
                  label="Additional requirement"
                  value={sectionTitle}
                  onChangeText={setSectionTitle}
                  editable={canEdit}
                  maxLength={120}
                />
                <AppInput
                  label="Official requirement source URL"
                  value={sectionSource}
                  onChangeText={setSectionSource}
                  editable={canEdit}
                  autoCapitalize="none"
                />
                <AppButton
                  label="Accept requirement"
                  disabled={!canEdit || !sectionTitle.trim() || !validSource(sectionSource)}
                  onPress={() =>
                    act(() => {
                      update(key, (current) =>
                        syncGrantRequirements(current, [sectionTitle.trim()], sectionSource.trim())
                      );
                      setSectionTitle('');
                      setSectionSource('');
                    }, 'Requirement added.')
                  }
                />
              </>
            )}

            {tab === 'edit' && (
              <>
                {!work.sections.length && (
                  <AppText>No sections yet. Choose a template to begin.</AppText>
                )}
                {work.sections.map((section) => (
                  <View key={section.id} style={{ gap: SPACING.sm }}>
                    <AppTextArea
                      label={section.title}
                      value={section.text}
                      charLimit={10000}
                      onChangeText={(text) => {
                        if (!canEdit) return;
                        update(key, (current) => ({
                          ...current,
                          sections: current.sections.map((s) =>
                            s.id === section.id ? { ...s, text } : s
                          ),
                        }));
                      }}
                    />
                    <AppInput
                      label={`Evidence URL for ${section.title}`}
                      value={section.evidence}
                      editable={canEdit}
                      autoCapitalize="none"
                      onChangeText={(evidence) =>
                        update(key, (current) => ({
                          ...current,
                          sections: current.sections.map((s) =>
                            s.id === section.id ? { ...s, evidence } : s
                          ),
                        }))
                      }
                    />
                    <AppButton
                      size="sm"
                      variant="ghost"
                      label={`Preview grounded AI diff suggestion for ${section.title}`}
                      disabled={!canEdit}
                      onPress={() =>
                        setLocalSuggestion(
                          buildSectionSuggestion(
                            section,
                            activeProject?.name ?? activeProjectId,
                            officialGrantUrl
                          )
                        )
                      }
                    />
                  </View>
                ))}

                {work.outputs.includes('pitch-deck') && (
                  <View
                    style={[
                      styles.subCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <AppText variant="h3">Pitch Deck Slide Outline</AppText>
                    {slides.map((slide) => (
                      <AppInput
                        key={slide.id}
                        label={slide.title}
                        placeholder="Key slide talking points & metrics..."
                        value={slide.bulletPoints}
                        editable={canEdit}
                        onChangeText={(bulletPoints) =>
                          update(key, (current) => ({
                            ...current,
                            pitchSlides: (current.pitchSlides ?? DEFAULT_PITCH_SLIDES).map((s) =>
                              s.id === slide.id ? { ...s, bulletPoints } : s
                            ),
                          }))
                        }
                      />
                    ))}
                  </View>
                )}

                <AppInput
                  label="Version change summary"
                  value={summary}
                  editable={canEdit}
                  onChangeText={setSummary}
                  maxLength={200}
                />
                <AppButton
                  label="Save session version"
                  disabled={!canEdit || !work.sections.length || !summary.trim()}
                  onPress={() =>
                    act(() => {
                      update(key, (current) =>
                        saveVersion(
                          current,
                          generateId('version'),
                          new Date().toISOString(),
                          summary,
                          `${nickname} (${activeRole})`
                        )
                      );
                      setSummary('');
                    }, 'Version saved in this session.')
                  }
                />
                <AppText color="muted">
                  AI rewriting is offline. Your manual edits remain available; no generated text has
                  been applied.
                </AppText>
              </>
            )}

            {tab === 'requirements' && (
              <>
                <AppText variant="h3">Requirement-to-Section-to-Evidence Matrix</AppText>
                {mappings.length === 0 ? (
                  <AppText color="muted">
                    No track requirements mapped yet. Use &quot;Sync grant track requirements&quot;
                    or &quot;Accept requirement&quot; in Templates.
                  </AppText>
                ) : (
                  mappings.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.subCard,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.headerRow}>
                        <AppText variant="body">{item.requirement}</AppText>
                        <StatusBadge
                          label={item.reviewStatus.toUpperCase()}
                          variant={
                            item.reviewStatus === 'approved'
                              ? 'verified'
                              : item.reviewStatus === 'in-review'
                                ? 'pending'
                                : 'neutral'
                          }
                        />
                      </View>
                      <AppText variant="caption" color="muted">
                        Official Source: {item.sourceUrl} · Owner: {item.owner}
                      </AppText>
                      <View style={styles.rowWrap}>
                        {(['drafting', 'in-review', 'approved'] as const).map((status) => (
                          <AppButton
                            key={status}
                            size="sm"
                            label={status}
                            selected={item.reviewStatus === status}
                            disabled={!canReview}
                            onPress={() =>
                              update(key, (current) => ({
                                ...current,
                                requirementMappings: (current.requirementMappings ?? []).map((m) =>
                                  m.id === item.id ? { ...m, reviewStatus: status } : m
                                ),
                              }))
                            }
                          />
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {activeSuggestion && (
              <View
                style={[
                  styles.subCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <AppText variant="h3">Review suggested change</AppText>
                <AppText>Original: {activeSuggestion.original}</AppText>
                <AppText color="verified">Proposed: {activeSuggestion.proposed}</AppText>
                {activeSuggestion.sources.map((source) => (
                  <AppButton
                    key={source}
                    label={source}
                    disabled={!validSource(source)}
                    onPress={() => {
                      void Linking.openURL(source).catch(() => setError('Could not open source.'));
                    }}
                  />
                ))}
                <View style={styles.rowWrap}>
                  <AppButton
                    label="Accept suggestion"
                    disabled={!canEdit}
                    onPress={() =>
                      act(() => {
                        update(key, (current) =>
                          acceptSuggestion(
                            current,
                            activeSuggestion,
                            generateId('version'),
                            new Date().toISOString()
                          )
                        );
                        setLocalSuggestion(null);
                        onDismissSuggestion?.();
                      }, 'Accepted. Open History to restore the original text.')
                    }
                  />
                  <AppButton
                    label="Reject suggestion"
                    variant="outline"
                    onPress={() => {
                      setLocalSuggestion(null);
                      onDismissSuggestion?.();
                      setNotice('Suggestion rejected. Your text is unchanged.');
                    }}
                  />
                </View>
              </View>
            )}

            {tab === 'history' && (
              <>
                {!work.versions.length && <AppText>No saved versions yet.</AppText>}
                {[...work.versions].reverse().map((version) => (
                  <View
                    key={version.id}
                    style={[
                      styles.subCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <AppText variant="h3">{version.summary}</AppText>
                    <AppText variant="caption" color="muted">
                      {version.author} · {version.createdAt}
                    </AppText>
                    <AppButton
                      label="Compare with current"
                      onPress={() => setCompare(compare === version.id ? null : version.id)}
                    />
                    {compare === version.id && (
                      <>
                        {version.sections.map((section) => {
                          const currentText =
                            work.sections.find((s) => s.id === section.id)?.text ?? '';
                          const diffLines = computeLineDiff(section.text, currentText);
                          return (
                            <View key={section.id} style={{ gap: SPACING.xs }}>
                              <AppText variant="body">{section.title}</AppText>
                              <AppText variant="caption">
                                Saved: {section.text || '(empty)'}
                              </AppText>
                              <AppText variant="caption">
                                Current: {currentText || '(empty or removed)'}
                              </AppText>
                              {diffLines.map((d, idx) => (
                                <AppText
                                  key={`${section.id}-d-${idx}`}
                                  variant="caption"
                                  color={
                                    d.type === 'added'
                                      ? 'verified'
                                      : d.type === 'removed'
                                        ? 'failureText'
                                        : 'muted'
                                  }
                                >
                                  {d.type === 'added'
                                    ? `+ ${d.line}`
                                    : d.type === 'removed'
                                      ? `- ${d.line}`
                                      : `  ${d.line}`}
                                </AppText>
                              ))}
                            </View>
                          );
                        })}
                        <AppButton
                          label="Restore this version (preserve current)"
                          disabled={!canEdit}
                          onPress={() =>
                            act(
                              () =>
                                update(key, (current) =>
                                  restoreVersion(
                                    current,
                                    version.id,
                                    generateId('version'),
                                    new Date().toISOString()
                                  )
                                ),
                              'Restored. Previous work remains in history.'
                            )
                          }
                        />
                      </>
                    )}
                  </View>
                ))}
              </>
            )}

            {tab === 'review' && (
              <>
                <AppText variant="h3">Bundle review</AppText>
                <AppText>Outputs: {work.outputs.join(', ')}</AppText>
                <AppText>
                  {work.sections.filter((s) => s.text.trim()).length}/{work.sections.length}{' '}
                  sections have text. This is not an AI assessment or eligibility verdict.
                </AppText>
                <AppText>{bundleText(work) || 'No content to review.'}</AppText>
                <AppText color="muted">
                  Open the Grant Detail sheet to inspect the structured Verifiable Match Report for
                  your active Project Profile Slot.
                </AppText>
                <AppButton
                  label="Use reviewed text in Export"
                  disabled={!work.sections.length || work.sections.some((s) => !s.text.trim())}
                  onPress={() =>
                    act(
                      () =>
                        setExport(
                          grantId,
                          fullArtifactBundleText(
                            work,
                            activeProject?.name ?? activeProjectId,
                            activeApp?.profileRevisionId ??
                              activeProject?.currentRevisionId ??
                              'latest'
                          )
                        ),
                      'Review text copied to Export. Download requires a connected service; nothing was submitted.'
                    )
                  }
                />
                <AppText variant="h3">Record an external submission</AppText>
                <AppText>
                  Submit through the funder&apos;s official site first, then record its receipt.
                  This locks the work slot snapshot for audit compliance.
                </AppText>
                <AppInput
                  label="Official submission destination URL"
                  value={destination}
                  editable={canSubmit}
                  onChangeText={setDestination}
                  autoCapitalize="none"
                />
                <AppButton
                  label="Open official destination"
                  disabled={!validSource(destination)}
                  onPress={() => {
                    void Linking.openURL(destination).catch(() =>
                      setError('Could not open the destination.')
                    );
                  }}
                />
                <AppInput
                  label="Receipt reference supplied by funder"
                  value={receipt}
                  editable={canSubmit}
                  onChangeText={setReceipt}
                  maxLength={200}
                />
                <AppButton
                  label="Record receipt and snapshot"
                  disabled={!canSubmit || !receipt.trim() || !validSource(destination)}
                  onPress={() =>
                    act(() => {
                      update(key, (current) =>
                        recordSubmission(
                          current,
                          generateId('submission'),
                          new Date().toISOString(),
                          receipt,
                          destination
                        )
                      );
                      if (activeApp) {
                        markWorkSlotSubmitted(activeApp.id, receipt.trim());
                      }
                    }, 'Receipt recorded in this session; snapshot preserved.')
                  }
                />
                {work.submissions.map((item) => (
                  <View key={item.id}>
                    <AppText>Recorded: {item.receipt}</AppText>
                    <AppText>
                      {item.recordedAt} · {item.destination}
                    </AppText>
                    <AppText>
                      {item.version.sections.length} sections preserved in the submission snapshot.
                    </AppText>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ModalSheetLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  splitLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
  },
  stackedLayout: {
    gap: SPACING.lg,
  },
  contextDock: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  contextDockWide: {
    width: '32%',
  },
  mainCanvas: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.lg,
  },
  syncBox: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  subCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
});
