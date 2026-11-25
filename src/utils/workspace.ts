import type { Grant } from '../types/grant';
import type {
  ApplicationBundle,
  CoWorkAction,
  CoWorkRole,
  OutputKind,
  ProfileRevision,
  ProjectKind,
  ProjectProfile,
  ProfileComparisonReport,
} from '../types/workspace';
import { normalizeProfileFieldValue } from './profileAudit';

export {
  KNOWN_ENTITY_TYPES,
  KNOWN_PROJECT_REGIONS,
  MAX_PROJECT_DOCS,
  PROFILE_FIELD_DEFINITIONS,
  addVaultDoc,
  auditProjectProfile,
  computeProfileContentSignature,
  computeProfileFieldFingerprints,
  computeProfileReadiness,
  evaluateProfileField,
  formatProfileRegions,
  isProfileAuditMap,
  normalizeProfileFieldValue,
  parseProfileRegions,
  parseVaultDocs,
  removeVaultDoc,
  sanitizeVaultDocName,
  toggleVaultDoc,
} from './profileAudit';
export type { ProfileFieldDefinition, ProfileFieldEvaluation } from './profileAudit';

export interface Workspace {
  projects: ProjectProfile[];
  revisions: ProfileRevision[];
  applications: ApplicationBundle[];
}

export const emptyWorkspace = (): Workspace => ({ projects: [], revisions: [], applications: [] });

export const workSlotKey = (projectId: string, grantId: string) =>
  `slot:${projectId.trim()}:${grantId.trim()}`;

/** The first attempt keeps the persisted draft keys used before explicit attempts existed. */
export function applicationWorkKey(workspace: Workspace, application: ApplicationBundle): string {
  const legacyKey = workSlotKey(application.projectId, application.grantId);
  const first = workspace.applications.find(
    (item) => item.projectId === application.projectId && item.grantId === application.grantId
  );
  return first?.id === application.id ? legacyKey : 'attempt:' + application.id;
}

export function applicationOrdinal(workspace: Workspace, application: ApplicationBundle): number {
  return (
    workspace.applications
      .filter(
        (item) => item.projectId === application.projectId && item.grantId === application.grantId
      )
      .findIndex((item) => item.id === application.id) + 1
  );
}

export function resolveWorkAttempt(
  workspace: Workspace,
  fallbackProjectId: string,
  grantId: string,
  attemptId: string | string[] | undefined
) {
  const explicit = attemptId !== undefined;
  const application = explicit
    ? typeof attemptId === 'string'
      ? workspace.applications.find(
          (item) => item.id === attemptId && (!grantId || item.grantId === grantId)
        )
      : undefined
    : workspace.applications.find(
        (item) => item.projectId === fallbackProjectId && item.grantId === grantId
      );
  const projectId = application?.projectId ?? fallbackProjectId;
  const selectedGrantId = application?.grantId ?? grantId;
  return {
    application,
    projectId,
    grantId: selectedGrantId,
    slotKey: application
      ? applicationWorkKey(workspace, application)
      : workSlotKey(projectId, selectedGrantId),
    unavailable: explicit && !application,
  };
}

