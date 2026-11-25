import { useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { View } from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import {
  uuidPattern,
  type ConnectedClient,
  type DocumentInfo,
  type Member,
  type Project,
  type ProjectInput,
} from './api';

type Props = { api: ConnectedClient; scope: readonly string[] };
const emptyProject = { name: '', description: '', region: '', legalEntity: '' };

export function ProjectPane({ api, scope }: Props) {
  const [selection, setSelection] = useState('');
  const creation = useRef<{ content: string; key: string } | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: [...scope, 'projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });
  const items = query.data;
  const project = items?.find((item) => item.id === selection);
  async function save(input: ProjectInput, existing?: Project, archived = false) {
    if (!existing) {
      const content = JSON.stringify(input);
      if (creation.current?.content !== content) creation.current = { content, key: randomUUID() };
    }
    const current = existing
      ? await api.patch<Project>('/projects/' + existing.id, {
          ...input,
          version: existing.version,
          archived,
        })
      : await api.post<Project>('/projects', { ...input, requestKey: creation.current?.key });
    if (!existing) creation.current = null;
    cache.setQueryData<Project[]>([...scope, 'projects'], (records = []) => [
      ...records.filter((item) => item.id !== current.id),
      current,
    ]);
    setSelection(current.id);
  }
  return (
    <View style={actionStyles.block}>
      <AppText variant="h2">Project Profile</AppText>
      <View style={actionStyles.row}>
        <AppButton
          label="New project"
          variant="outline"
          selected={!selection}
          onPress={() => setSelection('')}
        />
        {items?.map((item) => (
          <AppButton
            key={item.id}
            label={item.name + (item.archived ? ' · archived' : '')}
            selected={item.id === selection}
            variant="outline"
            onPress={() => setSelection(item.id)}
          />
        ))}
      </View>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <ProjectForm key={project?.id ?? 'new'} project={project} save={save} />
      {project && <ProjectTeam key={project.id} api={api} scope={scope} project={project} />}
      {project && (
        <ProjectDocuments
          key={project.id + ':documents'}
          api={api}
          scope={scope}
          project={project}
        />
      )}
    </View>
  );
}

function ProjectForm({
  project,
  save,
}: {
  project?: Project;
  save: (input: ProjectInput, existing?: Project, archived?: boolean) => Promise<void>;
}) {
  const initial = project
    ? {
        name: project.name,
        description: project.description,
        region: project.region,
        legalEntity: project.legalEntity,
      }
    : emptyProject;
  const [edit, setEdit] = useState<{ fields: ProjectInput; version?: number } | null>(null);
  const draft = edit?.fields ?? initial;
  const conflict = Boolean(edit && project && edit.version !== project.version);
  const [checked, setChecked] = useState(false);
  const action = useAction();
  const editable = !project || (!project.archived && ['owner', 'editor'].includes(project.role));
  const fields = [
    ['name', 'Project name', 120],
    ['description', 'Project description', 8000],
    ['region', 'Region', 120],
    ['legalEntity', 'Legal entity', 120],
  ] as const;
  const missing = fields.filter(([key]) => !draft[key].trim()).map(([, label]) => label);
  return (
    <Card>
      <AppText variant="h3">{project ? project.name : 'New project'}</AppText>
      {project && (
        <AppText color="muted">
          Role · {project.role} · Version {project.version}
        </AppText>
      )}
      {fields.map(([key, label, max]) => (
        <AppInput
          key={key}
          label={label}
          value={draft[key]}
          maxLength={max}
          editable={editable}
          multiline={key === 'description'}
          style={key === 'description' && actionStyles.multiline}
          onChangeText={(text) => {
            setEdit({
              fields: { ...draft, [key]: text },
              version: edit ? edit.version : project?.version,
            });
            setChecked(false);
          }}
        />
      ))}
      <View style={actionStyles.row}>
        {editable && (
          <AppButton
            label={project ? 'Save profile' : 'Create project'}
            variant="primary"
            disabled={!draft.name.trim() || conflict || (Boolean(project) && !edit)}
            isLoading={action.busy}
            onPress={() =>
              void action.run(async () => {
                await save(draft, project);
                setEdit(null);
              }, 'Project saved.')
            }
          />
        )}
        <AppButton label="Check profile fields" onPress={() => setChecked(true)} />
        {project?.role === 'owner' && (
          <AppButton
            label={project.archived ? 'Restore project' : 'Archive project'}
            disabled={action.busy}
            onPress={() => void action.run(() => save(initial, project, !project.archived))}
          />
        )}
      </View>
      {conflict && (
        <AppText accessibilityRole="alert" color="failureText">
          A newer profile is saved. Your edits are still here.
        </AppText>
      )}
      {edit && (
        <AppButton
          label="Discard profile edits"
          onPress={() => setEdit(null)}
          disabled={action.busy}
        />
      )}
      {checked && (
        <AppText accessibilityLiveRegion="polite">
          {missing.length ? 'Missing · ' + missing.join(', ') : 'All profile fields are filled.'}
        </AppText>
      )}
      <ActionMessage action={action} />
    </Card>
  );
}

function ProjectTeam({ api, scope, project }: Props & { project: Project }) {
  const [accountId, setAccountId] = useState('');
  const [role, setRole] = useState<'editor' | 'reviewer' | 'viewer'>('viewer');
  const action = useAction();
  const query = useQuery({
    queryKey: [...scope, 'members', project.id],
    queryFn: () => api.get<Member[]>('/projects/' + project.id + '/members'),
  });
  const changeable = project.role === 'owner' && !project.archived;
  const path = '/projects/' + project.id + '/members';
  return (
    <Card>
      <AppText variant="h3">Team</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.map((member) => (
        <View key={member.id} style={actionStyles.row}>
          <AppText>
            {member.displayName} · {member.role}
          </AppText>
          {changeable && member.role !== 'owner' && (
            <AppButton
              label={'Remove ' + member.displayName}
              size="sm"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await api.remove(path + '/' + member.id);
                  await query.refetch();
                }, 'Project access removed.')
              }
            />
          )}
        </View>
      ))}
      {changeable && (
        <>
          <AppInput
            label="Member’s Grantum account ID"
            value={accountId}
            onChangeText={setAccountId}
            autoCapitalize="none"
            maxLength={36}
          />
          <View style={actionStyles.row}>
            {(['viewer', 'editor', 'reviewer'] as const).map((item) => (
              <AppButton
                key={item}
                label={item}
                selected={item === role}
                variant="outline"
                onPress={() => setRole(item)}
              />
            ))}
          </View>
          <AppButton
            label="Save member access"
            disabled={!uuidPattern.test(accountId.trim()) || action.busy}
            onPress={() =>
              void action.run(async () => {
                await api.post(path, { accountId: accountId.trim(), role });
                setAccountId('');
                await query.refetch();
              }, 'Project access updated.')
            }
          />
        </>
      )}
      <ActionMessage action={action} />
    </Card>
  );
}

