import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  canRolePerform,
  computeProfileReadiness,
  getProfileSyncLag,
  parseVaultDocs,
  searchProjects,
  toggleVaultDoc,
} from '@/utils/workspace';
import type { CoWorkRole, ProjectKind } from '@/types/workspace';
import type { Grant } from '@/types/grant';

const PROJECT_KINDS: readonly ProjectKind[] = ['grant', 'startup', 'social', 'invention', 'other'];
const ROLES: readonly CoWorkRole[] = ['owner', 'editor', 'reviewer', 'viewer'];

const FIELD_LABELS: readonly { key: string; label: string; multiline?: boolean }[] = [
  { key: 'mission', label: 'Core Mission & Value Thesis', multiline: true },
  { key: 'problem', label: 'Quantified Problem Evidence', multiline: true },
  { key: 'solution', label: 'Technical / Program Approach', multiline: true },
  { key: 'beneficiaries', label: 'Target Beneficiaries & Market Scope' },
  { key: 'budget', label: 'Budget Envelope & Co-Funding' },
  { key: 'region', label: 'Eligible Jurisdiction & Region' },
  { key: 'entityType', label: 'Legal Entity & Registration Status' },
  { key: 'teamLead', label: 'Principal Investigator / Execution Lead' },
];

export interface WorkspaceStudioBarProps {
  grants?: Grant[];
  onOpenGrantDraft?: (grantId: string, projectId: string) => void;
  externalModal?: 'profile' | 'works' | 'admin' | null;
  onCloseExternalModal?: () => void;
}

export function WorkspaceStudioBar({
  grants = [],
  onOpenGrantDraft,
  externalModal = null,
  onCloseExternalModal,
}: WorkspaceStudioBarProps) {
  const theme = useTheme();
  const [internalModal, setInternalModal] = useState<'profile' | 'works' | 'admin' | null>(null);
  const activeModal = externalModal ?? internalModal;
  const closeModal = () => {
    setInternalModal(null);
    onCloseExternalModal?.();
  };

  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const adminQueue = useWorkspaceStore((state) => state.adminQueue);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeRevision = workspace.revisions.find((r) => r.id === activeProject?.currentRevisionId);
  const readiness = useMemo(
    () =>
      activeProject && activeRevision
        ? computeProfileReadiness(activeProject, activeRevision)
        : null,
    [activeProject, activeRevision]
  );

  const outOfSyncCount = useMemo(
    () => workspace.applications.filter((app) => getProfileSyncLag(workspace, app.id) > 0).length,
    [workspace]
  );
  const pendingAdminCount = useMemo(
    () => adminQueue.filter((item) => item.status === 'pending').length,
    [adminQueue]
  );

  return (
    <>
      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <AppButton
          size="sm"
          variant="outline"
          label={`Project: ${activeProject?.name ?? 'Default'} (${readiness?.score ?? 51}% ready)`}
          onPress={() => setInternalModal('profile')}
        />
        <AppButton
          size="sm"
          variant="outline"
          label={`My Works (${workspace.applications.length}${outOfSyncCount ? ` · ${outOfSyncCount} sync` : ''})`}
          onPress={() => setInternalModal('works')}
        />
        <AppButton
          size="sm"
          variant="ghost"
          label={`Role: ${activeRole.toUpperCase()}${pendingAdminCount ? ` · Admin (${pendingAdminCount})` : ''}`}
          onPress={() => setInternalModal('admin')}
        />
        <StatusBadge
          label={
            persistenceStatus === 'device-saved' ? 'Saved on this device' : 'Session-only preview'
          }
          variant={persistenceStatus === 'device-saved' ? 'verified' : 'neutral'}
        />
      </View>

      <ProjectProfileModal visible={activeModal === 'profile'} onClose={closeModal} />
      <MyWorksModal
        visible={activeModal === 'works'}
        onClose={closeModal}
        grants={grants}
        onOpenGrantDraft={onOpenGrantDraft}
        onOpenProfile={() => setInternalModal('profile')}
      />
      <AccountAdminModal visible={activeModal === 'admin'} onClose={closeModal} />
    </>
  );
}

