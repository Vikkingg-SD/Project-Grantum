import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { computeProfileReadiness, getProfileSyncLag } from '@/utils/workspace';
import type { CoWorkRole } from '@/types/workspace';
import type { Grant } from '@/types/grant';

const ROLES: readonly CoWorkRole[] = ['owner', 'editor', 'reviewer', 'viewer'];

export interface WorkspaceStudioBarProps {
  grants?: Grant[];
  onOpenGrantDraft?: (grantId: string, projectId: string) => void;
  externalModal?: 'admin' | null;
  onCloseExternalModal?: () => void;
}

export function WorkspaceStudioBar({
  externalModal = null,
  onCloseExternalModal,
}: WorkspaceStudioBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const [internalModal, setInternalModal] = useState<'admin' | null>(null);
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
          onPress={() => router.push('/project-profile')}
        />
        <AppButton
          size="sm"
          variant="outline"
          label={`My Works (${workspace.applications.length}${outOfSyncCount ? ` · ${outOfSyncCount} sync` : ''})`}
          onPress={() => router.push('/my-works')}
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

      <AccountAdminModal visible={activeModal === 'admin'} onClose={closeModal} />
    </>
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
          Review access, update your preferences and manage pending requests.
        </AppText>

        {notice ? <AppText color="verified">{notice}</AppText> : null}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Access preview</AppText>
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
          <AppText variant="caption" color="muted">
            {activeRole === 'owner'
              ? 'Can manage projects, edit applications, review changes and record submissions.'
              : activeRole === 'editor'
                ? 'Can edit application content and project details, and review changes.'
                : activeRole === 'reviewer'
                  ? 'Can view applications and review compliance changes.'
                  : 'Can view applications and match reports.'}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Personal settings</AppText>
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
          <AppInput label="Display name" value={draftName} onChangeText={setDraftName} />
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
            {persistenceStatus === 'device-saved'
              ? 'Settings saved on this device.'
              : 'Settings are available for this session only.'}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Needs attention</AppText>
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
          <AppText variant="h3">Activity log</AppText>
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
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.xs,
  },
  syncAlert: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
});
