import { useRef, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import type { Bounty, BountyStatus, ConnectedClient, Notice, Session } from './api';

type Props = { api: ConnectedClient; scope: readonly string[] };

export function BountyPane({ api, scope, staff = false }: Props & { staff?: boolean }) {
  const [revising, setRevising] = useState<string>();
  const path = staff ? '/staff/bounties' : '/bounties';
  const query = useQuery({ queryKey: [...scope, path], queryFn: () => api.get<Bounty[]>(path) });
  return (
    <View style={actionStyles.block}>
      <AppText variant="h2">{staff ? 'Source moderation' : 'Bounty Hunt'}</AppText>
      {!staff && (
        <Card>
          <AppText variant="h3">Suggest a funding source</AppText>
          <SourceForm api={api} refresh={() => query.refetch()} />
        </Card>
      )}
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && (
        <AppText>
          {staff ? 'There are no pending sources.' : 'There are no source submissions yet.'}
        </AppText>
      )}
      {query.data?.map((record) => (
        <Card key={record.id}>
          <AppText variant="h3">{record.title}</AppText>
          <AppText selectable>{record.url}</AppText>
          <AppText>{record.note}</AppText>
          <AppText color="muted">Status · {record.status.replaceAll('_', ' ')}</AppText>
          {record.reviewNote && <AppText>{record.reviewNote}</AppText>}
          {staff ? (
            <ReviewSource
              key={record.version}
              api={api}
              source={record}
              refresh={() => query.refetch()}
            />
          ) : (
            record.status === 'changes_requested' &&
            (revising === record.id ? (
              <SourceForm
                api={api}
                source={record}
                cancel={() => setRevising(undefined)}
                refresh={async () => {
                  await query.refetch();
                  setRevising(undefined);
                }}
              />
            ) : (
              <AppButton label={'Revise ' + record.title} onPress={() => setRevising(record.id)} />
            ))
          )}
        </Card>
      ))}
    </View>
  );
}

function SourceForm({
  api,
  source,
  cancel,
  refresh,
}: {
  api: ConnectedClient;
  source?: Bounty;
  cancel?: () => void;
  refresh: () => Promise<unknown>;
}) {
  const [title, setTitle] = useState(source?.title ?? '');
  const [url, setUrl] = useState(source?.url ?? '');
  const [note, setNote] = useState(source?.note ?? '');
  const pending = useRef<{ content: string; key: string } | null>(null);
  const startingVersion = useRef(source?.version);
  const action = useAction();
  const fields = { title: title.trim(), url: url.trim(), note: note.trim() };

  async function submit() {
    if (source) {
      await api.patch('/bounties/' + source.id, { ...fields, version: startingVersion.current });
    } else {
      const content = JSON.stringify(fields);
      if (pending.current?.content !== content) pending.current = { content, key: randomUUID() };
      await api.post('/bounties', { ...fields, requestKey: pending.current.key });
      pending.current = null;
      setTitle('');
      setUrl('');
      setNote('');
    }
    await refresh();
  }

  return (
    <>
      <AppInput
        label={source ? 'Revised source title' : 'Source title'}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <AppInput
        label={source ? 'Revised source HTTPS link' : 'Source HTTPS link'}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        maxLength={2048}
      />
      <AppInput
        label={source ? 'Revised explanation' : 'Why this source belongs in Grantum'}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
      />
      <View style={actionStyles.row}>
        <AppButton
          label={source ? 'Resubmit for review' : 'Submit for review'}
          variant="primary"
          isLoading={action.busy}
          disabled={!fields.title || !fields.url.startsWith('https://') || !fields.note}
          onPress={() => void action.run(submit, 'Source submitted for staff review.')}
        />
        {cancel && <AppButton label="Cancel revision" onPress={cancel} disabled={action.busy} />}
      </View>
      <ActionMessage action={action} />
    </>
  );
}

function ReviewSource({
  api,
  source,
  refresh,
}: {
  api: ConnectedClient;
  source: Bounty;
  refresh: () => Promise<unknown>;
}) {
  const [note, setNote] = useState('');
  const action = useAction();
  const actions: { label: string; status: Exclude<BountyStatus, 'pending'> }[] = [
    { label: 'Approve source', status: 'approved' },
    { label: 'Request changes', status: 'changes_requested' },
    { label: 'Decline source', status: 'rejected' },
  ];
  return (
    <>
      <AppInput label="Moderation note" value={note} onChangeText={setNote} maxLength={500} />
      <View style={actionStyles.row}>
        {actions.map(({ status, label }) => (
          <AppButton
            key={status}
            label={label}
            disabled={!note.trim() || action.busy}
            onPress={() =>
              void action.run(async () => {
                await api.post('/staff/bounties/' + source.id + '/review', {
                  status,
                  note,
                  version: source.version,
                });
                await refresh();
              })
            }
          />
        ))}
      </View>
      <ActionMessage action={action} />
    </>
  );
}

export function InboxPane({ api, scope }: Props) {
  const action = useAction();
  const query = useQuery({
    queryKey: [...scope, 'inbox'],
    queryFn: () => api.get<Notice[]>('/notifications'),
  });
  return (
    <View style={actionStyles.block}>
      <AppText variant="h2">Inbox</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && <AppText>No notifications yet.</AppText>}
      {query.data?.map((item) => (
        <Card key={item.id}>
          <AppText>{item.message}</AppText>
          <AppText color="muted">
            {new Date(item.createdAt).toLocaleDateString()}
            {item.read ? ' · Read' : ' · Unread'}
          </AppText>
          {!item.read && (
            <AppButton
              label="Mark as read"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await api.post('/notifications/' + item.id + '/read');
                  await query.refetch();
                })
              }
            />
          )}
        </Card>
      ))}
      <ActionMessage action={action} />
    </View>
  );
}

export function SettingsPane({
  api,
  member,
  refresh,
}: {
  api: ConnectedClient;
  member: Session;
  refresh: () => Promise<unknown>;
}) {
  const action = useAction();
  const [name, setName] = useState(member.displayName);
  return (
    <Card>
      <AppText variant="h2">Settings</AppText>
      <AppText color="muted">Grantum account ID</AppText>
      <AppText selectable>{member.id}</AppText>
      <AppInput label="Display name" value={name} onChangeText={setName} maxLength={120} />
      <AppButton
        label="Save display name"
        variant="primary"
        isLoading={action.busy}
        disabled={!name.trim() || name.trim() === member.displayName}
        onPress={() =>
          void action.run(async () => {
            await api.patch('/auth/me', { displayName: name.trim() });
            await refresh();
          }, 'Account settings saved.')
        }
      />
      {(member.analyticsAvailable || member.analyticsOptIn) && (
        <AppButton
          label={member.analyticsOptIn ? 'Stop sharing usage analytics' : 'Share usage analytics'}
          disabled={action.busy}
          onPress={() =>
            void action.run(async () => {
              await api.patch('/auth/me', {
                displayName: member.displayName,
                analyticsOptIn: !member.analyticsOptIn,
              });
              await refresh();
            })
          }
        />
      )}
      <ActionMessage action={action} />
    </Card>
  );
}
