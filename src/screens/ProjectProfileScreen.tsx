import React, { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { ProjectRolePicker } from '@/components/molecules/ProjectRolePicker';
import { ENV } from '@/config/env';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { styles } from './workspacePageStyles';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import {
  canRolePerform,
  PROFILE_FIELD_DEFINITIONS,
  computeProfileReadiness,
  hasProfileChanges,
  parseVaultDocs,
  toggleVaultDoc,
} from '@/utils/workspace';
import type { ProjectKind } from '@/types/workspace';
import { PROJECT_KIND_OPTIONS } from '@/utils/sectionCatalog';

const FIELD_LABELS = PROFILE_FIELD_DEFINITIONS.map(({ key, label }) => ({
  key,
  label,
  multiline: ['mission', 'problem', 'solution'].includes(key),
}));

export default function ProjectProfileScreen() {
  const theme = useTheme();
  const { desktop } = useLayoutMetrics();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const setProjectRole = useWorkspaceStore((state) => state.setProjectRole);
  const inputs = useRef<Record<string, TextInput | null>>({});
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const saveProjectProfile = useWorkspaceStore((state) => state.saveProjectProfile);
  const toggleArchiveProject = useWorkspaceStore((state) => state.toggleArchiveProject);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);

  const [editingProjectId, setEditingProjectId] = useState(activeProject?.id ?? 'project-1');
  const [name, setName] = useState(activeProject?.name ?? '');
  const [kind, setKind] = useState<ProjectKind>(activeProject?.kind ?? 'startup');
  const [fields, setFields] = useState<Record<string, string>>({
    ...(activeRevision?.fields ?? {}),
  });
  const [summary, setSummary] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

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
    setError('');
    setNotice(`Switched active project slot to "${proj.name}".`);
  };

  const startNewSlot = () => {
    const newId = `project-${workspace.projects.length + 1}`;
    setEditingProjectId(newId);
    setName('');
    setKind('grant');
    setFields({
      mission: '',
      problem: '',
      solution: '',
      beneficiaries: '',
      budget: '',
      region: 'Global',
      entityType: '',
      teamLead: '',
    });
    setSummary('Initial project profile dossier v1');
    setError('');
    setNotice('Creating a new reusable Project Profile Slot.');
  };

  const currentProject = workspace.projects.find((p) => p.id === editingProjectId);
  const currentRevision = workspace.revisions.find(
    (r) => r.id === currentProject?.currentRevisionId
  );
  const previewReadiness = useMemo(
    () =>
      computeProfileReadiness(
        currentProject ?? {
          id: editingProjectId,
          name: name || 'New Project Slot',
          kind,
          currentRevisionId: 'draft',
          archivedAt: null,
        },
        {
          id: currentRevision?.id ?? 'draft-preview',
          projectId: editingProjectId,
          parentRevisionId: null,
          authorId: 'You',
          createdAt: new Date().toISOString(),
          summary: 'Live preview',
          fields,
        }
      ),
    [currentProject, currentRevision?.id, editingProjectId, fields, kind, name]
  );

  const projectRevisions = useMemo(
    () =>
      workspace.revisions
        .filter((r) => r.projectId === editingProjectId)
        .slice()
        .reverse(),
    [editingProjectId, workspace.revisions]
  );

  const unsaved = hasProfileChanges(currentProject, currentRevision, { name, kind, fields });
  const editingRole = currentProject ? (projectRoles[currentProject.id] ?? 'owner') : activeRole;
  const canEdit = canRolePerform(editingRole, 'edit');
  const canManageProject = canRolePerform(editingRole, 'manage-project');

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
                    selected={editingProjectId === proj.id}
                    label={`${proj.name}${proj.archivedAt ? ' (Archived)' : ''}`}
                    onPress={() => syncSelection(proj.id)}
                  />
                ))}
                <AppButton
                  size="sm"
                  variant="outline"
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
                  label={`${previewReadiness.score}% complete`}
                  variant={previewReadiness.score >= 75 ? 'verified' : 'pending'}
                />
              </View>
              <AppText variant="caption" color="muted">
                {previewReadiness.checklist.filter((item) => item.filled).length} of{' '}
                {previewReadiness.checklist.length} profile fields complete.
              </AppText>
              <View style={styles.checklistGrid}>
                {unsaved && (
                  <AppText variant="caption" color="gold">
                    Unsaved changes · save to update linked badges.
                  </AppText>
                )}
                {previewReadiness.checklist.map((item) => (
                  <View key={item.key} style={[styles.checkItem, { borderColor: theme.border }]}>
                    <View style={styles.rowBetween}>
                      <AppText variant="body">{item.label}</AppText>
                      <AppText variant="caption" color={item.filled ? 'verified' : 'gold'}>
                        {item.filled ? 'Complete' : 'Needs detail'}
                      </AppText>
                    </View>
                    {item.filled ? (
                      <AppText
                        testID={`check-preview-${item.key}`}
                        variant="caption"
                        color="muted"
                        numberOfLines={1}
                      >
                        {fields[item.key]}
                      </AppText>
                    ) : (
                      <>
                        <AppText variant="caption" color="gold">
                          {item.guidance}
                        </AppText>
                        <AppButton
                          size="sm"
                          variant="ghost"
                          label={`Fix ${item.label}`}
                          disabled={!canEdit}
                          onPress={() => {
                            requestAnimationFrame(() => inputs.current[item.key]?.focus());
                          }}
                        />
                      </>
                    )}
                  </View>
                ))}
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
              <AppText variant="caption" color="muted">
                {ENV.DATA_SOURCE === 'mock'
                  ? 'Choose your active role for this project. Other projects keep their own roles.'
                  : 'Team membership and role changes require your connected service.'}
              </AppText>
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
                    label={item.label}
                    selected={kind === item.id}
                    disabled={!canEdit}
                    onPress={() => setKind(item.id)}
                  />
                ))}
              </View>

              {FIELD_LABELS.map((field) =>
                field.multiline ? (
                  <AppTextArea
                    key={field.key}
                    label={field.label}
                    inputRef={(input) => {
                      inputs.current[field.key] = input;
                    }}
                    value={fields[field.key] ?? ''}
                    charLimit={2000}
                    editable={canEdit}
                    onChangeText={(text) => setFields((prev) => ({ ...prev, [field.key]: text }))}
                  />
                ) : (
                  <AppInput
                    key={field.key}
                    label={field.label}
                    inputRef={(input) => {
                      inputs.current[field.key] = input;
                    }}
                    value={fields[field.key] ?? ''}
                    editable={canEdit}
                    onChangeText={(text) => setFields((prev) => ({ ...prev, [field.key]: text }))}
                  />
                )
              )}

              <View style={[styles.checkItem, { borderColor: theme.border }]}>
                <AppText variant="label">Reference documents</AppText>
                <AppText variant="caption" color="muted">
                  Attach or select reference documents relevant to this project.
                </AppText>
                <View style={styles.rowWrap}>
                  {[
                    'Audited_Financials_FY2025.pdf',
                    'Utility_CoFunding_MoU.pdf',
                    'TRL4_Hydrophone_Telemetry_Spec.pdf',
                    'Nonprofit_501c3_Determination.pdf',
                    'Rural_Clinic_Letters_of_Support.pdf',
                  ].map((docName) => {
                    const activeDocs = parseVaultDocs(fields.vaultDocs);
                    const included = activeDocs.includes(docName);
                    return (
                      <AppButton
                        key={docName}
                        size="sm"
                        selected={included}
                        disabled={!canEdit}
                        label={included ? `✓ ${docName}` : `+ ${docName}`}
                        onPress={() =>
                          setFields((prev) => ({
                            ...prev,
                            vaultDocs: toggleVaultDoc(prev.vaultDocs, docName),
                          }))
                        }
                      />
                    );
                  })}
                </View>
              </View>
              <AppInput
                label="Change summary"
                placeholder="Added utility co-funding letter and updated problem metrics"
                value={summary}
                editable={canEdit}
                onChangeText={setSummary}
              />
              <View style={styles.rowWrap}>
                <AppButton
                  label="Save profile"
                  variant="primary"
                  disabled={!canEdit || !unsaved || !name.trim()}
                  onPress={() => {
                    try {
                      saveProjectProfile({
                        projectId: editingProjectId,
                        name,
                        kind,
                        summary: summary.trim() || 'Updated project profile dossier fields',
                        fields,
                      });
                      setSummary('');
                      setError('');
                      setNotice('Profile saved. Linked applications can now review these updates.');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Unable to save project profile');
                    }
                  }}
                />
                {currentProject && (
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
                )}
              </View>
            </View>

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
