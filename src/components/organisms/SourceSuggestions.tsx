import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge, type StatusBadgeProps } from '@/components/atoms/StatusBadge';
import { ExternalSourceLink } from '@/components/molecules/ExternalSourceLink';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import {
  hydrateSourceSuggestions,
  useSourceSuggestionStore,
} from '@/store/useSourceSuggestionStore';
import {
  isBountyComplete,
  validateBountySubmission,
  validateSource,
  verifySourceLink,
  type BountyFormInput,
  type SourceModerationStatus,
  type SourceSuggestion,
} from '@/utils/sourceSuggestions';
import { useTheme } from '@/hooks/useTheme';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { SPACING } from '@/config/theme';
import { posthog } from '@/config/posthog';

const EMPTY_FORM: BountyFormInput = {
  title: '',
  url: '',
  region: '',
  prizePool: '',
  mission: '',
  note: '',
};

const EMPTY_ERRORS: BountyFormInput = {
  title: '',
  url: '',
  region: '',
  prizePool: '',
  mission: '',
  note: '',
};

export function formatModerationBadge(entry: SourceSuggestion): {
  label: string;
  variant: StatusBadgeProps['variant'];
} {
  const status: SourceModerationStatus = entry.moderationStatus ?? 'draft';
  switch (status) {
    case 'submitting':
      return { label: 'Submitting…', variant: 'pending' };
    case 'pending-review':
      return { label: 'Pending review', variant: 'pending' };
    case 'changes-requested':
      return { label: 'Changes requested', variant: 'gold' };
    case 'accepted':
      return {
        label: entry.rewardGranted ? 'Accepted · Tier 1 reward' : 'Accepted',
        variant: 'verified',
      };
    case 'declined':
      return { label: 'Declined', variant: 'failure' };
    case 'submission-failed':
      return { label: 'Submission failed', variant: 'failure' };
    case 'draft':
    default:
      return { label: 'Draft', variant: 'neutral' };
  }
}

