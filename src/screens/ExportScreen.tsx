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
import { MAX_INPUT_CHARS, TIERS } from '@/config/constants';
import { EXPORT_FORMATS } from '@/config/exportFormats';
import { SPACING } from '@/config/theme';
import { isExportUnlocked } from '@/utils/scoring';
import type { ExportFormat } from '@/types/api';

export default function ExportScreen() {
  const grantId = useUIStore((state) => state.activeGrantId);
  return <ExportSession key={grantId} grantId={grantId} />;
}

function ExportSession({ grantId }: { grantId: string }) {
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const setDocument = useDraftStore((state) => state.setExportDocument);
  const draft = useProposalDraft(grantId);
  const mutation = useExportBundle(grantId);
  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [requestedGrantId, setRequestedGrantId] = useState<string | null>(null);
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
        <AppText variant="h1">Export control</AppText>
        <AppText color="muted">
          Select the document format the humanizer will draft into. You can edit the output here
          before export.
        </AppText>
        <View style={styles.formats}>
          {EXPORT_FORMATS.map((item) => (
            <View key={item.id} style={[styles.content, styles.format]}>
              <AppButton
                label={item.label}
                variant={format === item.id ? 'primary' : 'outline'}
                disabled={mutation.isPending}
                onPress={() => {
                  setFormat(item.id);
                  setDownloadError('');
                }}
              />
              <AppText variant="caption" color="muted">
                {item.blurb}
              </AppText>
            </View>
          ))}
        </View>
        {selectedFormat ? (
          <View style={styles.content}>
            <StatusBadge
              label={
                unlocked
                  ? `Export unlocked — confidence ${draft.data.confidenceScore}`
                  : `Export locked — confidence ${draft.data.confidenceScore} below ${TIERS.confidence.pass}`
              }
              variant={unlocked ? 'verified' : 'pending'}
            />
            <StatusBadge label={'Editing · ' + selectedFormat.label} variant="verified" />
            {/* RUL-SSU-05: the reference humanizer is declared inert, not simulated. */}
            <AppButton
              label="Run humanizer pass"
              variant="outline"
              disabled
              onPress={() => undefined}
            />
            <AppButton
              label="Export bundle"
              variant="primary"
              isLoading={mutation.isPending}
              disabled={!unlocked || !documentBody.trim() || documentBody.length > MAX_INPUT_CHARS}
              onPress={() => {
                setDownloadError('');
                setRequestedGrantId(grantId);
                mutation.mutate({ format: selectedFormat.id, documentBody });
              }}
            />
            <AppTextArea
              label="Document body"
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
        ) : (
          <EmptyStateLayout
            title="No format selected"
            description="Pick a format above to open the editing surface."
          />
        )}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.md },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  format: { flexGrow: 1, flexBasis: '45%', flexShrink: 1, minWidth: 0 },
});
