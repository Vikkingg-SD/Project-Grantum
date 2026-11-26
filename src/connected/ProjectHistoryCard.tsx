import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import type { ConnectedClient, Project, ProjectRevision } from './api';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';

export function ProjectHistoryCard({
  api,
  scope,
  project,
}: {
  api: ConnectedClient;
  scope: readonly string[];
  project: Project;
}) {
  const action = useAction();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: [...scope, 'project-revisions', project.id],
    queryFn: () => api.get<ProjectRevision[]>('/projects/' + project.id + '/revisions'),
  });
  const editable = !project.archived && ['owner', 'editor'].includes(project.role);

  return (
    <Card>
      <AppText variant="h3">Profile revision history</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.map((entry) => (
        <View key={entry.version} style={actionStyles.row}>
          <AppText>
            Revision #{entry.version} · {entry.summary || 'Profile update'} ·{' '}
            {new Date(entry.createdAt).toLocaleDateString()}
          </AppText>
          {entry.version !== project.version && editable && (
            <AppButton
              label={'Restore revision #' + entry.version}
              size="sm"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  const next = await api.post<Project>(
                    '/projects/' + project.id + '/revisions/' + entry.version + '/restore',
                    { version: project.version }
                  );
                  cache.setQueryData<Project[]>([...scope, 'projects'], (records = []) => [
                    ...records.filter((item) => item.id !== next.id),
                    next,
                  ]);
                  await cache.invalidateQueries({
                    queryKey: [...scope, 'project-revisions', project.id],
                  });
                }, 'Profile revision restored.')
              }
            />
          )}
        </View>
      ))}
      <ActionMessage action={action} />
    </Card>
  );
}