function required(value: string, label: string) {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function hasProfileChanges(
  project: ProjectProfile | undefined,
  revision: ProfileRevision | undefined,
  draft: { name: string; kind: ProjectKind; fields: Record<string, string> }
): boolean {
  if (
    !project ||
    !revision ||
    project.name.trim() !== draft.name.trim() ||
    project.kind !== draft.kind
  ) {
    return true;
  }
  const keys = Object.keys({ ...revision.fields, ...draft.fields });
  return keys.some(
    (key) =>
      normalizeProfileFieldValue(key, revision.fields[key]) !==
      normalizeProfileFieldValue(key, draft.fields[key])
  );
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
  const currentRevision = workspace.revisions.find(
    (revision) => revision.id === existing?.currentRevisionId && revision.projectId === id
  );
  if (!hasProfileChanges(existing, currentRevision, input)) return workspace;
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

const artifactTitles: Record<OutputKind, string> = {
  application: 'Application Narrative',
  'pitch-deck': 'Pitch Deck Outline',
  document: 'Supporting Document Annex',
};

export function createDraftApplication(input: {
  id: string;
  grantId: string;
  project: ProjectProfile;
  outputs: OutputKind[];
  updatedAt: string;
}): ApplicationBundle {
  const { id, grantId, project, outputs, updatedAt } = input;
  return {
    id,
    projectId: project.id,
    grantId,
    fundingRoundId: 'round-2026-active',
    profileRevisionId: project.currentRevisionId,
    template: { id: `tpl-${project.kind}`, version: '1.0' },
    status: 'drafting',
    artifacts: outputs.map((kind, index) => ({
      id: `${id}-art-${index + 1}`,
      kind,
      title: artifactTitles[kind],
      revisionId: 'v1',
    })),
    updatedAt,
    submittedSnapshot: null,
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

export function getProfileSyncLag(workspace: Workspace, applicationId: string): number {
  const app = workspace.applications.find((item) => item.id === applicationId);
  if (!app) return 0;
  const project = workspace.projects.find((item) => item.id === app.projectId);
  if (!project || project.currentRevisionId === app.profileRevisionId) return 0;
  const projectRevisions = workspace.revisions.filter((rev) => rev.projectId === project.id);
  const pinnedIndex = projectRevisions.findIndex((rev) => rev.id === app.profileRevisionId);
  const latestIndex = projectRevisions.findIndex((rev) => rev.id === project.currentRevisionId);
  if (pinnedIndex === -1 || latestIndex === -1) return 1;
  return Math.max(1, latestIndex - pinnedIndex);
}

export function pullProfileRevision(
  workspace: Workspace,
  applicationId: string,
  updatedAt: string
): Workspace {
  const timestamp = required(updatedAt, 'Update time');
  const app = workspace.applications.find((item) => item.id === applicationId);
  if (!app) throw new Error('Application not found');
  if (app.status === 'submitted' || app.submittedSnapshot !== null)
    throw new Error('Submitted applications are locked to their snapshot');
  if (app.status === 'archived')
    throw new Error('Archived applications cannot change profile revisions');
  const project = workspace.projects.find((item) => item.id === app.projectId);
  if (!project || project.archivedAt) throw new Error('Choose an active project');
  return {
    ...workspace,
    applications: workspace.applications.map((item) =>
      item.id === applicationId
        ? {
            ...item,
            profileRevisionId: project.currentRevisionId,
            updatedAt: timestamp,
          }
        : item
    ),
  };
}

export function selectProfileRevision(
  workspace: Workspace,
  applicationId: string,
  revisionId: string,
  updatedAt: string
): Workspace {
  const timestamp = required(updatedAt, 'Update time');
  const targetRevisionId = required(revisionId, 'Revision ID');
  const app = workspace.applications.find((item) => item.id === applicationId);
  if (!app) throw new Error('Application not found');
  if (app.status === 'submitted' || app.submittedSnapshot !== null)
    throw new Error('Submitted applications are locked to their snapshot');
  if (app.status === 'archived')
    throw new Error('Archived applications cannot change profile revisions');
  const project = workspace.projects.find((item) => item.id === app.projectId);
  if (!project || project.archivedAt) throw new Error('Choose an active project');
  if (
    !workspace.revisions.some(
      (revision) => revision.id === targetRevisionId && revision.projectId === project.id
    )
  ) {
    throw new Error('Profile revision does not belong to this project');
  }
  if (app.profileRevisionId === targetRevisionId) return workspace;
  return {
    ...workspace,
    applications: workspace.applications.map((item) =>
      item.id === applicationId
        ? {
            ...item,
            profileRevisionId: targetRevisionId,
            updatedAt: timestamp,
          }
        : item
    ),
  };
}

export function buildProfileComparison(
  grant: Grant,
  project: ProjectProfile,
  revision: ProfileRevision,
  requirements: string[] = []
): ProfileComparisonReport {
  const fields = revision.fields;
  const profileFacts: { clause: string; profileFact: string }[] = [];
  const missingAreas: { gap: string; targetAction: string }[] = [];

  if ((fields.mission ?? '').trim()) {
    profileFacts.push({
      clause: `${grant.funder} thematic scope (${grant.title})`,
      profileFact: `Mission (${revision.id}): ${fields.mission.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: 'Core Mission & Value Thesis is missing in Project Profile',
      targetAction: 'Add Mission statement in Project Profile Dossier for thematic review.',
    });
  }

  if ((fields.solution ?? '').trim()) {
    profileFacts.push({
      clause: 'Technical & delivery execution capability',
      profileFact: `Approach (${revision.id}): ${fields.solution.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: 'Technical / Program Approach is missing',
      targetAction: 'Document technical methodology and delivery milestones in Project Profile.',
    });
  }

  if ((fields.budget ?? '').trim()) {
    profileFacts.push({
      clause: `Funding envelope alignment (${grant.amount})`,
      profileFact: `Budget plan (${revision.id}): ${fields.budget.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: `No budget breakdown to compare against ${grant.amount} ceiling`,
      targetAction: 'Enter Budget Envelope & Co-Funding details in Project Profile.',
    });
  }

  for (const req of requirements.slice(0, 3)) {
    const hasMatch =
      (fields.problem ?? '').toLowerCase().includes(req.toLowerCase().slice(0, 6)) ||
      (fields.solution ?? '').toLowerCase().includes(req.toLowerCase().slice(0, 6));
    if (hasMatch) {
      profileFacts.push({
        clause: `Grant requirement: ${req}`,
        profileFact: `Text overlap in ${project.name} revision ${revision.id}; review required`,
      });
    } else {
      missingAreas.push({
        gap: `Track requirement needs explicit evidence: "${req}"`,
        targetAction: `Sync "${req}" into Drafting Studio and attach an https:// source link.`,
      });
    }
  }

  const profileRegion = (fields.region ?? '').trim();

  const eligibilityGates = [
    {
      rule: `Geographic Jurisdiction (${grant.region})`,
      status: profileRegion ? ('review' as const) : ('unknown' as const),
      detail: profileRegion
        ? `Project registered in "${profileRegion}" vs. grant region "${grant.region}".`
        : 'Set Eligible Jurisdiction in Project Profile for regional review.',
    },
    {
      rule: `Award Ceiling (${grant.amount})`,
      status: (fields.budget ?? '').trim() ? ('review' as const) : ('unknown' as const),
      detail: (fields.budget ?? '').trim()
        ? `Profile budget ("${fields.budget.trim()}") recorded for ${grant.amount} window.`
        : 'Add Budget Envelope in Project Profile for cost-share and cap review.',
    },
    {
      rule: `Submission Window (${grant.deadline})`,
      status: 'review' as const,
      detail: `Active solicitation window (${grant.deadline}) listed in the catalog; current deadline has not been checked.`,
    },
    {
      rule: 'Applicant Legal Entity Type',
      status: (fields.entityType ?? '').trim() ? ('review' as const) : ('unknown' as const),
      detail: (fields.entityType ?? '').trim()
        ? `Entity classification: ${fields.entityType.trim()}.`
        : 'Specify Legal Entity status in Project Profile before final compliance check.',
    },
  ];

  return {
    score: grant.matchPct,
    profileRevisionId: revision.id,
    projectName: project.name,
    referenceUrl: null,
    profileUpdatedAt: revision.createdAt.slice(0, 10),
    profileFacts,
    missingAreas,
    eligibilityGates,
  };
}

const ROLE_CAPABILITIES: Record<CoWorkRole, readonly CoWorkAction[]> = {
  owner: ['view', 'edit', 'review', 'submit', 'manage-project'],
  editor: ['view', 'edit', 'review'],
  reviewer: ['view', 'review'],
  viewer: ['view'],
};

export function canRolePerform(role: CoWorkRole, action: CoWorkAction): boolean {
  return ROLE_CAPABILITIES[role]?.includes(action) ?? false;
}
