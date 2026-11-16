import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppButton } from '../atoms/AppButton';
import { AppInput } from '../atoms/AppInput';
import { AppText } from '../atoms/AppText';
import { StatusBadge } from '../atoms/StatusBadge';
import {
  bundleText,
  fullArtifactBundleText,
  recordSubmission,
  validSource,
  type DraftWorkbench,
} from '@/utils/drafting';
import { evaluateFinishReview, type EditableReviewStatus } from '@/utils/finishReview';
import { generateId } from '@/utils/uuid';
import type { ApplicationBundle } from '@/types/workspace';
import { RADIUS, SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';

export interface DraftReviewTabProps {
  grantId: string;
  slotKey: string;
  work: DraftWorkbench;
  activeProjectId: string;
  activeProjectName: string;
  activeProfileRevisionId: string;
  activeApp?: ApplicationBundle;
  syncLag: number;
  canEdit: boolean;
  canReview: boolean;
  canSubmit: boolean;
  act: (action: () => void, message?: string) => void;
  update: (key: string, fn: (current: DraftWorkbench) => DraftWorkbench) => void;
  setExport: (grantId: string, text: string) => void;
  setWorkSlotReviewStatus: (applicationId: string, status: EditableReviewStatus) => void;
  markWorkSlotSubmitted: (applicationId: string, receipt: string) => void;
  onError: (msg: string) => void;
}

export function DraftReviewTab({
  grantId,
  slotKey,
  work,
  activeProjectName,
  activeProfileRevisionId,
  activeApp,
  syncLag,
  canEdit,
  canReview,
  canSubmit,
  act,
  update,
  setExport,
  setWorkSlotReviewStatus,
  markWorkSlotSubmitted,
  onError,
}: DraftReviewTabProps) {
  const theme = useTheme();
  const [receipt, setReceipt] = useState('');
  const [destination, setDestination] = useState('');
  const [finishInfoOpen, setFinishInfoOpen] = useState(false);

  const mappings = work.requirementMappings ?? [];
  const finishReview = evaluateFinishReview({
    status: activeApp?.status ?? 'drafting',
    filledSections: work.sections.filter((s) => s.text.trim()).length,
    totalSections: work.sections.length,
    approvedRequirements: mappings.filter((m) => m.reviewStatus === 'approved').length,
    totalRequirements: mappings.length,
    syncLag,
  });

  return (
    <>
      <View style={[styles.subCard, { borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <AppText variant="h3">Internal finish &amp; review status</AppText>
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
          {finishReview.passedCount}/{finishReview.totalCount} local preparation checks met. Does
          not submit to an external funder.
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
        {finishReview.checks.map((item) => (
          <View key={item.id} style={styles.headerRow}>
            <AppText variant="caption">
              {item.label}: {item.detail}
            </AppText>
            <StatusBadge
              label={item.met ? 'MET' : 'PENDING'}
              variant={item.met ? 'verified' : 'pending'}
            />
          </View>
        ))}
        {activeApp && (
          <View style={styles.rowWrap}>
            <AppButton
              size="sm"
              variant="outline"
              label="Mark in review"
              disabled={
                !finishReview.canTransition ||
                (!canEdit && !canReview) ||
                finishReview.status === 'review'
              }
              onPress={() =>
                act(
                  () => setWorkSlotReviewStatus(activeApp.id, 'review'),
                  'Work slot marked IN REVIEW on this device. Editing remains reversible.'
                )
              }
            />
            <AppButton
              size="sm"
              variant="primary"
              label="Finish application (mark ready)"
              disabled={
                !finishReview.canTransition ||
                (!canEdit && !canReview) ||
                finishReview.status === 'ready'
              }
              onPress={() =>
                act(
                  () => setWorkSlotReviewStatus(activeApp.id, 'ready'),
                  'Application marked READY on this device. You can reopen it at any time; nothing was sent externally.'
                )
              }
            />
            <AppButton
              size="sm"
              variant="outline"
              label="Reopen for drafting"
              disabled={
                !finishReview.canTransition || !canEdit || finishReview.status === 'drafting'
              }
              onPress={() =>
                act(
                  () => setWorkSlotReviewStatus(activeApp.id, 'drafting'),
                  'Work slot reopened to DRAFTING for further edits.'
                )
              }
            />
          </View>
        )}
      </View>

      <AppText variant="h3">Bundle review</AppText>
      <AppText>Outputs: {work.outputs.join(', ')}</AppText>
      <AppText>
        {work.sections.filter((s) => s.text.trim()).length}/{work.sections.length} sections have
        text. This is not an AI assessment or eligibility verdict.
      </AppText>
      <AppText>{bundleText(work) || 'No content to review.'}</AppText>
      <AppText color="muted">
        Open the Grant Detail sheet to inspect the structured Verifiable Match Report for your
        active Project Profile Slot.
      </AppText>
      <AppButton
        label="Use reviewed text in Export"
        disabled={!work.sections.length || work.sections.some((s) => !s.text.trim())}
        onPress={() =>
          act(
            () =>
              setExport(
                grantId,
                fullArtifactBundleText(work, activeProjectName, activeProfileRevisionId)
              ),
            'Review text copied to Export. Download requires a connected service; nothing was submitted.'
          )
        }
      />
      <AppText variant="h3">Record an external submission</AppText>
      <AppText>
        Submit through the funder&apos;s official site first, then record its receipt. This locks
        the work slot snapshot for audit compliance.
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
          void Linking.openURL(destination).catch(() => onError('Could not open the destination.'));
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
            update(slotKey, (current) =>
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
  subCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
});
