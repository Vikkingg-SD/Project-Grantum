import React, { useMemo, useRef, useState } from 'react';
import { Platform, View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ProjectRolePicker } from '@/components/molecules/ProjectRolePicker';
import {
  ProjectSelectDropdown,
  type ProjectSelectHandle,
} from '@/components/molecules/ProjectSelectDropdown';
import {
  ProjectDocumentPicker,
  type PickedProjectFile,
} from '@/components/molecules/ProjectDocumentPicker';
import { ProjectProfileAuditCard } from '@/components/organisms/ProjectProfileAuditCard';
import { ENV } from '@/config/env';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useProgressStore } from '@/store/useProgressStore';
import { styles } from './workspacePageStyles';
import {
  KNOWN_ENTITY_TYPES,
  KNOWN_PROJECT_REGIONS,
  PROFILE_FIELD_DEFINITIONS,
  addVaultDoc,
  canRolePerform,
  computeProfileReadiness,
  hasProfileChanges,
  parseVaultDocs,
  removeVaultDoc,
  sanitizeVaultDocName,
  applicationWorkKey,
} from '@/utils/workspace';
import type { ProjectKind } from '@/types/workspace';
import { PROJECT_KIND_OPTIONS } from '@/utils/sectionCatalog';

export default function ProjectProfileScreen() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];

  return (
    <ProjectProfileEditor
      key={`${activeProject?.id ?? 'project-1'}:${hydrated ? 'hydrated' : 'loading'}`}
      initialProjectId={activeProject?.id ?? 'project-1'}
      notice={notice}
      error={error}
      setNotice={setNotice}
      setError={setError}
    />
  );
}

