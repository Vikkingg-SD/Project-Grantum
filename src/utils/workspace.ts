import type { Grant } from '../types/grant';
import type {
  ApplicationBundle,
  CoWorkAction,
  CoWorkRole,
  ProfileReadinessReport,
  ProfileRevision,
  ProjectKind,
  ProjectProfile,
  ReadinessChecklistItem,
  VerifiableMatchReport,
} from '../types/workspace';

export interface Workspace {
  projects: ProjectProfile[];
  revisions: ProfileRevision[];
  applications: ApplicationBundle[];
}

export const emptyWorkspace = (): Workspace => ({ projects: [], revisions: [], applications: [] });

export const workSlotKey = (projectId: string, grantId: string) =>
  `slot:${projectId.trim()}:${grantId.trim()}`;

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

export const PROFILE_FIELD_DEFINITIONS: readonly {
  key: string;
  label: string;
  weight: number;
  impact: 'high' | 'medium';
  guidance: string;
}[] = [
  {
    key: 'mission',
    label: 'Mission',
    weight: 16,
    impact: 'high',
    guidance: 'State the organization mission and measurable outcome in 2-3 sentences.',
  },
  {
    key: 'problem',
    label: 'Problem evidence',
    weight: 15,
    impact: 'high',
    guidance: 'Include baseline metrics, affected population, and cited empirical sources.',
  },
  {
    key: 'solution',
    label: 'Approach',
    weight: 15,
    impact: 'high',
    guidance: 'Describe implementation architecture, milestones, and operational readiness.',
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    weight: 12,
    impact: 'high',
    guidance: 'Specify primary beneficiaries, deployment geography, and inclusion criteria.',
  },
  {
    key: 'budget',
    label: 'Budget',
    weight: 14,
    impact: 'high',
    guidance: 'Provide direct/indirect cost breakdown and confirmed matching funds.',
  },
  {
    key: 'region',
    label: 'Region',
    weight: 10,
    impact: 'medium',
    guidance: 'List registered operating regions (e.g., Global, East Europe, CIS).',
  },
  {
    key: 'entityType',
    label: 'Legal entity',
    weight: 10,
    impact: 'medium',
    guidance: 'Confirm nonprofit, research institute, or commercial entity classification.',
  },
  {
    key: 'teamLead',
    label: 'Project lead',
    weight: 8,
    impact: 'medium',
    guidance: 'Identify lead key personnel, credentials, and prior grant delivery track record.',
  },
];

export function computeProfileReadiness(
  project: ProjectProfile,
  revision: ProfileRevision
): ProfileReadinessReport {
  let earned = 0;
  const checklist: ReadinessChecklistItem[] = PROFILE_FIELD_DEFINITIONS.map((def) => {
    const value = (revision.fields[def.key] ?? '').trim();
    const filled = value.length >= 8;
    if (filled) earned += def.weight;
    return {
      key: def.key,
      label: def.label,
      filled,
      impact: def.impact,
      guidance: def.guidance,
    };
  });
  return {
    score: earned,
    profileRevisionId: revision.id,
    checklist,
  };
}

