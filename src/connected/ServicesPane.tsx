import { useRef, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import type { Bounty, BountyStatus, ConnectedClient, Notice, Session } from './api';

type Props = { api: ConnectedClient; scope: readonly string[] };

export function BountyPane({ api, scope, staff = false }: Props & { staff?: boolean }) {
  const [revising, setRevising] = useState<string>();
  const action = useAction();
  const path = staff ? '/staff/bounties' : '/bounties';
  const query = useQuery({
    queryKey: [...scope, path],
    queryFn: () => api.get<Bounty[]>(path),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
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
          {Boolean(record.region || record.prizePool) && (
            <AppText color="muted">
              {[record.region, record.prizePool].filter(Boolean).join(' · ')}
            </AppText>
          )}
          {Boolean(record.mission) && <AppText>{record.mission}</AppText>}
          <AppText>{record.note}</AppText>
          <AppText color="muted">Status · {record.status.replaceAll('_', ' ')}</AppText>
          {Boolean(record.reviewNote) && <AppText>{record.reviewNote}</AppText>}
          {staff ? (
            <ReviewSource
              key={record.version}
              api={api}
              source={record}
              refresh={() => query.refetch()}
            />
          ) : revising === record.id ? (
            <SourceForm
              api={api}
              source={record}
              cancel={() => setRevising(undefined)}
              refresh={() => query.refetch()}
              onSubmitted={() => setRevising(undefined)}
            />
          ) : record.status === 'draft' ? (
            <View style={actionStyles.row}>
              <AppButton label={'Edit ' + record.title} onPress={() => setRevising(record.id)} />
              <AppButton
                label={'Submit ' + record.title}
                variant="primary"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await api.patch('/bounties/' + record.id, {
                      title: record.title,
                      url: record.url,
                      note: record.note,
                      region: record.region,
                      prizePool: record.prizePool,
                      mission: record.mission,
                      version: record.version,
                      submit: true,
                    });
                    await query.refetch();
                  }, 'Draft submitted for staff review.')
                }
              />
              <AppButton
                label={'Delete ' + record.title}
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await api.remove('/bounties/' + record.id);
                    await query.refetch();
                  }, 'Draft removed.')
                }
              />
            </View>
          ) : (
            record.status === 'changes_requested' && (
              <AppButton label={'Revise ' + record.title} onPress={() => setRevising(record.id)} />
            )
          )}
        </Card>
      ))}
      <ActionMessage action={action} />
    </View>
  );
}

function SourceForm({
  api,
  source,
  cancel,
  refresh,
  onSubmitted,
}: {
  api: ConnectedClient;
  source?: Bounty;
  cancel?: () => void;
  refresh: () => Promise<unknown>;
  onSubmitted?: () => void;
}) {
  const [title, setTitle] = useState(source?.title ?? '');
  const [url, setUrl] = useState(source?.url ?? '');
  const [region, setRegion] = useState(source?.region ?? '');
  const [prizePool, setPrizePool] = useState(source?.prizePool ?? '');
  const [mission, setMission] = useState(source?.mission ?? '');
  const [note, setNote] = useState(source?.note ?? '');
  const pending = useRef<{ content: string; key: string } | null>(null);
  const [startingVersion] = useState(source?.version);
  const [startingStatus] = useState(source?.status);
  const action = useAction();
  const fields = {
    title: title.trim(),
    url: url.trim(),
    region: region.trim(),
    prizePool: prizePool.trim(),
    mission: mission.trim(),
    note: note.trim(),
  };
  const changed =
    source && (source.version !== startingVersion || source.status !== startingStatus);

  async function saveOrSubmit(submitNow: boolean) {
    if (source) {
      try {
        await api.patch('/bounties/' + source.id, {
          ...fields,
          version: startingVersion,
          submit: submitNow,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) await refresh();
        throw error;
      }
    } else {
      const mode = submitNow ? 'submit' : 'draft';
      const content = JSON.stringify({ ...fields, mode });
      if (pending.current?.content !== content) pending.current = { content, key: randomUUID() };
      await api.post('/bounties', { ...fields, mode, requestKey: pending.current.key });
      pending.current = null;
      setTitle('');
      setUrl('');
      setRegion('');
      setPrizePool('');
      setMission('');
      setNote('');
    }
    await refresh();
    onSubmitted?.();
  }

  const invalid =
    Boolean(changed) || !fields.title || !fields.url.startsWith('https://') || !fields.note;

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
      <AppInput label="Location / region" value={region} onChangeText={setRegion} maxLength={160} />
      <AppInput label="Prize pool" value={prizePool} onChangeText={setPrizePool} maxLength={160} />
      <AppButton label="Not published" size="sm" onPress={() => setPrizePool('Not published')} />
      <AppInput label="Mission" value={mission} onChangeText={setMission} maxLength={500} />
      <AppInput
        label={source ? 'Revised explanation' : 'Why this source belongs in Grantum'}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
      />
      {Boolean(changed) && (
        <AppText accessibilityRole="alert" color="failureText">
          This submission changed while you were editing. Copy any changes you want to keep before
          closing this revision.
        </AppText>
      )}
      <View style={actionStyles.row}>
        <AppButton
          label={
            source ? (source.status === 'draft' ? 'Save draft' : 'Save changes') : 'Save draft'
          }
          disabled={invalid || action.busy}
          isLoading={action.busy}
          onPress={() => void action.run(() => saveOrSubmit(false), 'Source draft saved.')}
        />
        <AppButton
          label={
            source
              ? source.status === 'draft'
                ? 'Submit draft'
                : 'Resubmit for review'
              : 'Submit for review'
          }
          variant="primary"
          isLoading={action.busy}
          disabled={invalid || action.busy}
          onPress={() =>
            void action.run(() => saveOrSubmit(true), 'Source submitted for staff review.')
          }
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
                try {
                  await api.post('/staff/bounties/' + source.id + '/review', {
                    status,
                    note,
                    version: source.version,
                  });
                } catch (error) {
                  if (error instanceof ApiError && error.status === 409) await refresh();
                  throw error;
                }
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
