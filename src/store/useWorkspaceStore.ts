import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { ENV } from '@/config/env';
import type {
  AdminAuditEntry,
  AdminQueueItem,
  ApplicationBundle,
  CoWorkRole,
  OutputKind,
  ProjectKind,
} from '@/types/workspace';
import {
  addApplication,
  archiveProject,
  emptyWorkspace,
  pullProfileRevision,
  saveProject,
  type Workspace,
} from '@/utils/workspace';

const STORAGE_KEY = 'grantum.workspace.v1';

function buildInitialWorkspace(): Workspace {
  let ws = emptyWorkspace();
  ws = saveProject(ws, {
    projectId: 'project-1',
    revisionId: 'rev-p1-v1',
    name: 'CleanWater AI Infrastructure',
    kind: 'startup',
    authorId: 'Founder Lead',
    createdAt: '2026-11-10T09:00:00Z',
    summary: 'Initial project profile dossier v1',
    fields: {
      mission: 'Deploy low-power acoustic leak telemetry across municipal water grids.',
      problem: 'Aging municipal pipes lose 28% of treated water before reaching households.',
      solution: 'Edge-AI hydrophone sensors with automated pressure-valve isolation.',
      region: 'Global, East Europe',
      beneficiaries: '',
      budget: '',
      entityType: '',
      teamLead: '',
    },
  });
  ws = saveProject(ws, {
    projectId: 'project-1',
    revisionId: 'rev-p1-v2',
    name: 'CleanWater AI Infrastructure',
    kind: 'startup',
    authorId: 'Founder Lead',
    createdAt: '2026-11-11T14:30:00Z',
    summary: 'Add co-funding budget envelope and entity registration details (v2)',
    fields: {
      mission: 'Deploy low-power acoustic leak telemetry across municipal water grids.',
      problem: 'Aging municipal pipes lose 28% of treated water before reaching households.',
      solution: 'Edge-AI hydrophone sensors with automated pressure-valve isolation.',
      region: 'Global, East Europe',
      beneficiaries: '12 municipal water utilities serving 1.4M residents.',
      budget: '$240,000 direct R&D + $60,000 confirmed utility co-funding',
      entityType: 'Registered Deep-Tech C-Corp / Municipal Consortium',
      teamLead: '',
      vaultDocs:
        'Audited_Financials_FY2025.pdf | Utility_CoFunding_MoU.pdf | TRL4_Hydrophone_Telemetry_Spec.pdf',
    },
  });
  ws = saveProject(ws, {
    projectId: 'project-2',
    revisionId: 'rev-p2-v1',
    name: 'Community Health & STEM Lab',
    kind: 'social',
    authorId: 'Program Director',
    createdAt: '2026-11-11T10:15:00Z',
    summary: 'Initial regional STEM & rural clinic resilience profile v1',
    fields: {
      mission: 'Equip rural clinics and secondary schools with solar diagnostics and STEM kits.',
      problem: 'Regional clinics lack backup cold-chain telemetry and diagnostic training.',
      solution: 'Modular solar micro-labs paired with accredited practitioner training.',
      region: 'East Europe, CIS',
      beneficiaries: '45 rural clinics and 3,200 vocational students.',
      budget: '$150,000 program grant request',
      entityType: '501(c)(3) / Registered Nonprofit Foundation',
      teamLead: 'Dr. Elena Rostova, Principal Program Lead',
      vaultDocs: 'Nonprofit_501c3_Determination.pdf | Rural_Clinic_Letters_of_Support.pdf',
    },
  });

  const app1: ApplicationBundle = {
    id: 'app-p1-g1',
    projectId: 'project-1',
    grantId: '1',
    fundingRoundId: 'round-2026-q4',
    profileRevisionId: 'rev-p1-v1',
    template: { id: 'tpl-startup', version: '1.0' },
    status: 'drafting',
    artifacts: [
      { id: 'art-1', kind: 'application', title: 'Application Narrative', revisionId: 'draft-v1' },
      {
        id: 'art-2',
        kind: 'pitch-deck',
        title: 'Investor & Funder Pitch Deck',
        revisionId: 'deck-v1',
      },
    ],
    updatedAt: '2026-11-11T11:00:00Z',
    submittedSnapshot: null,
  };

  const app2: ApplicationBundle = {
    id: 'app-p2-g1',
    projectId: 'project-2',
    grantId: '1',
    fundingRoundId: 'round-2026-q4',
    profileRevisionId: 'rev-p2-v1',
    template: { id: 'tpl-social', version: '1.0' },
    status: 'review',
    artifacts: [
      {
        id: 'art-3',
        kind: 'application',
        title: 'Community Grant Narrative',
        revisionId: 'draft-v1',
      },
      { id: 'art-4', kind: 'document', title: 'Clinic MoU & Budget Annex', revisionId: 'doc-v1' },
    ],
    updatedAt: '2026-11-11T16:20:00Z',
    submittedSnapshot: null,
  };

  ws = addApplication(ws, app1);
  ws = {
    ...ws,
    applications: [...ws.applications, app2],
  };
  return ws;
}