function ProjectProfileEditor({
  initialProjectId,
  notice,
  error,
  setNotice,
  setError,
}: {
  initialProjectId: string;
  notice: string;
  error: string;
  setNotice: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { mobile, desktop } = useLayoutMetrics();
  const reduceMotion = useReduceMotion();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const profileAudits = useWorkspaceStore((state) => state.profileAudits);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const setProjectRole = useWorkspaceStore((state) => state.setProjectRole);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const saveProjectProfile = useWorkspaceStore((state) => state.saveProjectProfile);
  const runProfileAudit = useWorkspaceStore((state) => state.runProfileAudit);
  const toggleArchiveProject = useWorkspaceStore((state) => state.toggleArchiveProject);
  const recordActivity = useProgressStore((state) => state.recordActivity);

  const initialProject =
    workspace.projects.find((p) => p.id === initialProjectId) ?? workspace.projects[0];
  const initialRevision = workspace.revisions.find(
    (r) => r.id === initialProject?.currentRevisionId
  );

  const inputs = useRef<Record<string, TextInput | null>>({});
  const selectRefs = useRef<Record<string, ProjectSelectHandle | null>>({});
  const auditSectionRef = useRef<View>(null);

  const [editingProjectId, setEditingProjectId] = useState(initialProject?.id ?? initialProjectId);
  const [name, setName] = useState(initialProject?.name ?? '');
  const [kind, setKind] = useState<ProjectKind>(initialProject?.kind ?? 'startup');
  const [fields, setFields] = useState<Record<string, string>>({
    ...(initialRevision?.fields ?? {}),
  });
  const [summary, setSummary] = useState('');
  const [attachError, setAttachError] = useState('');
  const [sessionFileSizes, setSessionFileSizes] = useState<Record<string, number>>({});

  const syncSelection = (projectId: string) => {
    const proj = workspace.projects.find((p) => p.id === projectId);
    if (!proj) return;
    const rev = workspace.revisions.find((r) => r.id === proj.currentRevisionId);
    setActiveProject(proj.id);
    setEditingProjectId(proj.id);
    setName(proj.name);
    setKind(proj.kind);
    setFields({ ...(rev?.fields ?? {}) });
    setSummary('');
    setAttachError('');
    setSessionFileSizes({});
    setError('');
    setNotice(`Switched active project slot to "${proj.name}".`);
  };

  const startNewSlot = () => {
    let suffix = workspace.projects.length + 1;
    let newId = `project-${suffix}`;
    while (workspace.projects.some((p) => p.id === newId)) {
      suffix += 1;
      newId = `project-${suffix}`;
    }
    setEditingProjectId(newId);
    setName('');
    setKind('grant');
    setFields({
      mission: '',
      problem: '',
      solution: '',
      beneficiaries: '',
      budget: '',
      region: '',
      entityType: '',
      teamLead: '',
      vaultDocs: '',
    });
    setSummary('');
    setAttachError('');
    setSessionFileSizes({});
    setError('');
    setNotice('Creating a new Project Profile.');
  };

  const focusField = (key: string) => {
    const def = PROFILE_FIELD_DEFINITIONS.find((item) => item.key === key);
    if (def && (def.inputKind === 'region-multi' || def.inputKind === 'entity-select')) {
      requestAnimationFrame(() => selectRefs.current[key]?.focus());
      return;
    }
    requestAnimationFrame(() => inputs.current[key]?.focus());
  };

  const scrollToAuditSection = () => {
    if (Platform.OS === 'web') {
      const node = auditSectionRef.current as unknown as HTMLElement | null;
      node?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      node?.querySelector<HTMLElement>('button, [role="button"]')?.focus();
    }
  };

  const currentProject = workspace.projects.find((p) => p.id === editingProjectId);
  const currentRevision = workspace.revisions.find(
    (r) => r.id === currentProject?.currentRevisionId
  );
  const currentAuditRecord = profileAudits[editingProjectId];

  const previewReadiness = useMemo(
    () =>
      computeProfileReadiness(
        currentProject ?? {
          id: editingProjectId,
          name: name || 'New Project',
          kind,
          currentRevisionId: 'draft',
          archivedAt: null,
        },
        {
          id: currentRevision?.id ?? 'draft-preview',
          projectId: editingProjectId,
          parentRevisionId: null,
          authorId: nickname || 'Founder Lead',
          createdAt: new Date().toISOString(),
          summary: 'Live preview',
          fields,
        },
        currentAuditRecord
      ),
    [
      currentAuditRecord,
      currentProject,
      currentRevision?.id,
      editingProjectId,
      fields,
      kind,
      name,
      nickname,
    ]
  );

  const projectRevisions = useMemo(
    () =>
      workspace.revisions
        .filter((r) => r.projectId === editingProjectId)
        .slice()
        .reverse(),
    [editingProjectId, workspace.revisions]
  );

  const activeSlotForProject = useMemo(
    () => workspace.applications.find((app) => app.projectId === editingProjectId),
    [editingProjectId, workspace.applications]
  );

  const unsaved = hasProfileChanges(currentProject, currentRevision, { name, kind, fields });
  const editingRole = currentProject ? (projectRoles[currentProject.id] ?? 'owner') : activeRole;
  const canEdit = canRolePerform(editingRole, 'edit');
  const canReview = canRolePerform(editingRole, 'review');
  const canManageProject = canRolePerform(editingRole, 'manage-project');

  const detailedCount = previewReadiness.checklist.filter((item) => item.filled).length;
  const auditedCount = previewReadiness.checklist.filter(
    (item) => item.status === 'audited'
  ).length;
  const checklistByKey = useMemo(
    () => new Map(previewReadiness.checklist.map((item) => [item.key, item])),
    [previewReadiness.checklist]
  );
  const attachedDocs = useMemo(() => parseVaultDocs(fields.vaultDocs), [fields.vaultDocs]);

  const handleAttachFiles = (picked: PickedProjectFile[], pickerIssue = '') => {
    if (!canEdit) return;
    let nextRaw = fields.vaultDocs ?? '';
    let firstIssue = pickerIssue;
    const addedSizes: Record<string, number> = {};
    for (const file of picked) {
      const res = addVaultDoc(nextRaw, file.name);
      if (res.error) {
        firstIssue = firstIssue || res.error;
      } else {
        const cleanName = sanitizeVaultDocName(file.name);
        nextRaw = res.next;
        if (cleanName) addedSizes[cleanName] = file.size;
      }
    }
    setAttachError(firstIssue);
    if (Object.keys(addedSizes).length > 0) {
      setSessionFileSizes((sizes) => ({ ...sizes, ...addedSizes }));
    }
    if (nextRaw !== (fields.vaultDocs ?? '')) {
      setFields((prev) => ({ ...prev, vaultDocs: nextRaw }));
    }
  };

  const handleSaveProfile = () => {
    if (!canEdit || !unsaved || !name.trim()) return;
    try {
      const cleanSummary = summary.trim() || 'Updated project profile details';
      saveProjectProfile({
        projectId: editingProjectId,
        name,
        kind,
        summary: cleanSummary,
        fields,
      });
      if (activeSlotForProject) {
        recordActivity(applicationWorkKey(workspace, activeSlotForProject), {
          actor: nickname || 'Founder Lead',
          agent: 'system',
          message: `Saved project profile update: ${cleanSummary}`,
        });
      }
      setSummary('');
      setError('');
      setNotice('Profile saved. Linked applications can now review these updates.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save project profile');
    }
  };

  const handleRunAudit = () => {
    if (!canReview) return;
    try {
      const record = runProfileAudit({
        projectId: editingProjectId,
        name: name || 'Untitled project',
        kind,
        fields,
      });
      if (activeSlotForProject) {
        recordActivity(applicationWorkKey(workspace, activeSlotForProject), {
          actor: nickname || 'Founder Lead',
          agent: 'agent-2-deterministic',
          status: record.allPassed ? 'passed' : 'failed',
          message: `Audited project profile (${record.passedCount}/${record.totalCount} checks passed)`,
        });
      }
      setError('');
      setNotice(
        record.allPassed
          ? `Project profile audit passed (${record.passedCount}/${record.totalCount} checks Complete).`
          : `Project profile audit finished: ${record.passedCount}/${record.totalCount} checks passed. Review remaining items.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to audit project profile');
    }
  };

  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <AppText variant="h1">Project Profile</AppText>
        <AppText color="muted">
          Keep project details together and choose when to share updates with linked applications.
        </AppText>

        {!canEdit && (
          <StatusBadge
            label={`Read-only mode (${editingRole.toUpperCase()} role)`}
            variant="pending"
          />
        )}
        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? <AppText color="verified">{notice}</AppText> : null}

        <View testID="workspace-columns" style={[styles.columns, desktop && styles.desktopColumns]}>
          <View
            testID="profile-summary"
            style={[styles.sideColumn, desktop && styles.desktopSidebar]}
          >
            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Your projects</AppText>
              <View style={styles.rowWrap}>
                {workspace.projects.map((proj) => (
                  <AppButton
                    key={proj.id}
                    size="sm"
                    variant="outline"
                    selected={editingProjectId === proj.id}
                    label={`${proj.name}${proj.archivedAt ? ' (Archived)' : ''}`}
                    onPress={() => syncSelection(proj.id)}
                  />
                ))}
                <AppButton
                  size="sm"
                  variant="surface"
                  label="New project"
                  disabled={!canManageProject}
                  onPress={startNewSlot}
                />
              </View>
            </View>

            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.rowBetween}>
                <AppText variant="h3">Profile checklist</AppText>
                <StatusBadge
                  label={
                    previewReadiness.auditStatus === 'audited'
                      ? `${previewReadiness.score}% complete · Audited`
                      : `${previewReadiness.score}% detailed · Review required`
                  }
                  variant={previewReadiness.auditStatus === 'audited' ? 'verified' : 'pending'}
                />
              </View>
              <AppText variant="caption" color="muted">
                {detailedCount} of {previewReadiness.checklist.length} profile fields meet detail
                minimums · {auditedCount} audited.
              </AppText>
              <View style={styles.checklistGrid}>
                {unsaved && (
                  <AppText variant="caption" color="gold">
                    Unsaved changes · save to update linked badges.
                  </AppText>
                )}
                {previewReadiness.checklist.map((item) => {
                  const statusText =
                    item.status === 'audited'
                      ? 'Complete'
                      : item.status === 'review-required'
                        ? 'Review required, go to audit'
                        : 'Needs detail';
                  const statusColor = item.status === 'audited' ? 'verified' : 'gold';
                  return (
                    <View key={item.key} style={[styles.checkItem, { borderColor: theme.border }]}>
                      <View style={styles.rowBetween}>
                        <AppText variant="body">{item.label}</AppText>
                        <AppText variant="caption" color={statusColor}>
                          {statusText}
                        </AppText>
                      </View>
                      {item.filled ? (
                        <>
                          <AppText
                            testID={`check-preview-${item.key}`}
                            variant="caption"
                            color="muted"
                            numberOfLines={1}
                          >
                            {fields[item.key]}
                          </AppText>
                          {item.status === 'review-required' ? (
                            <AppButton
                              size="sm"
                              variant="ghost"
                              label="Go to audit"
                              accessibilityLabel={`Go to audit for ${item.label}`}
                              onPress={scrollToAuditSection}
                            />
                          ) : null}
                        </>
                      ) : (
                        <>
                          <AppText variant="caption" color="gold">
                            {item.detailReason}
                          </AppText>
                          <AppButton
                            size="sm"
                            variant="ghost"
                            label={`Fix ${item.label}`}
                            disabled={!canEdit}
                            onPress={() => focusField(item.key)}
                          />
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View
              testID="project-team"
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Project team</AppText>
              <AppText>{nickname} · You</AppText>
              <ProjectRolePicker
                name={nickname}
                role={editingRole}
                disabled={!currentProject || ENV.DATA_SOURCE !== 'mock'}
                onChange={(role) => {
                  setProjectRole(editingProjectId, role);
                  setNotice(`Project access changed to ${role}.`);
                }}
              />
              {ENV.DATA_SOURCE !== 'mock' ? (
                <AppText variant="caption" color="muted">
                  Team membership and role changes require your connected service.
                </AppText>
              ) : null}
            </View>
          </View>

          <View testID="profile-editor" style={styles.mainColumn}>
            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Project details</AppText>
              <AppInput
                label="Project name"
                value={name}
                onChangeText={setName}
                editable={canEdit}
              />
              <AppText variant="label">Project type</AppText>
              <View style={styles.rowWrap}>
                {PROJECT_KIND_OPTIONS.map((item) => (
                  <AppButton
                    key={item.id}
                    size="sm"
                    variant="outline"
                    label={item.label}
                    selected={kind === item.id}
                    disabled={!canEdit}
                    onPress={() => setKind(item.id)}
                  />
                ))}
              </View>

              {PROFILE_FIELD_DEFINITIONS.map((def) => {
                if (def.inputKind === 'region-multi') {
                  return (
                    <ProjectSelectDropdown
                      key={def.key}
                      testID="profile-region-dropdown"
                      triggerRef={(handle) => {
                        selectRefs.current[def.key] = handle;
                      }}
                      label={def.label}
                      mode="multi"
                      options={KNOWN_PROJECT_REGIONS}
                      value={fields[def.key] ?? ''}
                      disabled={!canEdit}
                      placeholder="Select operating regions"
                      searchPlaceholder="Search regions..."
                      onChange={(nextValue) =>
                        setFields((prev) => ({ ...prev, [def.key]: nextValue }))
                      }
                    />
                  );
                }
                if (def.inputKind === 'entity-select') {
                  return (
                    <ProjectSelectDropdown
                      key={def.key}
                      testID="profile-entity-dropdown"
                      triggerRef={(handle) => {
                        selectRefs.current[def.key] = handle;
                      }}
                      label={def.label}
                      mode="single"
                      options={KNOWN_ENTITY_TYPES}
                      value={fields[def.key] ?? ''}
                      disabled={!canEdit}
                      placeholder="Select legal entity type"
                      allowCustom
                      onChange={(nextValue) =>
                        setFields((prev) => ({ ...prev, [def.key]: nextValue }))
                      }
                    />
                  );
                }
                if (def.inputKind === 'textarea') {
                  const statusItem = checklistByKey.get(def.key);
                  const count = statusItem?.charCount ?? 0;
                  return (
                    <View key={def.key}>
                      <AppTextArea
                        label={def.label}
                        inputRef={(input) => {
                          inputs.current[def.key] = input;
                        }}
                        value={fields[def.key] ?? ''}
                        charLimit={2000}
                        editable={canEdit}
                        onChangeText={(text) => setFields((prev) => ({ ...prev, [def.key]: text }))}
                      />
                      <AppText variant="caption" color={count >= def.minChars ? 'muted' : 'gold'}>
                        {count >= def.minChars
                          ? `Detail requirement met (${count} characters)`
                          : `Minimum ${def.minChars} characters required (${count}/${def.minChars})`}
                      </AppText>
                    </View>
                  );
                }
                return (
                  <AppInput
                    key={def.key}
                    label={def.label}
                    placeholder="Full name, role, and relevant delivery credentials"
                    inputRef={(input) => {
                      inputs.current[def.key] = input;
                    }}
                    value={fields[def.key] ?? ''}
                    editable={canEdit}
                    onChangeText={(text) => setFields((prev) => ({ ...prev, [def.key]: text }))}
                  />
                );
              })}

              <ProjectDocumentPicker
                docs={attachedDocs}
                disabled={!canEdit}
                error={attachError}
                fileSizes={sessionFileSizes}
                onAddFiles={handleAttachFiles}
                onPickerError={setAttachError}
                onRemoveDoc={(docName) => {
                  if (!canEdit) return;
                  setAttachError('');
                  setFields((prev) => ({
                    ...prev,
                    vaultDocs: removeVaultDoc(prev.vaultDocs, docName),
                  }));
                }}
              />
            </View>

            <View
              testID="profile-save-bar"
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.saveRow, !mobile && styles.desktopSaveRow]}>
                <View style={styles.saveInputSlot}>
                  <AppInput
                    label="Change summary"
                    placeholder="Note what changed in this version"
                    value={summary}
                    editable={canEdit}
                    onChangeText={setSummary}
                  />
                </View>
                <View style={[styles.saveButtonSlot, !mobile && styles.saveButtonDesktopOffset]}>
                  <AppButton
                    label="Save profile"
                    variant="primary"
                    disabled={!canEdit || !unsaved || !name.trim()}
                    onPress={handleSaveProfile}
                  />
                </View>
              </View>
              {!unsaved && summary.trim().length > 0 ? (
                <AppText variant="caption" color="muted" accessibilityLiveRegion="polite">
                  Edit profile details before saving a new profile version.
                </AppText>
              ) : null}
              {currentProject ? (
                <View style={styles.rowWrap}>
                  <AppButton
                    label={
                      currentProject.archivedAt ? 'Restore Project Slot' : 'Archive Project Slot'
                    }
                    variant="outline"
                    disabled={!canManageProject}
                    onPress={() => {
                      try {
                        toggleArchiveProject(currentProject.id);
                        setError('');
                        setNotice(
                          currentProject.archivedAt
                            ? 'Project slot restored.'
                            : 'Project slot archived.'
                        );
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Unable to update project slot');
                      }
                    }}
                  />
                </View>
              ) : null}
            </View>

            <ProjectProfileAuditCard
              containerRef={auditSectionRef}
              readiness={previewReadiness}
              auditRecord={currentAuditRecord}
              unsaved={unsaved}
              canEdit={canEdit}
              canReview={canReview}
              projectSaved={Boolean(currentProject)}
              onRunAudit={handleRunAudit}
              onFixField={focusField}
              onOpenApplicationAudit={
                activeSlotForProject
                  ? () =>
                      router.navigate({
                        pathname: '/grants/[grantID]/audit-studio',
                        params: {
                          grantID: activeSlotForProject.grantId,
                          attemptId: activeSlotForProject.id,
                        },
                      })
                  : undefined
              }
            />

            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Version history</AppText>
              {projectRevisions.length === 0 ? (
                <AppText color="muted">No saved revisions for this slot yet.</AppText>
              ) : (
                projectRevisions.map((rev) => (
                  <View key={rev.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                    <View style={styles.rowBetween}>
                      <AppText variant="body">{rev.summary}</AppText>
                      <StatusBadge
                        label={
                          rev.id === currentProject?.currentRevisionId ? `${rev.id} (HEAD)` : rev.id
                        }
                        variant={
                          rev.id === currentProject?.currentRevisionId ? 'verified' : 'neutral'
                        }
                      />
                    </View>
                    <AppText variant="caption" color="muted">
                      Author: {rev.authorId} · {rev.createdAt.slice(0, 16).replace('T', ' ')}
                      {rev.parentRevisionId
                        ? ` · Parent: ${rev.parentRevisionId}`
                        : ' · Root commit'}
                    </AppText>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
