import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { RADIUS, SPACING, withAlpha } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  hydrateEligibilityPreflight,
  preflightChatSlotKey,
  useEligibilityPreflightStore,
} from '@/store/useEligibilityPreflightStore';
import {
  buildPreflightForGrantAndProfile,
  formatPreflightContextBrief,
  preflightScopeKey,
  summarizePreflight,
  type PreflightQuestionSource,
  type PreflightScope,
} from '@/utils/eligibilityPreflight';
import type { Grant } from '@/types/grant';
import type { ProfileRevision, ProjectProfile } from '@/types/workspace';

export interface EligibilityPreflightPanelProps {
  grant: Pick<Grant, 'id' | 'title' | 'region' | 'amount' | 'eligibilityCriteria'>;
  requirements?: readonly string[];
  attemptId?: string;
  project?: Pick<ProjectProfile, 'id' | 'name' | 'kind'> | null;
  revision?: Pick<ProfileRevision, 'id' | 'fields'> | null;
  onApplyToChat?: (brief: string) => void;
}

const SOURCE_LABELS: Record<PreflightQuestionSource, string> = {
  'grant-criteria': 'Grant rule',
  'profile-gap': 'Profile gap',
  agent: 'Agent scan',
  custom: 'Custom',
};

export function EligibilityPreflightPanel({
  grant,
  requirements,
  attemptId,
  project,
  revision,
  onApplyToChat,
}: EligibilityPreflightPanelProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [notice, setNotice] = useState('');

  const records = useEligibilityPreflightStore((state) => state.records);
  const chatSessions = useEligibilityPreflightStore((state) => state.chatSessions);
  const hydrated = useEligibilityPreflightStore((state) => state.hydrated);
  const preflightStatus = useEligibilityPreflightStore((state) => state.status);
  const setCriterionStatus = useEligibilityPreflightStore((state) => state.setCriterionStatus);
  const setCriterionAnswer = useEligibilityPreflightStore((state) => state.setCriterionAnswer);
  const addCustomQuestion = useEligibilityPreflightStore((state) => state.addCustomQuestion);
  const clearToEmptyTemplate = useEligibilityPreflightStore((state) => state.clearToEmptyTemplate);
  const scanGrantAndProfile = useEligibilityPreflightStore((state) => state.scanGrantAndProfile);
  const startNewChatInterview = useEligibilityPreflightStore(
    (state) => state.startNewChatInterview
  );

  useEffect(() => {
    void hydrateEligibilityPreflight();
  }, []);

  const projectId = project?.id ?? 'project-1';
  const profileRevisionId = revision?.id ?? 'latest';
  const chatSlot = preflightChatSlotKey(projectId, grant.id, attemptId);
  const chatSeq = chatSessions[chatSlot] ?? 1;
  const chatId = `chat-${chatSeq}`;

  const scope: PreflightScope = useMemo(
    () => ({
      projectId,
      grantId: grant.id,
      profileRevisionId,
      chatId,
      attemptId,
    }),
    [attemptId, chatId, grant.id, profileRevisionId, projectId]
  );
  const scopeKey = useMemo(() => preflightScopeKey(scope), [scope]);

  const savedRecord = records[scopeKey];
  const record = useMemo(
    () =>
      savedRecord ??
      buildPreflightForGrantAndProfile({
        scope,
        grant,
        requirements,
        project,
        revision,
      }),
    [grant, project, requirements, revision, savedRecord, scope]
  );

  const summary = useMemo(() => summarizePreflight(record), [record]);

  const badgeLabel = summary.isEmpty
    ? 'Empty template'
    : `${summary.metCount}/${summary.totalCount} confirmed`;
  const badgeVariant = summary.isEmpty
    ? 'neutral'
    : summary.metCount === summary.totalCount
      ? 'verified'
      : 'pending';

  return (
    <View
      testID="drafting-preflight-panel"
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <AppText variant="h3">Pre-flight interview</AppText>
          <AppText variant="caption" color="muted">
            {project?.name ?? projectId} · {profileRevisionId} · {chatId}
          </AppText>
        </View>
        <View style={styles.headerControls}>
          <StatusBadge label={badgeLabel} variant={badgeVariant} />
          <AppButton
            size="sm"
            variant="ghost"
            label={open ? 'Hide interview' : 'Open interview'}
            expanded={open}
            onPress={() => setOpen((current) => !current)}
          />
        </View>
      </View>

      <AppText accessibilityLiveRegion="polite" variant="caption" color="muted">
        {summary.summaryText}
      </AppText>

      {open ? (
        <View style={styles.body}>
          <View style={styles.toolbar}>
            <AppButton
              size="sm"
              variant="outline"
              label="Scan grant & profile"
              disabled={!hydrated}
              onPress={() => {
                scanGrantAndProfile({ scope, grant, requirements, project, revision });
                setQuestionError('');
                setNotice('Generated pre-flight questions from this grant and project profile.');
              }}
            />
            <AppButton
              size="sm"
              variant="ghost"
              label="Empty template"
              disabled={!hydrated || summary.isEmpty}
              onPress={() => {
                clearToEmptyTemplate(scope);
                setQuestionError('');
                setNotice('Cleared to an empty template ready for the agent or custom questions.');
              }}
            />
            <AppButton
              size="sm"
              variant="ghost"
              label="New chat interview"
              disabled={!hydrated}
              onPress={() => {
                const nextChat = startNewChatInterview(projectId, grant.id, attemptId);
                setQuestionError('');
                setNotice(`Started fresh interview session (${nextChat}).`);
              }}
            />
          </View>

          {summary.isEmpty ? (
            <View style={[styles.emptyState, { borderTopColor: theme.border }]}>
              <AppText variant="body">No pre-flight questions in this template yet.</AppText>
              <AppText variant="caption" color="muted">
                Use &quot;Scan grant &amp; profile&quot; to generate anti-assumption checks from
                this grant&apos;s requirements and your active Project Profile, or add a custom
                question below.
              </AppText>
            </View>
          ) : (
            record.criteria.map((criterion) => (
              <View
                key={criterion.id}
                style={[styles.questionRow, { borderTopColor: theme.border }]}
              >
                <View style={styles.questionHeader}>
                  <AppText variant="body" style={styles.questionLabel}>
                    {criterion.label}
                  </AppText>
                  <StatusBadge
                    label={SOURCE_LABELS[criterion.source]}
                    variant={criterion.source === 'profile-gap' ? 'gold' : 'neutral'}
                  />
                </View>
                {criterion.uncertainty ? (
                  <AppText variant="caption" color="muted">
                    {criterion.uncertainty}
                  </AppText>
                ) : null}
                <View style={styles.statusActions}>
                  {(
                    [
                      ['met', 'Confirmed'],
                      ['review', 'Needs review'],
                      ['unconfirmed', 'Unconfirmed'],
                    ] as const
                  ).map(([statusKey, label]) => {
                    const isSelected = criterion.status === statusKey;
                    const activeStyle =
                      isSelected && statusKey === 'met'
                        ? {
                            backgroundColor: withAlpha(theme.verified, 0.16),
                            borderColor: theme.verified,
                            borderWidth: 1.5,
                          }
                        : isSelected && statusKey === 'review'
                          ? {
                              backgroundColor: withAlpha(theme.pending, 0.16),
                              borderColor: theme.pending,
                              borderWidth: 1.5,
                            }
                          : isSelected
                            ? {
                                backgroundColor: theme.subtle,
                                borderColor: theme.borderStrong,
                                borderWidth: 1.5,
                              }
                            : undefined;
                    const checkColor =
                      statusKey === 'met'
                        ? theme.verifiedText
                        : statusKey === 'review'
                          ? theme.pendingText
                          : theme.textMain;
                    return (
                      <AppButton
                        key={statusKey}
                        size="sm"
                        variant="outline"
                        label={label}
                        accessibilityLabel={`${label}: ${criterion.label}`}
                        selected={isSelected}
                        disabled={!hydrated}
                        icon={
                          isSelected ? (
                            <Check size={14} strokeWidth={2.5} color={checkColor} />
                          ) : undefined
                        }
                        style={[styles.statusButton, activeStyle]}
                        onPress={() => {
                          setCriterionStatus(record, criterion.id, statusKey);
                          setNotice('');
                        }}
                      />
                    );
                  })}
                </View>
                <AppInput
                  accessibilityLabel={`Clarification for ${criterion.label}`}
                  placeholder="Add clarification or correction for the agent..."
                  value={criterion.answer}
                  editable={hydrated}
                  maxLength={500}
                  onChangeText={(text) => setCriterionAnswer(record, criterion.id, text)}
                />
              </View>
            ))
          )}

          <View style={[styles.addRow, { borderTopColor: theme.border }]}>
            <View style={styles.addInput}>
              <AppInput
                accessibilityLabel="Add precision question"
                placeholder="Add a custom pre-flight question..."
                value={newQuestion}
                maxLength={240}
                onChangeText={(text) => {
                  setNewQuestion(text);
                  if (questionError) setQuestionError('');
                }}
              />
            </View>
            <AppButton
              size="sm"
              variant="outline"
              label="Add question"
              disabled={!hydrated || !newQuestion.trim()}
              onPress={() => {
                try {
                  addCustomQuestion(record, newQuestion);
                  setNewQuestion('');
                  setQuestionError('');
                  setNotice('Added pre-flight question.');
                } catch (e) {
                  setQuestionError(e instanceof Error ? e.message : 'Unable to add question.');
                }
              }}
            />
          </View>

          {questionError ? (
            <AppText variant="caption" color="failureText" accessibilityRole="alert">
              {questionError}
            </AppText>
          ) : null}

          {notice ? (
            <AppText variant="caption" color="verified" accessibilityLiveRegion="polite">
              {notice}
            </AppText>
          ) : null}

          <View style={styles.footerRow}>
            <AppText variant="caption" color="muted" style={styles.statusHint}>
              {preflightStatus === 'saving'
                ? 'Saving interview…'
                : preflightStatus === 'session-only'
                  ? 'Storage unavailable; interview applies to the current session.'
                  : 'Interview answers stay scoped to this grant, profile revision, and chat.'}
            </AppText>
            {onApplyToChat && !summary.isEmpty ? (
              <AppButton
                size="sm"
                variant="primary"
                label="Load into chat"
                onPress={() => {
                  const brief = formatPreflightContextBrief(record);
                  if (brief) {
                    onApplyToChat(brief);
                    setNotice('Loaded pre-flight precision context into the chat composer.');
                  }
                }}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleBlock: {
    flexShrink: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  headerControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  body: {
    gap: SPACING.md,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyState: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  questionRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  questionLabel: {
    flex: 1,
    minWidth: 180,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statusButton: {
    flexShrink: 0,
  },
  addRow: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 200,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statusHint: {
    flex: 1,
    minWidth: 180,
  },
});