export function SourceSuggestions() {
  const theme = useTheme();
  const { entries, hydrated, status, submitting, saveDraft, submitBounty } =
    useSourceSuggestionStore();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  useEscapeDismiss(historyOpen, () => setHistoryOpen(false));
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<BountyFormInput>(EMPTY_FORM);
  const [validationMode, setValidationMode] = useState<'none' | 'draft' | 'submit'>('none');
  const [linkCheckRequested, setLinkCheckRequested] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [linkNotice, setLinkNotice] = useState('');

  useEffect(() => {
    void hydrateSourceSuggestions();
  }, []);

  const linkCheck = verifySourceLink(form.url);
  const confirmedUrl = linkCheck.status === 'confirmed' ? linkCheck.normalizedUrl : undefined;

  const fieldErrors: BountyFormInput = (() => {
    if (validationMode === 'submit') return validateBountySubmission(form);
    if (validationMode === 'draft') {
      const draftErrors = validateSource(form.title, form.url, form.note);
      return { ...EMPTY_ERRORS, ...draftErrors };
    }
    if (linkCheckRequested && linkCheck.status !== 'confirmed') {
      return { ...EMPTY_ERRORS, url: linkCheck.message };
    }
    return EMPTY_ERRORS;
  })();

  const updateField = (key: keyof BountyFormInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'url') {
      setLinkNotice('');
    }
  };

  const openModal = (entry?: SourceSuggestion) => {
    if (entry) {
      setEditingId(entry.id);
      setForm({
        title: entry.title,
        url: entry.url,
        region: entry.region ?? '',
        prizePool: entry.prizePool ?? '',
        mission: entry.mission ?? '',
        note: entry.note,
      });
    } else {
      setEditingId(undefined);
      setForm(EMPTY_FORM);
    }
    setValidationMode('none');
    setLinkCheckRequested(false);
    setError('');
    setLinkNotice('');
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(undefined);
    setValidationMode('none');
    setLinkCheckRequested(false);
    setError('');
    setLinkNotice('');
  };

  const handleSaveDraft = () => {
    setValidationMode('draft');
    setError('');
    const draftErrors = validateSource(form.title, form.url, form.note);
    if (Object.values(draftErrors).some(Boolean)) return;
    const result = saveDraft(form, editingId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFeedback('Draft saved to your source list. Complete all required fields to submit.');
    setHistoryOpen(true);
    close();
  };

  const handleSubmitBounty = async () => {
    setValidationMode('submit');
    setError('');
    const errors = validateBountySubmission(form);
    if (Object.values(errors).some(Boolean)) return;
    const result = await submitBounty(form, editingId);
    if (result.error) {
      setError(result.error);
      if (result.entry) {
        setEditingId(result.entry.id);
        setHistoryOpen(true);
      }
      return;
    }
    posthog?.capture('source_suggestion_submitted', {
      submission_method: 'form',
      has_prize_pool: Boolean(form.prizePool.trim()),
    });
    setFeedback(
      `Submitted "${result.entry?.title ?? form.title.trim()}" for Bounty Hunt moderation (Pending review).`
    );
    setHistoryOpen(true);
    close();
  };

  const handleDirectSubmit = async (entry: SourceSuggestion) => {
    setFeedback('');
    const result = await submitBounty(
      {
        title: entry.title,
        url: entry.url,
        region: entry.region ?? '',
        prizePool: entry.prizePool ?? '',
        mission: entry.mission ?? '',
        note: entry.note,
      },
      entry.id
    );
    if (result.error) {
      setFeedback(result.error);
      return;
    }
    posthog?.capture('source_suggestion_submitted', {
      submission_method: 'saved_draft',
      has_prize_pool: Boolean(entry.prizePool),
    });
    setFeedback(`Submitted "${entry.title}" for Bounty Hunt moderation (Pending review).`);
  };

  return (
    <View style={styles.section}>
      <View style={styles.actions}>
        <AppButton label="Bounty Hunt" variant="gold" onPress={() => openModal()} />
        <AppButton
          label={`Your saved sources (${entries.length})`}
          variant="ghost"
          expanded={historyOpen}
          onPress={() => setHistoryOpen(!historyOpen)}
        />
      </View>

      {entries.length > 0 && status === 'session-only' && (
        <AppText accessibilityLiveRegion="polite" color="failureText">
          Storage unavailable; copy your details before leaving.
        </AppText>
      )}
      {feedback ? (
        <AppText accessibilityLiveRegion="polite" color="verified">
          {feedback}
        </AppText>
      ) : null}

      {historyOpen && (
        <View style={styles.section}>
          <AppText variant="h2">Your saved sources</AppText>
          {!hydrated ? (
            <AppText>Loading saved sources…</AppText>
          ) : !entries.length ? (
            <AppText color="muted">No sources saved yet.</AppText>
          ) : (
            entries.map((entry) => {
              const badge = formatModerationBadge(entry);
              const editable =
                entry.moderationStatus !== 'pending-review' &&
                entry.moderationStatus !== 'accepted' &&
                entry.moderationStatus !== 'submitting';
              const readyToSubmit = editable && isBountyComplete(entry);
              return (
                <View key={entry.id} style={[styles.entry, { borderTopColor: theme.border }]}>
                  <View style={styles.entryHeader}>
                    <AppText variant="h3" style={styles.entryTitle}>
                      {entry.title}
                    </AppText>
                    <StatusBadge label={badge.label} variant={badge.variant} />
                  </View>
                  <ExternalSourceLink
                    url={entry.url}
                    accessibilityLabel={`Open source link ${entry.url}`}
                    onError={setFeedback}
                  />
                  {entry.region ? (
                    <AppText variant="caption" color="muted">
                      Location / region: {entry.region}
                    </AppText>
                  ) : null}
                  {entry.prizePool ? (
                    <AppText variant="caption" color="muted">
                      Prize pool: {entry.prizePool}
                    </AppText>
                  ) : null}
                  {entry.mission ? (
                    <AppText variant="caption">Mission: {entry.mission}</AppText>
                  ) : null}
                  {entry.note ? <AppText variant="caption">Note: {entry.note}</AppText> : null}
                  {entry.moderationNote ? (
                    <AppText variant="caption" color="pending">
                      Moderator note: {entry.moderationNote}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color="muted">
                    {new Date(entry.submittedAt ?? entry.createdAt).toLocaleDateString()}
                    {entry.receiptId ? ` · Receipt ${entry.receiptId}` : ''}
                  </AppText>
                  {editable ? (
                    <View style={styles.actions}>
                      <AppButton
                        size="sm"
                        variant="outline"
                        label="Edit draft"
                        onPress={() => openModal(entry)}
                      />
                      {readyToSubmit ? (
                        <AppButton
                          size="sm"
                          variant="gold"
                          label={
                            entry.moderationStatus === 'submission-failed'
                              ? 'Retry submission'
                              : 'Submit for Bounty Hunt'
                          }
                          disabled={submitting}
                          onPress={() => void handleDirectSubmit(entry)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}

      <ModalSheetLayout visible={open} onClose={close} accessibilityLabel="Bounty Hunt">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <AppText variant="h2">Bounty Hunt</AppText>
          <AppText color="muted">
            Submit a verified official opportunity with all required details for free Tier 1
            subscription reward review.
          </AppText>
          <AppInput
            label="Source title (required)"
            value={form.title}
            onChangeText={(value) => updateField('title', value)}
            maxLength={160}
            error={fieldErrors.title}
          />
          <AppInput
            label="Official source URL (required)"
            value={form.url}
            onChangeText={(value) => updateField('url', value)}
            maxLength={2048}
            error={fieldErrors.url}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://foundation.org/funding-call"
          />
          <View style={styles.linkCheckSection}>
            <View style={styles.actions}>
              <AppButton
                size="sm"
                variant="outline"
                label="Verify link"
                onPress={() => setLinkCheckRequested(true)}
              />
              {confirmedUrl ? (
                <StatusBadge label="Link format confirmed" variant="verified" />
              ) : linkCheckRequested || validationMode !== 'none' || form.url.trim().length > 0 ? (
                <StatusBadge
                  label={
                    linkCheck.status === 'unconfirmed-host' ? 'Link unconfirmed' : 'Link incomplete'
                  }
                  variant="failure"
                />
              ) : null}
            </View>
            {confirmedUrl ? (
              <ExternalSourceLink
                testID="confirmed-source-link"
                url={confirmedUrl}
                accessibilityLabel={`Open confirmed link ${confirmedUrl}`}
                color="verified"
                iconSize={16}
                bordered
                onError={setLinkNotice}
              />
            ) : null}
            {linkCheck.redirectedFrom ? (
              <AppText variant="caption" color="muted">
                Redirect target verified: {confirmedUrl}
              </AppText>
            ) : null}
            {linkNotice ? (
              <AppText variant="caption" color="failureText" accessibilityRole="alert">
                {linkNotice}
              </AppText>
            ) : null}
          </View>
          <AppInput
            label="Location / region (required)"
            value={form.region}
            onChangeText={(value) => updateField('region', value)}
            maxLength={160}
            error={fieldErrors.region}
            placeholder="Global, East Europe, CIS, or country"
          />
          <View style={styles.fieldStack}>
            <AppInput
              label="Prize pool (required)"
              value={form.prizePool}
              onChangeText={(value) => updateField('prizePool', value)}
              maxLength={160}
              error={fieldErrors.prizePool}
              placeholder="$50k–$250k or Not published"
            />
            <View style={styles.actions}>
              <AppButton
                size="sm"
                variant="ghost"
                label="Use Not published"
                onPress={() => updateField('prizePool', 'Not published')}
              />
            </View>
          </View>
          <AppInput
            label="Mission (required)"
            value={form.mission}
            onChangeText={(value) => updateField('mission', value)}
            maxLength={500}
            error={fieldErrors.mission}
            multiline
            placeholder="Core funding objective and target impact"
          />
          <AppInput
            label="What Grantum should also note (required)"
            value={form.note}
            onChangeText={(value) => updateField('note', value)}
            maxLength={1000}
            error={fieldErrors.note}
            multiline
            placeholder="Eligibility rules, co-funding terms, or submission details"
          />
          {error ? (
            <AppText accessibilityRole="alert" color="failureText">
              {error}
            </AppText>
          ) : null}
          <AppButton
            label="Submit for Bounty Hunt"
            variant="gold"
            disabled={!hydrated || submitting}
            isLoading={submitting}
            onPress={() => void handleSubmitBounty()}
          />
          <AppButton
            label="Save draft"
            variant="outline"
            disabled={!hydrated || submitting}
            onPress={handleSaveDraft}
          />
          <AppButton label="Cancel" variant="ghost" onPress={close} />
          <AppText variant="caption" color="muted">
            Free Tier 1 subscription bounties are awarded only after moderators verify all fields
            and confirm the source.
          </AppText>
        </ScrollView>
      </ModalSheetLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  form: { padding: SPACING.lg, gap: SPACING.md },
  fieldStack: { gap: SPACING.xs },
  entry: { borderTopWidth: 1, paddingTop: SPACING.md, gap: SPACING.sm },
  entryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  entryTitle: { flex: 1, minWidth: 0 },
  linkCheckSection: { gap: SPACING.sm },
});
