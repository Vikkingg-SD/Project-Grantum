import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { ENV } from '@/config/env';
import { styles } from './workspacePageStyles';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
export default function AdminScreen() {
  const theme = useTheme();
  const adminQueue = useWorkspaceStore((state) => state.adminQueue);
  const adminAuditLog = useWorkspaceStore((state) => state.adminAuditLog);
  const resolveAdminQueueItem = useWorkspaceStore((state) => state.resolveAdminQueueItem);
  const [notice, setNotice] = useState('');
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
          Sample workspace · changes are saved on this device. Live jobs and catalog publishing are
          unavailable.
        </AppText>
        {notice ? (
          <AppText accessibilityLiveRegion="polite" color="verified">
            {notice}
          </AppText>
        ) : null}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="h3">Needs attention</AppText>
          <AppText variant="caption" color="muted">
            Review sample jobs and catalog requests. Actions update this local queue and activity
            log.
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
                      setNotice('Sample job marked for retry.');
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
                        setNotice('Sample request approved.');
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
      </View>
    </ScreenContainer>
  );
}
