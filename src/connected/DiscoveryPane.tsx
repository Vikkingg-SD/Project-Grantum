import { useRef, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import type { GrantDetail } from '@/types/grant';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import type { Attempt, ConnectedClient, Project } from './api';

type BaseProps = {
  api: ConnectedClient;
  scope: readonly string[];
  openAttempt: (id: string, grantId: string) => void;
};

export function DiscoveryPane({
  api,
  scope,
  openAttempt,
  openProjects,
}: BaseProps & { openProjects: () => void }) {
  const [term, setTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const grants = useQuery({
    queryKey: [...scope, 'catalog', submittedTerm],
    queryFn: () => api.grants(submittedTerm),
  });
  const projects = useQuery({
    queryKey: [...scope, 'projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });

  return (
    <View style={actionStyles.block}>
      <AppText variant="h2">Discovery</AppText>
      <View style={actionStyles.block}>
        <AppInput
          label="Search opportunities"
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={() => setSubmittedTerm(term.trim())}
          maxLength={120}
        />
        <AppButton label="Search catalog" onPress={() => setSubmittedTerm(term.trim())} />
      </View>
      <QueryMessage
        pending={grants.isPending}
        error={grants.error}
        retry={() => void grants.refetch()}
      />
      {grants.data?.length === 0 && <AppText>No opportunities match this search.</AppText>}
      {grants.data?.map((grant) => (
        <Card key={grant.id}>
          <AppText variant="h3">{grant.title}</AppText>
          <AppText color="muted">
            {grant.funder} · {grant.region} · {grant.deadline}
          </AppText>
          <AppText>{grant.summary}</AppText>
          <AppButton
            label={
              opportunity === grant.id ? 'Hide opportunity details' : 'View opportunity details'
            }
            expanded={opportunity === grant.id}
            onPress={() => setOpportunity(opportunity === grant.id ? '' : grant.id)}
          />
          {opportunity === grant.id && (
            <OpportunityDetails
              grantId={grant.id}
              api={api}
              scope={scope}
              projects={projects.data?.filter(
                (project) => !project.archived && ['owner', 'editor'].includes(project.role)
              )}
              projectsError={projects.error}
              reloadProjects={() => void projects.refetch()}
              openAttempt={openAttempt}
              openProjects={openProjects}
            />
          )}
        </Card>
      ))}
    </View>
  );
}

function OpportunityDetails({
  grantId,
  api,
  scope,
  projects,
  projectsError,
  reloadProjects,
  openAttempt,
  openProjects,
}: BaseProps & {
  grantId: string;
  projects?: Project[];
  projectsError: Error | null;
  reloadProjects: () => void;
  openProjects: () => void;
}) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState('');
  const pendingKey = useRef<{ bodyKey: string; key: string } | null>(null);
  const action = useAction();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: [...scope, 'opportunity', grantId],
    queryFn: () => api.get<GrantDetail>('/grants/' + encodeURIComponent(grantId)),
  });
  const detail = query.data;
  const projectId = selected || projects?.[0]?.id || '';
  async function create() {
    if (!detail || !projectId) return;
    const name = title.trim() || detail.title.slice(0, 120);
    const bodyKey = JSON.stringify([projectId, grantId, name]);
    if (pendingKey.current?.bodyKey !== bodyKey)
      pendingKey.current = { bodyKey, key: randomUUID() };
    const created = await api.post<Attempt>('/attempts', {
      projectId,
      grantId,
      requestKey: pendingKey.current.key,
      title: name,
    });
    pendingKey.current = null;
    await cache.invalidateQueries({ queryKey: scope });
    openAttempt(created.id, created.grantId);
  }

  return (
    <>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {detail && (
        <>
          <AppText>Required sections · {detail.requirements.join(', ')}</AppText>
          <AppText>Published amount · {detail.amount}</AppText>
          <QueryMessage
            pending={!projects && !projectsError}
            error={projectsError}
            retry={reloadProjects}
          />
          {projects?.length === 0 && <AppButton label="Create a project" onPress={openProjects} />}
          {Boolean(projects?.length) && (
            <>
              <AppText color="muted">Choose the project for this application.</AppText>
              <View style={actionStyles.row}>
                {projects?.map((project) => (
                  <AppButton
                    key={project.id}
                    label={project.name}
                    selected={project.id === projectId}
                    variant="outline"
                    onPress={() => setSelected(project.id)}
                  />
                ))}
              </View>
              <AppInput
                label="Attempt name"
                placeholder={detail.title}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
              <AppButton
                label="Start application attempt"
                variant="primary"
                onPress={() => void action.run(create)}
                isLoading={action.busy}
              />
              <ActionMessage action={action} />
            </>
          )}
        </>
      )}
    </>
  );
}

export function WorksPane({
  api,
  scope,
  openAttempt,
  openDiscovery,
}: BaseProps & { openDiscovery: () => void }) {
  const [term, setTerm] = useState('');
  const query = useQuery({
    queryKey: [...scope, 'attempts'],
    queryFn: () => api.get<Attempt[]>('/attempts'),
  });
  const matches = query.data?.filter((record) =>
    [record.title, record.grantTitle, record.status].some((value) =>
      value.toLowerCase().includes(term.trim().toLowerCase())
    )
  );
  return (
    <View style={actionStyles.block}>
      <AppText variant="h2">My Works</AppText>
      <AppInput label="Search your work" value={term} onChangeText={setTerm} />
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <AppButton
          label="Pull latest attempts"
          onPress={() => void query.refetch()}
          isLoading={query.isFetching}
        />
      )}
      {query.data?.length === 0 && (
        <AppButton label="Find an opportunity" onPress={openDiscovery} />
      )}
      {Boolean(query.data?.length) && !matches?.length && (
        <AppText>No attempts match this search.</AppText>
      )}
      {matches?.map((record) => (
        <Card key={record.id}>
          <AppText variant="h3">{record.title}</AppText>
          <AppText color="muted">
            {record.grantTitle} · {record.status} · {record.completionPct}% complete
          </AppText>
          <AppButton
            label={'Open ' + record.title}
            onPress={() => openAttempt(record.id, record.grantId)}
          />
        </Card>
      ))}
    </View>
  );
}
