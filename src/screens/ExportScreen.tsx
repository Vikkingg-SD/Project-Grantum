import React, { useState } from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioModals';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useExportBundle } from '@/api/hooks/useExportBundle';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { MAX_INPUT_CHARS, TIERS } from '@/config/constants';
import { EXPORT_FORMATS } from '@/config/exportFormats';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ENV } from '@/config/env';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { RADIUS, SPACING } from '@/config/theme';
import { isExportUnlocked } from '@/utils/scoring';
import { fullArtifactBundleText } from '@/utils/drafting';
import { canRolePerform, workSlotKey } from '@/utils/workspace';
import type { ExportFormat } from '@/types/api';

export default function ExportScreen() {
  const grantId = useActiveGrantId();
  return <ExportSession key={grantId} grantId={grantId} />;
}

function ExportSession({ grantId }: { grantId: string }) {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const { effectiveWidth } = useLayoutMetrics();
  const serviceAvailable = ENV.DATA_SOURCE !== 'mock';
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const setDocument = useDraftStore((state) => state.setExportDocument);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const slotKey = workSlotKey(activeProjectId, grantId);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const draft = useProposalDraft(grantId);
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
  const canEdit = canRolePerform(activeRole, 'edit');

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
  const documentBody = local.exportDocument ?? draft.data.body;
  const unlocked =
    draft.data.requiredSections.length > 0 && isExportUnlocked(draft.data.confidenceScore);
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
          Review & export
        </AppText>
        <GrantContext grantId={grantId} />
        <WorkspaceStudioBar
          onOpenGrantDraft={(targetGrantId) => navigation.navigateTo('drafting', targetGrantId)}
        />
        {!serviceAvailable && (
          <View style={[styles.notice, { backgroundColor: theme.subtle }]}>
            <AppText variant="label" align="center">
              Downloads unavailable
            </AppText>
            <AppText color="muted" align="center">
              Preview - edits stay in this session.
            </AppText>
          </View>
        )}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <AppText variant="h3">Work Slot Multi-Artifact Bundle Composer</AppText>
            <StatusBadge label={`Outputs: ${work.outputs.join(', ')}`} variant="neutral" />
          </View>
          <AppText variant="caption" color="muted">
            Active Project: {activeProject?.name ?? activeProjectId} · Pinned Profile:{' '}
            {activeApp?.profileRevisionId ?? activeProject?.currentRevisionId} · Studio Sections:{' '}
            {work.sections.length}
          </AppText>
          {bundleNotice ? <AppText color="verified">{bundleNotice}</AppText> : null}
          <AppButton
            size="sm"
            variant="outline"
            label="Load Active Work Slot Bundle into Export"
            disabled={!canEdit}
            onPress={() => {
              const serialized = fullArtifactBundleText(
                work,
                activeProject?.name ?? activeProjectId,
                activeApp?.profileRevisionId ?? activeProject?.currentRevisionId ?? 'latest'
              );
              setDocument(grantId, serialized);
              setBundleNotice(
                'Loaded Narrative, Pitch Deck Slide Outline, and Requirement Compliance Annex into Export.'
              );
            }}
          />
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
        <AppTextArea
          label="Application narrative"
          value={documentBody}
          onChangeText={(text) => {
            if (!canEdit) return;
            setDocument(grantId, text);
          }}
          charLimit={MAX_INPUT_CHARS}
        />
        {selectedFormat ? (
          <View style={styles.content}>
            <View style={styles.formats}>
              <StatusBadge
                label={
                  unlocked
                    ? `Checklist ready - ${draft.data.confidenceScore}% complete`
                    : `Needs ${TIERS.confidence.pass}% completeness · currently ${draft.data.confidenceScore}%`
                }
                variant={unlocked ? 'verified' : 'pending'}
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
                      if (!/^https?:\/\//i.test(result.downloadUrl))
                        throw new Error('Unsupported download URL');
                      await Linking.openURL(result.downloadUrl);
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
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.sm },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  notice: { borderRadius: RADIUS.md, padding: SPACING.lg, gap: SPACING.sm },
});