export function ProjectProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
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

  const canEdit =
    canRolePerform(activeRole, 'manage-project') || canRolePerform(activeRole, 'edit');

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Project Profile Dossier and LLM Readiness"
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
        <AppText variant="h2">Project Profile Dossier & LLM Readiness</AppText>
        <AppText color="muted">
          Reusable Project Profile Slots power grant matching and multi-application drafting. Every
          save creates a versioned Git-style revision so linked applications can review and pull
          updates safely.
        </AppText>

        {!canEdit && (
          <StatusBadge
            label={`Read-only mode (${activeRole.toUpperCase()} role)`}
            variant="pending"
          />
        )}
        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? <AppText color="verified">{notice}</AppText> : null}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">1. Select or Create Project Profile Slot</AppText>
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
              label="+ New Project Slot"
              disabled={!canEdit}
              onPress={startNewSlot}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">2. LLM Readiness Breakdown</AppText>
            <StatusBadge
              label={`${previewReadiness.score}% done`}
              variant={previewReadiness.score >= 75 ? 'verified' : 'pending'}
            />
          </View>
          <AppText variant="caption" color="muted">
            {previewReadiness.summaryText} (Deterministic dossier readiness preview; live LLM
            semantic scoring connects via backend API.)
          </AppText>
          <View style={styles.checklistGrid}>
            {previewReadiness.checklist.map((item) => (
              <View key={item.key} style={[styles.checkItem, { borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <AppText variant="body">{item.label}</AppText>
                  <StatusBadge
                    label={item.filled ? 'Grounded' : `${item.impact.toUpperCase()} impact gap`}
                    variant={item.filled ? 'verified' : 'pending'}
                  />
                </View>
                {!item.filled && (
                  <AppText variant="caption" color="muted">
                    {item.guidance}
                  </AppText>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">3. Dossier Fields & Template Category</AppText>
          <AppInput
            label="Project / Venture Name"
            value={name}
            onChangeText={setName}
            editable={canEdit}
          />
          <AppText variant="label">Template Category</AppText>
          <View style={styles.rowWrap}>
            {PROJECT_KINDS.map((item) => (
              <AppButton
                key={item}
                size="sm"
                label={item}
                selected={kind === item}
                disabled={!canEdit}
                onPress={() => setKind(item)}
              />
            ))}
          </View>

          {FIELD_LABELS.map((field) =>
            field.multiline ? (
              <AppTextArea
                key={field.key}
                label={field.label}
                value={fields[field.key] ?? ''}
                charLimit={2000}
                onChangeText={(text) => setFields((prev) => ({ ...prev, [field.key]: text }))}
              />
            ) : (
              <AppInput
                key={field.key}
                label={field.label}
                value={fields[field.key] ?? ''}
                editable={canEdit}
                onChangeText={(text) => setFields((prev) => ({ ...prev, [field.key]: text }))}
              />
            )
          )}

          <AppInput
            label="Revision commit summary (Git-style changelog message)"
            placeholder="e.g., Added utility co-funding letter and updated problem metrics"
            value={summary}
            editable={canEdit}
            onChangeText={setSummary}
          />
          <View style={[styles.checkItem, { borderColor: theme.border }]}>
            <AppText variant="label">
              Reusable Reference Document Vault (NotebookLM Context Sources)
            </AppText>
            <AppText variant="caption" color="muted">
              Attach reusable dossier files (budgets, audited financials, letters of support, patent
              specs) to this Project Profile Slot so every linked application in My Works inherits
              them:
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
          <View style={styles.rowWrap}>
            <AppButton
              label="Commit Profile Revision"
              variant="primary"
              disabled={!canEdit}
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
                  setNotice(
                    'Saved new ProfileRevision. Linked applications in My Works can now pull this commit.'
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to save project profile');
                }
              }}
            />
            {currentProject && (
              <AppButton
                label={currentProject.archivedAt ? 'Restore Project Slot' : 'Archive Project Slot'}
                variant="outline"
                disabled={!canEdit}
                onPress={() => {
                  toggleArchiveProject(currentProject.id);
                  setNotice(
                    currentProject.archivedAt ? 'Project slot restored.' : 'Project slot archived.'
                  );
                }}
              />
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">4. Git-Style Profile Revision History</AppText>
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
                    variant={rev.id === currentProject?.currentRevisionId ? 'verified' : 'neutral'}
                  />
                </View>
                <AppText variant="caption" color="muted">
                  Author: {rev.authorId} · {rev.createdAt.slice(0, 16).replace('T', ' ')}
                  {rev.parentRevisionId ? ` · Parent: ${rev.parentRevisionId}` : ' · Root commit'}
                </AppText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ModalSheetLayout>
  );
}

export function MyWorksModal({
  visible,
  onClose,
  grants = [],
  onOpenGrantDraft,
  onOpenProfile,
}: {
  visible: boolean;
  onClose: () => void;
  grants?: Grant[];
  onOpenGrantDraft?: (grantId: string, projectId: string) => void;
  onOpenProfile?: () => void;
}) {
  const theme = useTheme();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const pullWorkSlotProfile = useWorkspaceStore((state) => state.pullWorkSlotProfile);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'sync-needed' | 'archived'>('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const visibleProjects = useMemo(
    () => searchProjects(workspace, query, filter === 'archived'),
    [filter, query, workspace]
  );

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspace.applications.filter((app) => {
      const proj = workspace.projects.find((p) => p.id === app.projectId);
      const grant = grants.find((g) => g.id === app.grantId);
      const lag = getProfileSyncLag(workspace, app.id);
      if (filter === 'sync-needed' && lag === 0) return false;
      if (filter === 'active' && app.status === 'submitted') return false;
      if (!q) return true;
      return `${proj?.name ?? ''} ${grant?.title ?? ''} ${app.grantId} ${app.status}`
        .toLowerCase()
        .includes(q);
    });
  }, [filter, grants, query, workspace]);

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={onClose}
      accessibilityLabel="My Works Library Studio"
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
        <AppText variant="h2">My Works — Multi-Slot Studio Library</AppText>
        <AppText color="muted">
          Inspired by HackMD + NotebookLM: manage reusable Project Profile Slots alongside
          independent Application Work Slots (Narrative, Pitch Deck, and Grounded Documents). Two
          projects can apply to the same grant simultaneously without overwriting each other.
        </AppText>

        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? <AppText color="verified">{notice}</AppText> : null}

        <AppInput
          label="Search projects, grants, or work slots"
          placeholder="Filter by project name, grant title, or status..."
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.rowWrap}>
          {(
            [
              ['all', 'All Works'],
              ['active', 'In-Progress Drafts'],
              ['sync-needed', 'Needs Profile Sync'],
              ['archived', 'Archived Projects'],
            ] as const
          ).map(([key, label]) => (
            <AppButton
              key={key}
              size="sm"
              label={label}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">Project Profile Slots ({visibleProjects.length})</AppText>
            {onOpenProfile && (
              <AppButton
                size="sm"
                variant="outline"
                label="Edit Dossier / New Slot"
                onPress={onOpenProfile}
              />
            )}
          </View>
          {visibleProjects.map((proj) => {
            const rev = workspace.revisions.find((r) => r.id === proj.currentRevisionId);
            const readiness = rev ? computeProfileReadiness(proj, rev).score : 51;
            const isActive = proj.id === activeProjectId;
            return (
              <View key={proj.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <AppText variant="body">
                    {proj.name} ({proj.kind.toUpperCase()})
                  </AppText>
                  <StatusBadge
                    label={`${readiness}% ready · ${proj.currentRevisionId}`}
                    variant={isActive ? 'verified' : 'neutral'}
                  />
                </View>
                <AppText variant="caption" color="muted">
                  Latest commit: {rev?.summary ?? 'Initial'}
                </AppText>
                <View style={styles.rowWrap}>
                  <AppButton
                    size="sm"
                    selected={isActive}
                    label={isActive ? 'Active Project Slot' : 'Set as Active Project'}
                    onPress={() => {
                      setActiveProject(proj.id);
                      setNotice(`Active Project Profile set to "${proj.name}".`);
                    }}
                  />
                  {grants[0] && (
                    <AppButton
                      size="sm"
                      variant="outline"
                      label={`Start/Open Work Slot for Grant #${grants[0].id}`}
                      onPress={() => {
                        const slot = ensureWorkSlot(proj.id, grants[0].id);
                        setActiveProject(proj.id);
                        onClose();
                        onOpenGrantDraft?.(slot.grantId, proj.id);
                      }}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Application Work Slots ({visibleApps.length})</AppText>
          {visibleApps.map((app) => {
            const proj = workspace.projects.find((p) => p.id === app.projectId);
            const grant = grants.find((g) => g.id === app.grantId);
            const lag = getProfileSyncLag(workspace, app.id);
            return (
              <View key={app.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                <View style={styles.rowBetween}>
                  <AppText variant="body">
                    {proj?.name ?? app.projectId} → {grant?.title ?? `Grant #${app.grantId}`}
                  </AppText>
                  <StatusBadge
                    label={app.status.toUpperCase()}
                    variant={app.status === 'submitted' ? 'verified' : 'pending'}
                  />
                </View>
                <AppText variant="caption" color="muted">
                  Slot ID: {app.id} · Pinned Profile: {app.profileRevisionId} · Updated:{' '}
                  {app.updatedAt.slice(0, 16).replace('T', ' ')}
                </AppText>
                <View style={styles.rowWrap}>
                  {app.artifacts.map((art) => (
                    <StatusBadge
                      key={art.id}
                      label={`${art.title} (${art.revisionId})`}
                      variant="neutral"
                    />
                  ))}
                </View>

                {lag > 0 && (
                  <View
                    style={[
                      styles.syncAlert,
                      { backgroundColor: theme.subtle, borderColor: theme.border },
                    ]}
                  >
                    <AppText variant="caption">
                      Cross-Slot Sync Alert: Project Profile &quot;{proj?.name}&quot; is {lag}{' '}
                      commit(s) ahead (HEAD: {proj?.currentRevisionId}, Work Slot pinned to{' '}
                      {app.profileRevisionId}).
                    </AppText>
                    <AppButton
                      size="sm"
                      variant="primary"
                      label={
                        app.status === 'submitted'
                          ? 'Locked to Submission Snapshot'
                          : `Pull Latest Profile (${proj?.currentRevisionId})`
                      }
                      disabled={app.status === 'submitted'}
                      onPress={() => {
                        try {
                          pullWorkSlotProfile(app.id);
                          setError('');
                          setNotice(
                            `Synced work slot ${app.id} to latest profile revision ${proj?.currentRevisionId}.`
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Unable to sync profile');
                        }
                      }}
                    />
                  </View>
                )}

                {onOpenGrantDraft && (
                  <AppButton
                    size="sm"
                    variant="outline"
                    label="Open in Drafting Studio"
                    onPress={() => {
                      setActiveProject(app.projectId);
                      onClose();
                      onOpenGrantDraft(app.grantId, app.projectId);
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ModalSheetLayout>
  );
}

export function AccountAdminModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const userId = useWorkspaceStore((state) => state.userId);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const digestEnabled = useWorkspaceStore((state) => state.digestEnabled);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const adminQueue = useWorkspaceStore((state) => state.adminQueue);
  const adminAuditLog = useWorkspaceStore((state) => state.adminAuditLog);
  const setRole = useWorkspaceStore((state) => state.setRole);
  const setPersonalSettings = useWorkspaceStore((state) => state.setPersonalSettings);
  const resolveAdminQueueItem = useWorkspaceStore((state) => state.resolveAdminQueueItem);

  const [draftName, setDraftName] = useState(nickname);
  const [draftDigest, setDraftDigest] = useState(digestEnabled);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Co-Work Roles, Personal Account and Staff Admin Console"
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
        <AppText variant="h2">Co-Work Roles, Account & Staff Admin Console</AppText>
        <AppText color="muted">
          GitHub + Grants.gov 4-role collaboration matrix alongside personal account settings and
          the exception-driven Staff Admin Needs-Attention queue.
        </AppText>

        {notice ? <AppText color="verified">{notice}</AppText> : null}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">1. Active Co-Work Role Switcher</AppText>
          <AppText variant="caption" color="muted">
            Switch your active session role to test role-gated permissions across the Project
            Profile Dossier and Drafting Studio.
          </AppText>
          <View style={styles.rowWrap}>
            {ROLES.map((role) => (
              <AppButton
                key={role}
                size="sm"
                label={role.toUpperCase()}
                selected={activeRole === role}
                onPress={() => {
                  setRole(role);
                  setNotice(`Switched active co-work role to ${role.toUpperCase()}.`);
                }}
              />
            ))}
          </View>
          <View style={[styles.checkItem, { borderColor: theme.border }]}>
            <AppText variant="body">Capabilities for {activeRole.toUpperCase()}:</AppText>
            <AppText variant="caption" color="muted">
              • View drafts & match reports: {canRolePerform(activeRole, 'view') ? 'YES' : 'NO'}
              {'\n'}• Edit sections, pitch deck & requirements:{' '}
              {canRolePerform(activeRole, 'edit') ? 'YES' : 'NO (Read-only)'}
              {'\n'}• Review & approve compliance clauses:{' '}
              {canRolePerform(activeRole, 'review') ? 'YES' : 'NO'}
              {'\n'}• Record official submission snapshot:{' '}
              {canRolePerform(activeRole, 'submit') ? 'YES' : 'NO'}
              {'\n'}• Manage & archive project slots:{' '}
              {canRolePerform(activeRole, 'manage-project') ? 'YES' : 'NO'}
            </AppText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">2. Personal Account Settings</AppText>
          <View style={styles.rowBetween}>
            <AppText variant="body">User ID: {userId}</AppText>
            <AppButton
              size="sm"
              variant="outline"
              label={copied ? 'Copied User ID' : 'Copy User ID'}
              onPress={() => {
                setCopied(true);
                setNotice(`User ID ${userId} copied to session clipboard.`);
              }}
            />
          </View>
          <AppInput
            label="Display Nickname (used in Git revision commits)"
            value={draftName}
            onChangeText={setDraftName}
          />
          <View style={styles.rowWrap}>
            <AppButton
              size="sm"
              selected={draftDigest}
              label={
                draftDigest ? 'Deadline & Sync Digest: Enabled' : 'Deadline & Sync Digest: Paused'
              }
              onPress={() => setDraftDigest(!draftDigest)}
            />
            <AppButton
              size="sm"
              variant="primary"
              label="Save Personal Settings"
              onPress={() => {
                setPersonalSettings(draftName, draftDigest);
                setNotice('Personal account settings saved.');
              }}
            />
          </View>
          <AppText variant="caption" color="muted">
            Storage persistence: {persistenceStatus} · Live OAuth / password rotation connects via
            backend auth service.
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">3. Platform Staff Admin Console — Needs Attention</AppText>
          <AppText variant="caption" color="muted">
            Exception-driven operational triage for failed export jobs, stale catalog deadlines, and
            user-submitted grant bounties. Every action is recorded in the audit log below.
          </AppText>
          {adminQueue.map((item) => (
            <View key={item.id} style={[styles.checkItem, { borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <AppText variant="body">{item.title}</AppText>
                <StatusBadge
                  label={`${item.category} · ${item.status.toUpperCase()}`}
                  variant={item.status === 'pending' ? 'pending' : 'verified'}
                />
              </View>
              <AppText variant="caption" color="muted">
                {item.detail}
              </AppText>
              <View style={styles.rowWrap}>
                {item.category === 'failed-job' && (
                  <AppButton
                    size="sm"
                    label="Retry Job"
                    disabled={item.status !== 'pending'}
                    onPress={() => {
                      resolveAdminQueueItem(item.id, 'retried');
                      setNotice(`Retried job "${item.title}".`);
                    }}
                  />
                )}
                {item.category !== 'failed-job' && (
                  <>
                    <AppButton
                      size="sm"
                      label="Approve & Index"
                      disabled={item.status !== 'pending'}
                      onPress={() => {
                        resolveAdminQueueItem(item.id, 'approved');
                        setNotice(`Approved "${item.title}".`);
                      }}
                    />
                    <AppButton
                      size="sm"
                      variant="danger"
                      label="Reject"
                      disabled={item.status !== 'pending'}
                      onPress={() => {
                        resolveAdminQueueItem(item.id, 'rejected');
                        setNotice(`Rejected "${item.title}".`);
                      }}
                    />
                  </>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">4. Admin Audit Log</AppText>
          {adminAuditLog.map((entry) => (
            <View key={entry.id} style={[styles.checkItem, { borderColor: theme.border }]}>
              <AppText variant="body">
                {entry.action} — {entry.targetTitle}
              </AppText>
              <AppText variant="caption" color="muted">
                Actor: {entry.actor} · {entry.timestamp.slice(0, 19).replace('T', ' ')}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </ModalSheetLayout>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  checklistGrid: {
    gap: SPACING.sm,
  },
  checkItem: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  syncAlert: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.sm,
  },
});