const INITIAL_ADMIN_QUEUE: AdminQueueItem[] = [
  {
    id: 'adm-1',
    category: 'failed-job',
    title: 'Export worker timeout: Proposal #104 DOCX bundle',
    detail: 'Worker queue timed out after 15s waiting for annex table serialization.',
    status: 'pending',
    updatedAt: '2026-11-12T07:40:00Z',
    actor: 'system-worker',
  },
  {
    id: 'adm-2',
    category: 'stale-catalog',
    title: 'Stale deadline alert: Horizon CleanTech Catalyst (#1)',
    detail: 'Official portal solicitation page updated annex deadline metadata 6 hours ago.',
    status: 'pending',
    updatedAt: '2026-11-12T08:05:00Z',
    actor: 'catalog-monitor',
  },
  {
    id: 'adm-3',
    category: 'bounty-suggestion',
    title: 'User bounty: Danube Basin Climate Resilience Fund 2027',
    detail: 'Submitted by usr_94f8a2c1 with official EU cohesion URL reference.',
    status: 'pending',
    updatedAt: '2026-11-12T08:25:00Z',
    actor: 'usr_94f8a2c1',
  },
];

interface PersistedSlice {
  workspace: Workspace;
  activeProjectId: string;
  activeRole: CoWorkRole;
  projectRoles?: Record<string, CoWorkRole>;
  nickname: string;
  digestEnabled: boolean;
  adminQueue?: AdminQueueItem[];
  adminAuditLog?: AdminAuditEntry[];
}

const persistence = createDevicePersistence<PersistedSlice>(
  STORAGE_KEY,
  getDeviceStorage(),
  (value): value is PersistedSlice => {
    const data = value as PersistedSlice | null;
    return Boolean(
      data &&
      Array.isArray(data.workspace?.projects) &&
      data.workspace.projects.length &&
      Array.isArray(data.workspace.revisions) &&
      Array.isArray(data.workspace.applications) &&
      typeof data.activeProjectId === 'string' &&
      typeof data.nickname === 'string' &&
      typeof data.digestEnabled === 'boolean' &&
      ['owner', 'editor', 'reviewer', 'viewer'].includes(data.activeRole)
    );
  }
);

export interface WorkspaceStoreState {
  workspace: Workspace;
  activeProjectId: string;
  activeRole: CoWorkRole;
  projectRoles: Record<string, CoWorkRole>;
  userId: string;
  nickname: string;
  digestEnabled: boolean;
  persistenceStatus: PersistenceStatus;
  hydrated: boolean;
  adminQueue: AdminQueueItem[];
  adminAuditLog: AdminAuditEntry[];
  setActiveProject: (projectId: string) => void;
  saveProjectProfile: (input: {
    projectId: string;
    name: string;
    kind: ProjectKind;
    summary: string;
    fields: Record<string, string>;
  }) => void;
  toggleArchiveProject: (projectId: string) => void;
  ensureWorkSlot: (projectId: string, grantId: string, outputs?: OutputKind[]) => ApplicationBundle;
  pullWorkSlotProfile: (applicationId: string) => void;
  markWorkSlotSubmitted: (applicationId: string, receiptReference: string) => void;
  setRole: (role: CoWorkRole) => void;
  setProjectRole: (projectId: string, role: CoWorkRole) => void;
  setPersonalSettings: (nickname: string, digestEnabled: boolean) => void;
  resolveAdminQueueItem: (id: string, status: 'approved' | 'rejected' | 'retried') => void;
}

