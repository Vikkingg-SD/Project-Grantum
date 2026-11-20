import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ExternalSourceLink } from '@/components/molecules/ExternalSourceLink';
import { formatModerationBadge } from '@/components/organisms/SourceSuggestions';
import { useTheme } from '@/hooks/useTheme';
import {
  hydrateSourceSuggestions,
  useSourceSuggestionStore,
} from '@/store/useSourceSuggestionStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { isBountyComplete } from '@/utils/sourceSuggestions';
import { ENV } from '@/config/env';
import { styles } from './workspacePageStyles';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';

export default function AdminScreen() {
  const theme = useTheme();
  const adminQueue = useWorkspaceStore((state) => state.adminQueue);
  const adminAuditLog = useWorkspaceStore((state) => state.adminAuditLog);
  const resolveAdminQueueItem = useWorkspaceStore((state) => state.resolveAdminQueueItem);
  const sourceEntries = useSourceSuggestionStore((state) => state.entries);
  const moderateSource = useSourceSuggestionStore((state) => state.moderate);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    void hydrateSourceSuggestions();
  }, []);
  if (ENV.DATA_SOURCE !== 'mock')
    return (
      <ScreenContainer insetEdges={[]}>
        <EmptyStateLayout
          title="Staff access unavailable"
          description="Sign-in and staff permissions must be provided by your connected service."
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <AppText variant="h1">Staff administration</AppText>
        <AppText color="muted">
          Staff queue updates locally until live publishing services connect.
        </AppText>
        {notice ? (
          <AppText accessibilityLiveRegion="polite" color="verified">
            {notice}
          </AppText>
        ) : null}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Needs attention</AppText>
          <AppText variant="caption" color="muted">
            Review pending jobs and catalog requests. Actions update the queue and activity log.
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
              {item.sourceUrl ? (
                <AppText variant="caption" color="muted" selectable>
                  Source: {item.sourceUrl}
                </AppText>
              ) : null}
              {item.lastCheckedAt ? (
                <AppText variant="caption" color="muted">
                  Last checked: {item.lastCheckedAt.slice(0, 19).replace('T', ' ')}
                </AppText>
              ) : null}
              {item.failureContext ? (
                <AppText variant="caption" color="muted">
                  Context: {item.failureContext}
                </AppText>
              ) : null}
              <View style={styles.rowWrap}>
                {item.category === 'failed-job' && (
                  <AppButton
                    size="sm"
                    label="Retry Job"
                    disabled={item.status !== 'pending'}
                    onPress={() => {
                      resolveAdminQueueItem(item.id, 'retried');
                      setNotice('Job marked for retry.');
                    }}
                  />
                )}
                {item.category !== 'failed-job' && (
                  <>
                    <AppButton
                      size="sm"
                      label="Approve request"
                      disabled={item.status !== 'pending'}
                      onPress={() => {
                        resolveAdminQueueItem(item.id, 'approved');
                        setNotice('Request approved.');
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

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Bounty Hunt submissions ({sourceEntries.length})</AppText>
          <AppText variant="caption" color="muted">
            Entries submitted in Discovery wait here for staff verification and Tier 1 award
            approval.
          </AppText>
          {sourceEntries.length === 0 ? (
            <AppText variant="caption" color="muted">
              No source suggestions saved yet.
            </AppText>
          ) : (
            sourceEntries.map((entry) => {
              const badge = formatModerationBadge(entry);
              const canAward =
                entry.moderationStatus !== 'accepted' &&
                !entry.rewardGranted &&
                isBountyComplete(entry);
              const canModerate =
                entry.moderationStatus === 'pending-review' ||
                entry.moderationStatus === 'changes-requested';
              return (
                <View key={entry.id} style={[styles.checkItem, { borderColor: theme.border }]}>
                  <View style={styles.rowBetween}>
                    <AppText variant="body">{entry.title}</AppText>
                    <StatusBadge label={badge.label} variant={badge.variant} />
                  </View>
                  <ExternalSourceLink
                    url={entry.url}
                    accessibilityLabel={`Open submitted source ${entry.url}`}
                    onError={setNotice}
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
                    <AppText variant="caption" color="muted">
                      Mission: {entry.mission}
                    </AppText>
                  ) : null}
                  {entry.note ? (
                    <AppText variant="caption" color="muted">
                      Note: {entry.note}
                    </AppText>
                  ) : null}
                  {entry.receiptId ? (
                    <AppText variant="caption" color="muted">
                      Receipt: {entry.receiptId}
                    </AppText>
                  ) : null}
                  {canModerate ? (
                    <View style={styles.rowWrap}>
                      <AppButton
                        size="sm"
                        variant="gold"
                        label="Accept & award Tier 1"
                        disabled={!canAward}
                        onPress={() => {
                          const err = moderateSource(
                            entry.id,
                            'accepted',
                            'Source verified and Tier 1 reward recorded.'
                          );
                          setNotice(err ?? `Accepted "${entry.title}" and awarded Tier 1.`);
                        }}
                      />
                      <AppButton
                        size="sm"
                        variant="outline"
                        label="Request changes"
                        onPress={() => {
                          const err = moderateSource(
                            entry.id,
                            'changes-requested',
                            'Clarify eligibility notes or direct call URL.'
                          );
                          setNotice(err ?? `Requested changes for "${entry.title}".`);
                        }}
                      />
                      <AppButton
                        size="sm"
                        variant="danger"
                        label="Decline"
                        onPress={() => {
                          const err = moderateSource(
                            entry.id,
                            'declined',
                            'Could not confirm official funding source.'
                          );
                          setNotice(err ?? `Declined "${entry.title}".`);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
