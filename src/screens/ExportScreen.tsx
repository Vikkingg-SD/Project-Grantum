import React, { useState } from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useAuditStatus } from '@/api/hooks/useAuditScan';
import { useExportBundle } from '@/api/hooks/useExportBundle';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useApplicationAuditState } from '@/hooks/useApplicationAuditState';
import { MAX_INPUT_CHARS, TIERS } from '@/config/constants';
import { EXPORT_FORMATS } from '@/config/exportFormats';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { RADIUS, SPACING } from '@/config/theme';
import { fullArtifactBundleText, resolveApplicationNarrative } from '@/utils/drafting';
import {
  buildSafeExportFilename,
  formatLocalExportContent,
  triggerWebTextDownload,
  type LocalTextFormat,
} from '@/utils/localExport';
import { canRolePerform, workSlotKey } from '@/utils/workspace';
import { isLocalHttpOrigin, isSafeExternalUrl } from '@/utils/navigationHistory';
import type { ExportFormat } from '@/types/api';

export default function ExportScreen() {
  const grantId = useActiveGrantId();
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const slotKey = grantId ? workSlotKey(activeProjectId, grantId) : '';
  return <ExportSession key={slotKey} grantId={grantId} slotKey={slotKey} />;
}

function ExportSession({ grantId, slotKey }: { grantId: string; slotKey: string }) {
  const theme = useTheme();
  const { effectiveWidth } = useLayoutMetrics();
  const serviceAvailable = ENV.DATA_SOURCE !== 'mock';
  const local = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const setDocument = useDraftStore((state) => state.setExportDocument);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const effectiveRole = projectRoles[activeProjectId] ?? activeRole;
  const nickname = useWorkspaceStore((state) => state.nickname);
  const recordActivity = useProgressStore((state) => state.recordActivity);
  const recordExportDownload = useProgressStore((state) => state.recordExportDownload);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const draft = useProposalDraft(grantId);
  const scan = useAuditStatus(grantId, false, slotKey);
  const mutation = useExportBundle(grantId);
  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [bundleNotice, setBundleNotice] = useState('');
  const [requestedGrantId, setRequestedGrantId] = useState<string | null>(null);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const canEdit = canRolePerform(effectiveRole, 'edit');

  const rawRequired = draft.data?.requiredSections;
  const rawCompleted = draft.data?.completedSections;
  const rawBody = draft.data?.body;
  const runningAudit = ENV.DATA_SOURCE !== 'mock' && scan.data?.status === 'running';
  const resolvedNarrative = resolveApplicationNarrative(local.exportDocument, work, rawBody);

  const { incompleteSections, confidenceScore, auditStale, unlocked } = useApplicationAuditState({
    requiredSections: rawRequired,
    completedSections: rawCompleted,
    work,
    exportBody: resolvedNarrative,
    contentRevision: local.contentRevision,
    auditedSignature: local.auditedSignature,
    profileRevisionId: activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest',
    scanStatus: scan.data?.status,
    running: runningAudit,
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
          description={draft.error?.message ?? 'Open an application before exporting.'}
          ctaLabel={draft.isError ? 'Try again' : undefined}
          onCtaPress={() => {
            void draft.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  const selectedFormat = EXPORT_FORMATS.find((item) => item.id === format);
  const documentBody = resolvedNarrative;
  const localBodyReady = Boolean(documentBody.trim()) && documentBody.length <= MAX_INPUT_CHARS;
  const activeProjectName = activeProject?.name ?? activeProjectId;
  const activeRevisionId =
    activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest';
  const txtFilename = buildSafeExportFilename(activeProjectName, grantId, 'txt');
  const mdFilename = buildSafeExportFilename(activeProjectName, grantId, 'md');

  const handleLocalDownload = (localFormat: LocalTextFormat) => {
    try {
      const filename = localFormat === 'txt' ? txtFilename : mdFilename;
      const content = formatLocalExportContent({
        format: localFormat,
        projectName: activeProjectName,
        grantId,
        profileRevisionId: activeRevisionId,
        body: documentBody,
      });
      const mimeType =
        localFormat === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
      const triggered = triggerWebTextDownload(filename, content, mimeType);
      if (canEdit) {
        recordExportDownload(slotKey, localFormat, filename, nickname || 'Founder Lead');
      }
      setDownloadError('');
      setBundleNotice(
        triggered
          ? `Downloaded ${filename}.`
          : 'Direct file download is unavailable in this environment. Copy the application narrative below instead.'
      );
    } catch (e) {
      setBundleNotice('');
      setDownloadError(e instanceof Error ? e.message : 'Unable to export file.');
    }
  };
  const result =
    requestedGrantId === grantId &&
    !mutation.isPending &&
    mutation.variables?.format === format &&
    mutation.variables.documentBody === documentBody
      ? mutation.data
      : undefined;
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="h1" align="center">
          Review &amp; export
        </AppText>
        <GrantContext grantId={grantId} />
        <WorkspaceStudioBar />
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Work Slot Multi-Artifact Bundle Composer</AppText>
          <AppText variant="caption" color="muted">
            Active Project: {activeProject?.name ?? activeProjectId} · Pinned Profile:{' '}
            {activeApp?.profileRevisionId ?? activeProject?.currentRevisionId} · Template Sections:{' '}
            {work.sections.length}
          </AppText>
          {bundleNotice ? <AppText color="verified">{bundleNotice}</AppText> : null}
          <AppButton
            size="sm"
            variant="outline"
            label="Load Active Work Slot Bundle into Export"
            disabled={!canEdit}
            onPress={() => {
              const serialized = fullArtifactBundleText(work, activeProjectName, activeRevisionId);
              setDocument(slotKey, serialized);
              recordActivity(slotKey, {
                actor: nickname || 'Founder Lead',
                agent: 'system',
                message: 'Loaded work slot bundle into Export',
              });
              setBundleNotice(
                'Loaded Narrative, Pitch Deck Slide Outline, and Requirement Compliance Annex into Export.'
              );
            }}
          />
          <View style={styles.rowWrap}>
            <AppButton
              size="sm"
              variant="primary"
              label="Download .txt"
              disabled={!localBodyReady}
              onPress={() => handleLocalDownload('txt')}
            />
            <AppButton
              size="sm"
              variant="outline"
              label="Download .md"
              disabled={!localBodyReady}
              onPress={() => handleLocalDownload('md')}
            />
          </View>
        </View>
        <AppText variant="h3" align="center">
          Document format
        </AppText>
        <View
          style={styles.formats}
          accessibilityRole="radiogroup"
          accessibilityLabel="Document format"
        >
          {EXPORT_FORMATS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ checked: format === item.id, disabled: mutation.isPending }}
              aria-checked={format === item.id}
              disabled={mutation.isPending}
              onPress={() => {
                setFormat(item.id);
                setDownloadError('');
              }}
              style={[
                styles.format,
                {
                  flexBasis: effectiveWidth >= 1024 ? '22%' : '45%',
                  backgroundColor: format === item.id ? theme.subtle : theme.surface,
                  borderColor: format === item.id ? theme.primary : theme.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                numberOfLines={1}
                color={format === item.id ? 'primary' : 'main'}
              >
                {item.label.split(' (')[0]}
              </AppText>
            </Pressable>
          ))}
        </View>
        {auditStale && (
          <StatusBadge
            label="Checks incomplete — run Audit again"
            variant="pending"
            style={styles.centerBadge}
          />
        )}
        <AppTextArea
          label="Application narrative"
          placeholder="Write or load your application narrative before exporting..."
          value={documentBody}
          editable={canEdit}
          onChangeText={(text) => {
            if (!canEdit) return;
            setDocument(slotKey, text);
          }}
          charLimit={MAX_INPUT_CHARS}
        />
        {selectedFormat ? (
          <View style={styles.content}>
            <View style={styles.formats}>
              <StatusBadge
                label={
                  auditStale
                    ? 'Checks incomplete — run Audit again'
                    : unlocked
                      ? `Checklist ready - ${confidenceScore}% complete`
                      : incompleteSections.length > 0
                        ? `Complete all required sections · ${confidenceScore}% complete`
                        : `Needs ${TIERS.confidence.pass}% completeness · currently ${confidenceScore}%`
                }
                variant={!auditStale && unlocked ? 'verified' : 'pending'}
              />
              <StatusBadge label={'Selected - ' + selectedFormat.label} variant="neutral" />
            </View>
            <AppButton
              label="Export bundle"
              variant="primary"
              isLoading={mutation.isPending}
              disabled={
                !serviceAvailable ||
                !unlocked ||
                !documentBody.trim() ||
                documentBody.length > MAX_INPUT_CHARS
              }
              onPress={() => {
                setDownloadError('');
                setRequestedGrantId(grantId);
                mutation.mutate({ format: selectedFormat.id, documentBody });
              }}
            />
            {mutation.isError && (
              <AppText color="failure" accessibilityRole="alert">
                {mutation.error.message}
              </AppText>
            )}
            {result && (
              <View style={styles.content}>
                <AppText color="verified" align="center">
                  Bundle ready
                </AppText>
                <AppText variant="caption" align="center">
                  Checksum supplied by document service
                </AppText>
                <AppText variant="metric-sm" align="center" selectable>
                  {result.checksum}
                </AppText>
                <AppButton
                  label="Download bundle"
                  onPress={() => {
                    void (async () => {
                      const cleanUrl = result.downloadUrl.trim();
                      const allowLocalHttp =
                        !ENV.API_BASE_URL || isLocalHttpOrigin(ENV.API_BASE_URL);
                      if (!isSafeExternalUrl(cleanUrl, { allowLocalHttp }))
                        throw new Error('Unsupported download URL');
                      await Linking.openURL(cleanUrl);
                    })().catch(() => setDownloadError('Unable to open the download. Try again.'));
                  }}
                />
              </View>
            )}
            {downloadError ? (
              <AppText color="failure" align="center" accessibilityRole="alert">
                {downloadError}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.md },
  centerBadge: { alignSelf: 'center' },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.sm },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  formats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm },
  format: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
});