export function buildVerifiableMatch(
  grant: Grant,
  project: ProjectProfile,
  revision: ProfileRevision,
  requirements: string[] = []
): VerifiableMatchReport {
  const fields = revision.fields;
  const verifiedAlignments: { clause: string; profileFact: string }[] = [];
  const missingAreas: { gap: string; targetAction: string }[] = [];

  if ((fields.mission ?? '').trim()) {
    verifiedAlignments.push({
      clause: `${grant.funder} thematic scope (${grant.title})`,
      profileFact: `Mission (${revision.id}): ${fields.mission.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: 'Core Mission & Value Thesis is missing in Project Profile',
      targetAction:
        'Add Mission statement in Project Profile Dossier to verify thematic alignment.',
    });
  }

  if ((fields.solution ?? '').trim()) {
    verifiedAlignments.push({
      clause: 'Technical & delivery execution capability',
      profileFact: `Approach (${revision.id}): ${fields.solution.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: 'Technical / Program Approach is unverified',
      targetAction: 'Document technical methodology and delivery milestones in Project Profile.',
    });
  }

  if ((fields.budget ?? '').trim()) {
    verifiedAlignments.push({
      clause: `Funding envelope alignment (${grant.amount})`,
      profileFact: `Budget plan (${revision.id}): ${fields.budget.trim()}`,
    });
  } else {
    missingAreas.push({
      gap: `No budget breakdown to verify against ${grant.amount} ceiling`,
      targetAction: 'Enter Budget Envelope & Co-Funding details in Project Profile.',
    });
  }

  for (const req of requirements.slice(0, 3)) {
    const hasMatch =
      (fields.problem ?? '').toLowerCase().includes(req.toLowerCase().slice(0, 6)) ||
      (fields.solution ?? '').toLowerCase().includes(req.toLowerCase().slice(0, 6));
    if (hasMatch) {
      verifiedAlignments.push({
        clause: `Grant requirement: ${req}`,
        profileFact: `Grounded in ${project.name} revision ${revision.id}`,
      });
    } else {
      missingAreas.push({
        gap: `Track requirement needs explicit evidence: "${req}"`,
        targetAction: `Sync "${req}" into Drafting Studio and attach an https:// source link.`,
      });
    }
  }

  const profileRegion = (fields.region ?? '').trim();
  const regionPass =
    !profileRegion ||
    grant.region.toLowerCase() === 'global' ||
    profileRegion.toLowerCase().includes(grant.region.toLowerCase()) ||
    grant.region.toLowerCase().includes(profileRegion.toLowerCase());

  const eligibilityGates = [
    {
      rule: `Geographic Jurisdiction (${grant.region})`,
      status: profileRegion
        ? regionPass
          ? ('pass' as const)
          : ('review' as const)
        : ('unknown' as const),
      detail: profileRegion
        ? `Project registered in "${profileRegion}" vs. grant region "${grant.region}".`
        : 'Set Eligible Jurisdiction in Project Profile to verify regional gate.',
    },
    {
      rule: `Award Ceiling (${grant.amount})`,
      status: (fields.budget ?? '').trim() ? ('pass' as const) : ('unknown' as const),
      detail: (fields.budget ?? '').trim()
        ? `Profile budget ("${fields.budget.trim()}") recorded for ${grant.amount} window.`
        : 'Add Budget Envelope in Project Profile to verify cost-share and cap.',
    },
    {
      rule: `Submission Window (${grant.deadline})`,
      status: 'pass' as const,
      detail: `Active solicitation window (${grant.deadline}) verified against catalog snapshot.`,
    },
    {
      rule: 'Applicant Legal Entity Type',
      status: (fields.entityType ?? '').trim() ? ('pass' as const) : ('review' as const),
      detail: (fields.entityType ?? '').trim()
        ? `Entity classification: ${fields.entityType.trim()}.`
        : 'Specify Legal Entity status in Project Profile before final compliance check.',
    },
  ];

  return {
    score: grant.matchPct,
    profileRevisionId: revision.id,
    projectName: project.name,
    officialUrl: `https://grants.example.org/opportunities/${encodeURIComponent(grant.id)}`,
    lastVerifiedAt: revision.createdAt.slice(0, 10),
    verifiedAlignments,
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
  return ROLE_CAPABILITIES[role].includes(action);
}

export function parseVaultDocs(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toggleVaultDoc(raw: string | undefined, docName: string): string {
  const clean = docName.trim();
  if (!clean) return raw ?? '';
  const current = parseVaultDocs(raw);
  const next = current.includes(clean)
    ? current.filter((item) => item !== clean)
    : [...current, clean];
  return next.join(' | ');
}
