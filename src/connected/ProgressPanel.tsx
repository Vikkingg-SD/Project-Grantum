import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import type {
  Attempt,
  ConnectedClient,
  Revision,
  WorkplanTask,
  WorkplanTaskStatus,
  WorkStatus,
} from './api';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';

type ProgressPanelProps = {
  api: ConnectedClient;
  scope: readonly string[];
  record: Attempt;
  staff: boolean;
  dirty: boolean;
  editable: boolean;
  apply: (next: Attempt) => Promise<void>;
  onNavigateTab: (tab: WorkplanTask['targetTab']) => void;
};

export function ProgressPanel({
  api,
  scope,
  record,
  staff,
  dirty,
  editable,
  apply,
  onNavigateTab,
}: ProgressPanelProps) {
  const [reference, setReference] = useState('');
  const action = useAction();
  const cache = useQueryClient();
  const path = '/attempts/' + record.id;
  const history = useQuery({
    queryKey: [...scope, 'revisions', record.id],
    queryFn: () => api.get<Revision[]>(path + '/revisions'),
  });
  const tasks = useQuery({
    queryKey: [...scope, 'tasks', record.id],
    queryFn: () => api.get<WorkplanTask[]>(path + '/tasks'),
  });
  const reviewer = record.role === 'owner' || record.role === 'reviewer';
  const locked = ['submitted', 'awarded', 'declined'].includes(record.status);

  const move =
    (status: WorkStatus, withReference = false) =>
    () =>
      void action.run(async () => {
        await apply(
          await api.post<Attempt>(path + '/status', {
            status,
            version: record.version,
            ...(withReference ? { reference } : {}),
          })
        );
      }, 'Application status updated.');

  const setTaskStatus = (taskKey: string, status: WorkplanTaskStatus) => () =>
    void action.run(async () => {
      const updated = await api.post<WorkplanTask[]>(path + '/tasks/' + taskKey, { status });
      cache.setQueryData<WorkplanTask[]>([...scope, 'tasks', record.id], updated);
    }, 'Workplan updated.');

  return (
    <Card>
      <AppText variant="h3">Progress Tracking</AppText>
      <AppText>Status · {record.status}</AppText>
      {Boolean(record.receipt) && <AppText>Recorded receipt · {record.receipt}</AppText>}
      {Boolean(record.decisionReference) && (
        <AppText>Recorded decision · {record.decisionReference}</AppText>
      )}
      <View style={actionStyles.row}>
        {record.status === 'drafting' && editable && (
          <AppButton
            label="Mark in review"
            disabled={dirty || action.busy}
            onPress={move('review')}
          />
        )}
        {['drafting', 'review'].includes(record.status) && reviewer && (
          <AppButton
            label="Mark ready"
            disabled={dirty || action.busy || record.completionPct !== 100}
            onPress={move('ready')}
          />
        )}
        {['review', 'ready'].includes(record.status) && reviewer && (
          <AppButton
            label="Reopen draft"
            disabled={dirty || action.busy}
            onPress={move('drafting')}
          />
        )}
      </View>
      {((record.status === 'ready' && record.role === 'owner') ||
        (record.status === 'submitted' && staff && reviewer)) && (
        <>
          <AppInput
            label={
              record.status === 'ready'
                ? 'Official submission receipt'
                : 'Official funder decision reference'
            }
            value={reference}
            onChangeText={setReference}
            maxLength={500}
          />
          <AppText color="muted">Enter the reference you received from the funder.</AppText>
          {record.status === 'ready' ? (
            <AppButton
              label="Record funder submission"
              disabled={!reference.trim() || action.busy}
              onPress={move('submitted', true)}
            />
          ) : (
            <View style={actionStyles.row}>
              <AppButton
                label="Record awarded decision"
                disabled={!reference.trim() || action.busy}
                onPress={move('awarded', true)}
              />
              <AppButton
                label="Record declined decision"
                disabled={!reference.trim() || action.busy}
                onPress={move('declined', true)}
              />
            </View>
          )}
        </>
      )}

      <AppText variant="h3">Stage workplan</AppText>
      <QueryMessage
        pending={tasks.isPending}
        error={tasks.error}
        retry={() => void tasks.refetch()}
      />
      {tasks.data?.map((task) => (
        <View key={task.key} style={actionStyles.block}>
          <AppText>
            {task.title} · {task.autoCompletionPct}% · {task.status.replace('_', ' ')}
          </AppText>
          {Boolean(task.updatedBy) && (
            <AppText color="muted">
              Updated by {task.updatedBy} ({task.updatedByRole})
            </AppText>
          )}
          <View style={actionStyles.row}>
            <AppButton
              label={'Open ' + task.targetTab}
              size="sm"
              onPress={() => onNavigateTab(task.targetTab)}
            />
            {!locked &&
              task.status === 'open' &&
              task.autoCompletionPct === 100 &&
              record.role !== 'viewer' && (
                <AppButton
                  label={
                    task.title.startsWith('Verify ')
                      ? 'Confirm ' + task.title.slice(7)
                      : 'Verify ' + task.title
                  }
                  size="sm"
                  disabled={dirty || action.busy}
                  onPress={setTaskStatus(task.key, 'verified')}
                />
              )}
            {!locked && task.status === 'open' && reviewer && (
              <AppButton
                label={'Mark done: ' + task.title}
                size="sm"
                disabled={dirty || action.busy}
                onPress={setTaskStatus(task.key, 'marked_done')}
              />
            )}
            {!locked && task.status !== 'open' && reviewer && (
              <AppButton
                label={'Reopen: ' + task.title}
                size="sm"
                disabled={dirty || action.busy}
                onPress={setTaskStatus(task.key, 'open')}
              />
            )}
          </View>
        </View>
      ))}

      <AppText variant="h3">Revision history</AppText>
      <QueryMessage
        pending={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {history.data?.map((entry) => (
        <View key={entry.version} style={actionStyles.row}>
          <AppText>
            Revision {entry.version} · {entry.status} ·{' '}
            {new Date(entry.createdAt).toLocaleDateString()}
          </AppText>
          {entry.version !== record.version && editable && (
            <AppButton
              label={'Restore revision ' + entry.version}
              size="sm"
              disabled={dirty || action.busy}
              onPress={() =>
                void action.run(async () => {
                  await apply(
                    await api.post<Attempt>(path + '/revisions/' + entry.version + '/restore', {
                      version: record.version,
                    })
                  );
                })
              }
            />
          )}
        </View>
      ))}
      <ActionMessage action={action} />
    </Card>
  );
}
