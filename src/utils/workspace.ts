import type {
  ApplicationBundle,
  ProfileRevision,
  ProjectKind,
  ProjectProfile,
} from '../types/workspace';

export interface Workspace {
  projects: ProjectProfile[];
  revisions: ProfileRevision[];
  applications: ApplicationBundle[];
}

export const emptyWorkspace = (): Workspace => ({ projects: [], revisions: [], applications: [] });

function required(value: string, label: string) {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function saveProject(
  workspace: Workspace,
  input: {
    projectId: string;
    revisionId: string;
    name: string;
    kind: ProjectKind;
    authorId: string;
    createdAt: string;
    summary: string;
    fields: Record<string, string>;
  }
): Workspace {
  const id = required(input.projectId, 'Project ID');
  const revisionId = required(input.revisionId, 'Revision ID');
  const name = required(input.name, 'Project name');
  const existing = workspace.projects.find((project) => project.id === id);
  if (existing?.archivedAt) throw new Error('Restore the project before editing');
  if (workspace.revisions.some((revision) => revision.id === revisionId))
    throw new Error('Revision already exists');
  const revision: ProfileRevision = {
    id: revisionId,
    projectId: id,
    parentRevisionId: existing?.currentRevisionId ?? null,
    authorId: required(input.authorId, 'Author'),
    createdAt: required(input.createdAt, 'Creation time'),
    summary: required(input.summary, 'Change summary'),
    fields: { ...input.fields },
  };
  const project: ProjectProfile = {
    id,
    name,
    kind: input.kind,
    currentRevisionId: revisionId,
    archivedAt: null,
  };
  return {
    ...workspace,
    projects: existing
      ? workspace.projects.map((item) => (item.id === id ? project : item))
      : [...workspace.projects, project],
    revisions: [...workspace.revisions, revision],
  };
}

export function archiveProject(
  workspace: Workspace,
  projectId: string,
  archivedAt: string | null
): Workspace {
  if (!workspace.projects.some((project) => project.id === projectId))
    throw new Error('Project not found');
  if (archivedAt !== null) required(archivedAt, 'Archive time');
  return {
    ...workspace,
    projects: workspace.projects.map((project) =>
      project.id === projectId ? { ...project, archivedAt } : project
    ),
  };
}

export function addApplication(workspace: Workspace, application: ApplicationBundle): Workspace {
  required(application.id, 'Application ID');
  required(application.grantId, 'Grant ID');
  if (workspace.applications.some((item) => item.id === application.id))
    throw new Error('Application already exists');
  const project = workspace.projects.find((item) => item.id === application.projectId);
  if (!project || project.archivedAt) throw new Error('Choose an active project');
  if (
    !workspace.revisions.some(
      (revision) =>
        revision.id === application.profileRevisionId && revision.projectId === project.id
    )
  )
    throw new Error('Profile revision does not belong to this project');
  if (application.status !== 'drafting' || application.submittedSnapshot !== null)
    throw new Error('New applications must start as drafts');
  return {
    ...workspace,
    applications: [
      ...workspace.applications,
      {
        ...application,
        template: { ...application.template },
        artifacts: application.artifacts.map((artifact) => ({ ...artifact })),
      },
    ],
  };
}

export function searchProjects(workspace: Workspace, query: string, archived = false) {
  const term = query.trim().toLocaleLowerCase();
  return workspace.projects.filter(
    (project) =>
      Boolean(project.archivedAt) === archived &&
      `${project.name} ${project.kind}`.toLocaleLowerCase().includes(term)
  );
}