const initialLoad = { slice: persistence.initial };
const seedWorkspace = initialLoad.slice?.workspace ?? buildInitialWorkspace();

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => {
  const persistState = (next: Partial<PersistedSlice>) => {
    const current = get();
    const merged: PersistedSlice = {
      workspace: next.workspace ?? current.workspace,
      activeProjectId: next.activeProjectId ?? current.activeProjectId,
      activeRole: next.activeRole ?? current.activeRole,
      projectRoles: next.projectRoles ?? current.projectRoles,
      nickname: next.nickname ?? current.nickname,
      digestEnabled: next.digestEnabled ?? current.digestEnabled,
      adminQueue: next.adminQueue ?? current.adminQueue,
      adminAuditLog: next.adminAuditLog ?? current.adminAuditLog,
    };
    return persistence.save(merged, (persistenceStatus) => set({ persistenceStatus }));
  };

  return {
    workspace: seedWorkspace,
    activeProjectId: initialLoad.slice?.activeProjectId ?? 'project-1',
    activeRole: initialLoad.slice?.activeRole ?? 'owner',
    projectRoles:
      initialLoad.slice?.projectRoles ??
      Object.fromEntries(
        seedWorkspace.projects.map((project) => [
          project.id,
          initialLoad.slice?.activeRole ?? 'owner',
        ])
      ),
    userId: 'usr_94f8a2c1',
    nickname: initialLoad.slice?.nickname ?? 'Founder Lead',
    digestEnabled: initialLoad.slice?.digestEnabled ?? true,
    persistenceStatus: persistence.status,
    hydrated: persistence.hydrated,
    adminQueue:
      initialLoad.slice?.adminQueue ?? (ENV.DATA_SOURCE === 'mock' ? INITIAL_ADMIN_QUEUE : []),
    adminAuditLog:
      initialLoad.slice?.adminAuditLog ??
      (ENV.DATA_SOURCE === 'mock'
        ? [
            {
              id: 'audit-init',
              timestamp: '2026-11-12T08:00:00Z',
              actor: 'Sample staff',
              action: 'Loaded sample staff queue',
              targetTitle: 'System Queue',
            },
          ]
        : []),

    setActiveProject: (projectId) =>
      set((state) => {
        if (!state.workspace.projects.some((project) => project.id === projectId)) return state;
        const activeRole = state.projectRoles[projectId] ?? 'owner';
        const persistenceStatus = persistState({ activeProjectId: projectId, activeRole });
        return { activeProjectId: projectId, activeRole, persistenceStatus };
      }),

    saveProjectProfile: (input) =>
      set((state) => {
        const revCount =
          state.workspace.revisions.filter((r) => r.projectId === input.projectId).length + 1;
        const revisionId = `rev-${input.projectId}-v${revCount}`;
        const nextWorkspace = saveProject(state.workspace, {
          projectId: input.projectId,
          revisionId,
          name: input.name,
          kind: input.kind,
          authorId: state.nickname || 'Founder Lead',
          createdAt: new Date().toISOString(),
          summary: input.summary,
          fields: input.fields,
        });
        const persistenceStatus = persistState({
          workspace: nextWorkspace,
          activeProjectId: input.projectId,
          activeRole: state.projectRoles[input.projectId] ?? 'owner',
        });
        return {
          workspace: nextWorkspace,
          activeProjectId: input.projectId,
          activeRole: state.projectRoles[input.projectId] ?? 'owner',
          persistenceStatus,
        };
      }),

    toggleArchiveProject: (projectId) =>
      set((state) => {
        const project = state.workspace.projects.find((p) => p.id === projectId);
        if (!project) return state;
        const nextArchived = project.archivedAt ? null : new Date().toISOString();
        const nextWorkspace = archiveProject(state.workspace, projectId, nextArchived);
        const activeCandidates = nextWorkspace.projects.filter((p) => !p.archivedAt);
        const nextActive =
          state.activeProjectId === projectId && nextArchived
            ? (activeCandidates[0]?.id ?? state.activeProjectId)
            : state.activeProjectId;
        const persistenceStatus = persistState({
          workspace: nextWorkspace,
          activeProjectId: nextActive,
          activeRole: state.projectRoles[nextActive] ?? 'owner',
        });
        return {
          workspace: nextWorkspace,
          activeProjectId: nextActive,
          activeRole: state.projectRoles[nextActive] ?? 'owner',
          persistenceStatus,
        };
      }),

    ensureWorkSlot: (projectId, grantId, outputs = ['application', 'pitch-deck']) => {
      const state = get();
      const existing = state.workspace.applications.find(
        (app) => app.projectId === projectId && app.grantId === grantId
      );
      if (existing) return existing;
      const project =
        state.workspace.projects.find((p) => p.id === projectId && !p.archivedAt) ??
        state.workspace.projects.find((p) => !p.archivedAt) ??
        state.workspace.projects[0];
      const newApp: ApplicationBundle = {
        id: `app-${project.id}-g${grantId}-${state.workspace.applications.length + 1}`,
        projectId: project.id,
        grantId,
        fundingRoundId: 'round-2026-active',
        profileRevisionId: project.currentRevisionId,
        template: { id: `tpl-${project.kind}`, version: '1.0' },
        status: 'drafting',
        artifacts: outputs.map((kind, idx) => ({
          id: `art-${grantId}-${idx + 1}`,
          kind,
          title:
            kind === 'application'
              ? 'Application Narrative'
              : kind === 'pitch-deck'
                ? 'Pitch Deck Outline'
                : 'Supporting Document Annex',
          revisionId: 'v1',
        })),
        updatedAt: new Date().toISOString(),
        submittedSnapshot: null,
      };
      const nextWorkspace = addApplication(state.workspace, newApp);
      const persistenceStatus = persistState({ workspace: nextWorkspace });
      set({ workspace: nextWorkspace, persistenceStatus });
      return newApp;
    },

    pullWorkSlotProfile: (applicationId) =>
      set((state) => {
        const nextWorkspace = pullProfileRevision(
          state.workspace,
          applicationId,
          new Date().toISOString()
        );
        const persistenceStatus = persistState({ workspace: nextWorkspace });
        return { workspace: nextWorkspace, persistenceStatus };
      }),

    markWorkSlotSubmitted: (applicationId, receiptReference) =>
      set((state) => {
        const now = new Date().toISOString();
        const nextWorkspace: Workspace = {
          ...state.workspace,
          applications: state.workspace.applications.map((app) =>
            app.id === applicationId
              ? {
                  ...app,
                  status: 'submitted',
                  updatedAt: now,
                  submittedSnapshot: {
                    profileRevisionId: app.profileRevisionId,
                    artifactRevisionIds: app.artifacts.map((a) => a.revisionId),
                    submittedAt: now,
                    receiptReference,
                  },
                }
              : app
          ),
        };
        const persistenceStatus = persistState({ workspace: nextWorkspace });
        return { workspace: nextWorkspace, persistenceStatus };
      }),

    setRole: (role) => get().setProjectRole(get().activeProjectId, role),
    setProjectRole: (projectId, role) =>
      set((state) => {
        if (ENV.DATA_SOURCE !== 'mock')
          throw new Error('Role changes require a connected team service.');
        if (!state.workspace.projects.some((project) => project.id === projectId))
          throw new Error('Project not found');
        if (!['owner', 'editor', 'reviewer', 'viewer'].includes(role))
          throw new Error('Invalid project role');
        const projectRoles = { ...state.projectRoles, [projectId]: role };
        const activeRole = projectId === state.activeProjectId ? role : state.activeRole;
        const persistenceStatus = persistState({ projectRoles, activeRole });
        return { projectRoles, activeRole, persistenceStatus };
      }),

    setPersonalSettings: (nickname, digestEnabled) =>
      set(() => {
        const cleanName = nickname.trim() || 'Founder Lead';
        const persistenceStatus = persistState({ nickname: cleanName, digestEnabled });
        return { nickname: cleanName, digestEnabled, persistenceStatus };
      }),

    resolveAdminQueueItem: (id, status) =>
      set((state) => {
        if (ENV.DATA_SOURCE !== 'mock')
          throw new Error('Staff actions require an authenticated staff service.');
        const target = state.adminQueue.find((item) => item.id === id);
        if (!target || target.status !== 'pending') return state;
        if (
          target.category === 'failed-job'
            ? status !== 'retried'
            : !['approved', 'rejected'].includes(status)
        ) {
          throw new Error('This action is not available for the selected queue item.');
        }
        const now = new Date().toISOString();
        const nextQueue = state.adminQueue.map((item) =>
          item.id === id ? { ...item, status, updatedAt: now, actor: state.nickname } : item
        );
        const entry: AdminAuditEntry = {
          id: `audit-${state.adminAuditLog.length + 1}`,
          timestamp: now,
          actor: `${state.nickname} (sample staff)`,
          action: `Marked queue item as ${status.toUpperCase()}`,
          targetTitle: target.title,
        };
        const persistenceStatus = persistState({
          adminQueue: nextQueue,
          adminAuditLog: [entry, ...state.adminAuditLog],
        });
        return {
          adminQueue: nextQueue,
          adminAuditLog: [entry, ...state.adminAuditLog],
          persistenceStatus,
        };
      }),
  };
});

export async function hydrateWorkspace() {
  await persistence.hydrate((slice) => {
    useWorkspaceStore.setState({
      workspace: slice.workspace,
      activeProjectId: slice.activeProjectId,
      activeRole: slice.activeRole,
      nickname: slice.nickname,
      digestEnabled: slice.digestEnabled,
      adminQueue: slice.adminQueue ?? useWorkspaceStore.getState().adminQueue,
      adminAuditLog: slice.adminAuditLog ?? useWorkspaceStore.getState().adminAuditLog,
      projectRoles:
        slice.projectRoles ??
        Object.fromEntries(
          slice.workspace.projects.map((project) => [project.id, slice.activeRole])
        ),
    });
  });
  useWorkspaceStore.setState({ hydrated: true, persistenceStatus: persistence.status });
}