function ProjectDocuments({ api, scope, project }: Props & { project: Project }) {
  const [preview, setPreview] = useState<{ id: string; text: string }>();
  const action = useAction();
  const path = '/projects/' + project.id + '/documents';
  const query = useQuery({
    queryKey: [...scope, 'documents', project.id],
    queryFn: () => api.get<DocumentInfo[]>(path),
  });
  const writable = !project.archived && ['owner', 'editor'].includes(project.role);
  async function upload() {
    const picked = await getDocumentAsync({
      type: ['text/plain', 'text/markdown'],
      copyToCacheDirectory: false,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (
      !asset ||
      typeof asset.size !== 'number' ||
      asset.size > 100000 ||
      !/\.(txt|md)$/i.test(asset.name)
    ) {
      throw new Error('Choose a .txt or .md file below 100 KB.');
    }
    const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
    await api.post(path, {
      name: asset.name.replace(/\.(TXT|MD)$/i, (extension) => extension.toLowerCase()),
      text,
    });
    await query.refetch();
  }
  return (
    <Card>
      <AppText variant="h3">Project documents</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && <AppText>No project documents yet.</AppText>}
      {query.data?.map((doc) => (
        <View key={doc.id} style={actionStyles.block}>
          <View style={actionStyles.row}>
            <AppButton
              label={(preview?.id === doc.id ? 'Close ' : 'Open ') + doc.name}
              onPress={() =>
                void action.run(async () => {
                  if (preview?.id === doc.id) setPreview(undefined);
                  else setPreview(await api.get<{ id: string; text: string }>(path + '/' + doc.id));
                })
              }
              disabled={action.busy}
            />
            {writable && (
              <AppButton
                label={'Remove ' + doc.name}
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await api.remove(path + '/' + doc.id);
                    setPreview(undefined);
                    await query.refetch();
                  }, 'Document removed.')
                }
              />
            )}
          </View>
          {preview?.id === doc.id && <AppText selectable>{preview.text}</AppText>}
        </View>
      ))}
      {writable && (
        <AppButton
          label="Attach text document"
          onPress={() => void action.run(upload)}
          isLoading={action.busy}
        />
      )}
      {writable && <AppText color="muted">Accepts .txt and .md files up to 100 KB.</AppText>}
      <ActionMessage action={action} />
    </Card>
  );
}
