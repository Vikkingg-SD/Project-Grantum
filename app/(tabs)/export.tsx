import React, { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useProposalDraft } from '@/api/hooks/useProposalDraft';
import { useExportBundle } from '@/api/hooks/useExportBundle';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useUIStore } from '@/store/useUIStore';
import { MAX_INPUT_CHARS } from '@/config/constants';
import { SPACING } from '@/config/theme';
import { isExportUnlocked } from '@/utils/scoring';
import type { ExportFormat } from '@/types/api';

export default function ExportScreen() {
  const grantId = useUIStore((state) => state.activeGrantId);
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const setDocument = useDraftStore((state) => state.setExportDocument);
  const draft = useProposalDraft(grantId);
  const mutation = useExportBundle(grantId);
  const [format, setFormat] = useState<ExportFormat>('word');
  const [downloadError, setDownloadError] = useState('');
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
  const documentBody = local.exportDocument ?? draft.data.body;
  const unlocked =
    draft.data.requiredSections.length > 0 && isExportUnlocked(draft.data.confidenceScore);
  const result =
    mutation.variables?.format === format && mutation.variables.documentBody === documentBody
      ? mutation.data
      : undefined;
  const formats: { id: ExportFormat; label: string }[] = [
    { id: 'word', label: 'Word (.docx)' },
    { id: 'notebook', label: 'Notebook (.ipynb)' },
    { id: 'pdf', label: 'PDF (.pdf)' },
    { id: 'markdown', label: 'Markdown (.md)' },
  ];
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="h1">Export Control</AppText>
        <AppText variant="caption" color="muted">
          Deterministic compliance audit gate & document packager
        </AppText>
        <View style={styles.formats}>
          {formats.map((item) => (
            <AppButton
              key={item.id}
              label={item.label}
              variant={format === item.id ? 'primary' : 'outline'}
              disabled={mutation.isPending}
              style={styles.format}
              onPress={() => setFormat(item.id)}
            />
          ))}
        </View>
        <StatusBadge
          label={
            'Export ' +
            (unlocked ? 'unlocked' : 'locked') +
            ' — confidence ' +
            draft.data.confidenceScore
          }
          variant={unlocked ? 'verified' : 'pending'}
        />
        <AppButton
          label="Export Bundle"
          variant="primary"
          isLoading={mutation.isPending}
          disabled={!unlocked || !documentBody.trim() || documentBody.length > MAX_INPUT_CHARS}
          onPress={() => {
            setDownloadError('');
            mutation.mutate({ format, documentBody });
          }}
        />
        <AppTextArea
          label="Document Body"
          value={documentBody}
          onChangeText={(text) => setDocument(grantId, text)}
          charLimit={MAX_INPUT_CHARS}
        />
        {mutation.isError && (
          <AppText color="failure" accessibilityRole="alert">
            {mutation.error.message}
          </AppText>
        )}
        {result && (
          <View style={styles.content}>
            <AppText color="verified">Bundle ready</AppText>
            <AppText variant="caption">Checksum supplied by document service</AppText>
            <AppText variant="metric-sm" selectable>
              {result.checksum}
            </AppText>
            <AppButton
              label="Download bundle"
              onPress={() => {
                void Linking.openURL(result.downloadUrl).catch(() =>
                  setDownloadError('Unable to open the download. Try again.')
                );
              }}
            />
          </View>
        )}
        {downloadError ? (
          <AppText color="failure" accessibilityRole="alert">
            {downloadError}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.md },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  format: { flexGrow: 1, flexBasis: '45%', flexShrink: 1 },
});
