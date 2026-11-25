import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { DEFAULT_REQUIRED_SECTIONS } from '@/config/constants';
import { ENV } from '@/config/env';
import { MOCK_AWARD_APPLICATION_ID } from '@/mock/seeds';
import { isWorkSlotReadyToFinish } from '@/utils/drafting';
import { acknowledgeNotificationId, isNotificationReadIdList } from '@/utils/notifications';
import { useWorkbenchStore } from './useWorkbenchStore';
import type {
  AdminAuditEntry,
  AdminQueueItem,
  ApplicationBundle,
  CoWorkRole,
  OutputKind,
  ProjectKind,
  ProjectProfileAuditRecord,
} from '@/types/workspace';
import {
  addApplication,
  createDraftApplication,
  archiveProject,
  auditProjectProfile,
  canRolePerform,
  emptyWorkspace,
  isProfileAuditMap,
  pullProfileRevision,
  saveProject,
  selectProfileRevision,
  applicationWorkKey,
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
      mission:
        'Deploy low-power acoustic leak telemetry across aging municipal water grids so utilities detect underground pipe ruptures within minutes, cut treated-water loss by over half, and stabilize resilient regional water service.',
      problem:
        'Aging municipal distribution pipes lose 28% of treated drinking water before reaching households, causing $420M in annual utility waste, frequent pressure drops across underserved wards, and delayed emergency leak isolation crews.',
      solution:
        'Install battery-powered edge-AI hydrophone sensor nodes along primary feeder mains, correlate transient acoustic signatures in real time, and trigger automated district-meter pressure-valve isolation with utility dispatch telemetry.',
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
      mission:
        'Deploy low-power acoustic leak telemetry across aging municipal water grids so utilities detect underground pipe ruptures within minutes, cut treated-water loss by over half, and stabilize resilient regional water service.',
      problem:
        'Aging municipal distribution pipes lose 28% of treated drinking water before reaching households, causing $420M in annual utility waste, frequent pressure drops across underserved wards, and delayed emergency leak isolation crews.',
      solution:
        'Install battery-powered edge-AI hydrophone sensor nodes along primary feeder mains, correlate transient acoustic signatures in real time, and trigger automated district-meter pressure-valve isolation with utility dispatch telemetry.',
      region: 'Global, East Europe',
      beneficiaries:
        'Twelve municipal water utilities serving 1.4M residential and institutional residents across high-loss coastal and inland districts, prioritizing public clinics and low-income neighborhoods.',
      budget:
        '$240,000 direct R&D hardware and calibration engineering plus $60,000 confirmed municipal utility co-funding and field maintenance match.',
      entityType: 'For-profit Startup (C-Corp / LLC)',
      teamLead: '',
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
      mission:
        'Equip underserved rural clinics and technical secondary schools with modular solar diagnostics, cold-chain monitoring, and hands-on STEM training labs so local practitioners sustain independent preventive care year-round.',
      problem:
        'Over 60% of regional rural clinics face weekly grid outages that compromise vaccine cold storage, force costly patient referrals across 80km corridors, and leave vocational students without accredited diagnostic lab instrumentation.',
      solution:
        'Deploy pre-wired solar micro-labs with low-voltage cold-chain telemetry, point-of-care diagnostic benches, and accredited curriculum modules enabling local clinical staff and instructors to maintain hardware without external contractors.',
      region: 'East Europe, CIS',
      beneficiaries:
        'Forty-five rural primary care clinics, 3,200 vocational health and engineering students, and 180,000 residents across remote agricultural municipalities.',
      budget:
        '$150,000 program grant request covering solar micro-lab kits, regional training workshops, and 12-month calibration support.',
      entityType: 'Nonprofit / 501(c)(3) Foundation',
      teamLead:
        'Dr. Elena Rostova, Principal Program Lead — 12 years leading rural clinical grants',
    },
  });

  const app1: ApplicationBundle = {
    id: MOCK_AWARD_APPLICATION_ID,
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
    sourceUrl: 'https://ops.grantum.app/jobs/export-104',
    lastCheckedAt: '2026-11-12T07:40:00Z',
    failureContext: 'ETIMEDOUT at annex serializer step 3/4 (15,000ms budget exceeded).',
  },
  {
    id: 'adm-2',
    category: 'stale-catalog',
    title: 'Stale deadline alert: Horizon CleanTech Catalyst (#1)',
    detail: 'Official portal solicitation page updated annex deadline metadata 6 hours ago.',
    status: 'pending',
    updatedAt: '2026-11-12T08:05:00Z',
    actor: 'catalog-monitor',
    sourceUrl: 'https://funding.horizon-cleantech.org/calls/2026',
    lastCheckedAt: '2026-11-12T08:05:00Z',
    failureContext: 'Cached digest differs from source ETag; manual deadline review pending.',
  },
  {
    id: 'adm-3',
    category: 'bounty-suggestion',
    title: 'User bounty: Danube Basin Climate Resilience Fund 2027',
    detail: 'Submitted by usr_94f8a2c1 with official EU cohesion URL reference.',
    status: 'pending',
    updatedAt: '2026-11-12T08:25:00Z',
    actor: 'usr_94f8a2c1',
    sourceUrl: 'https://danube-climate.org/grants/2027',
    lastCheckedAt: '2026-11-12T08:25:00Z',
    failureContext: 'Awaiting staff verification before catalog indexing and bounty eligibility.',
  },
];

interface PersistedSlice {
  workspace: Workspace;
  activeProjectId: string;
  activeRole: CoWorkRole;
  projectRoles?: Record<string, CoWorkRole>;
  nickname: string;
  digestEnabled: boolean;
  launchTourCompleted?: boolean;
  supportPromptDismissedAt?: string | null;
  readNotificationIds?: string[];
  adminQueue?: AdminQueueItem[];
  adminAuditLog?: AdminAuditEntry[];
  profileAudits?: Record<string, ProjectProfileAuditRecord>;
}

const VALID_ROLES = new Set<CoWorkRole>(['owner', 'editor', 'reviewer', 'viewer']);

function sanitizeProjectRoles(
  raw: Record<string, CoWorkRole> | undefined,
  projects: readonly { id: string }[],
  fallbackRole: CoWorkRole
): Record<string, CoWorkRole> {
  const safeFallback: CoWorkRole = VALID_ROLES.has(fallbackRole) ? fallbackRole : 'owner';
  const result: Record<string, CoWorkRole> = {};
  for (const project of projects) {
    const candidate = raw?.[project.id];
    result[project.id] = candidate && VALID_ROLES.has(candidate) ? candidate : safeFallback;
  }
  if (raw) {
    for (const [id, role] of Object.entries(raw)) {
      if (VALID_ROLES.has(role) && !(id in result)) result[id] = role;
    }
  }
  return result;
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
      VALID_ROLES.has(data.activeRole)
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
  launchTourCompleted: boolean;
  supportPromptDismissedAt: string | null;
  supportPromptSeenInSession: boolean;
  readNotificationIds: string[];
  persistenceStatus: PersistenceStatus;
  hydrated: boolean;
  adminQueue: AdminQueueItem[];
  adminAuditLog: AdminAuditEntry[];
  profileAudits: Record<string, ProjectProfileAuditRecord>;
  setActiveProject: (projectId: string) => void;
  saveProjectProfile: (input: {
    projectId: string;
    name: string;
    kind: ProjectKind;
    summary: string;
    fields: Record<string, string>;
  }) => void;
  runProfileAudit: (input: {
    projectId: string;
    name: string;
    kind: ProjectKind;
    fields: Record<string, string>;
  }) => ProjectProfileAuditRecord;
  toggleArchiveProject: (projectId: string) => void;
  ensureWorkSlot: (projectId: string, grantId: string, outputs?: OutputKind[]) => ApplicationBundle;
  createWorkAttempt: (projectId: string, grantId: string) => ApplicationBundle;
  pullWorkSlotProfile: (applicationId: string) => void;
  setWorkSlotProfileRevision: (applicationId: string, revisionId: string) => void;
  markWorkSlotSubmitted: (applicationId: string, receiptReference: string) => void;
  setWorkSlotReviewStatus: (
    applicationId: string,
    status: 'drafting' | 'review' | 'ready',
    requiredSections?: readonly string[]
  ) => void;
  setRole: (role: CoWorkRole) => void;
  setProjectRole: (projectId: string, role: CoWorkRole) => void;
  setPersonalSettings: (nickname: string, digestEnabled: boolean) => void;
  completeLaunchTour: () => void;
  setLaunchTourEnabled: (enabled: boolean) => void;
  markSupportPromptSeenInSession: () => void;
  resetSupportPromptSession: () => void;
  dismissSupportPrompt: (nowIso?: string) => void;
  restoreSupportPrompt: () => void;
  acknowledgeNotification: (eventId: string) => void;
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
      launchTourCompleted: next.launchTourCompleted ?? current.launchTourCompleted,
      supportPromptDismissedAt:
        next.supportPromptDismissedAt !== undefined
          ? next.supportPromptDismissedAt
          : current.supportPromptDismissedAt,
      readNotificationIds: next.readNotificationIds ?? current.readNotificationIds,
      adminQueue: next.adminQueue ?? current.adminQueue,
      adminAuditLog: next.adminAuditLog ?? current.adminAuditLog,
      profileAudits: next.profileAudits ?? current.profileAudits,
    };
    return persistence.save(merged, (persistenceStatus) => set({ persistenceStatus }));
  };

  const createAttempt = (projectId: string, grantId: string, outputs: OutputKind[]) => {
    const state = get();
    const project = state.workspace.projects.find(
      (item) => item.id === projectId && !item.archivedAt
    );
    if (!project) throw new Error('Choose an active project.');
    const newApp = createDraftApplication({
      id: `app-${project.id}-g${grantId}-${state.workspace.applications.length + 1}`,
      grantId,
      project,
      outputs,
      updatedAt: new Date().toISOString(),
    });
    const nextWorkspace = addApplication(state.workspace, newApp);
    const persistenceStatus = persistState({ workspace: nextWorkspace });
    set({ workspace: nextWorkspace, persistenceStatus });
    return newApp;
  };

  return {
    workspace: seedWorkspace,
    activeProjectId: initialLoad.slice?.activeProjectId ?? 'project-1',
    activeRole: initialLoad.slice?.activeRole ?? 'owner',
    projectRoles: sanitizeProjectRoles(
      initialLoad.slice?.projectRoles,
      seedWorkspace.projects,
      initialLoad.slice?.activeRole ?? 'owner'
    ),
    userId: 'usr_94f8a2c1',
    nickname: initialLoad.slice?.nickname ?? 'Founder Lead',
    digestEnabled: initialLoad.slice?.digestEnabled ?? true,
    launchTourCompleted: initialLoad.slice?.launchTourCompleted === true,
    supportPromptDismissedAt: initialLoad.slice?.supportPromptDismissedAt ?? null,
    supportPromptSeenInSession: false,
    readNotificationIds: isNotificationReadIdList(initialLoad.slice?.readNotificationIds)
      ? initialLoad.slice.readNotificationIds
      : [],
    persistenceStatus: persistence.status,
    hydrated: persistence.hydrated,
    adminQueue:
      ENV.DATA_SOURCE === 'mock' ? (initialLoad.slice?.adminQueue ?? INITIAL_ADMIN_QUEUE) : [],
    adminAuditLog:
      ENV.DATA_SOURCE === 'mock'
        ? (initialLoad.slice?.adminAuditLog ?? [
            {
              id: 'audit-init',
              timestamp: '2026-11-12T08:00:00Z',
              actor: 'Operations staff',
              action: 'Loaded staff queue',
              targetTitle: 'System Queue',
            },
          ])
        : [],
    profileAudits: isProfileAuditMap(initialLoad.slice?.profileAudits)
      ? initialLoad.slice.profileAudits
      : {},

    setActiveProject: (projectId) =>
      set((state) => {
        const cleanId = projectId.trim();
        if (!state.workspace.projects.some((project) => project.id === cleanId)) return state;
        const activeRole = state.projectRoles[cleanId] ?? 'owner';
        const persistenceStatus = persistState({ activeProjectId: cleanId, activeRole });
        return { activeProjectId: cleanId, activeRole, persistenceStatus };
      }),

    saveProjectProfile: (input) =>
      set((state) => {
        const projectId = input.projectId.trim();
        if (!projectId) throw new Error('Project ID is required.');
        const existing = state.workspace.projects.some((p) => p.id === projectId);
        const targetRole = existing ? (state.projectRoles[projectId] ?? 'owner') : state.activeRole;
        const requiredAction = existing ? 'edit' : 'manage-project';
        if (!canRolePerform(targetRole, requiredAction)) {
          throw new Error(
            existing
              ? 'Your project role cannot edit this project profile.'
              : 'Only a project owner can create new project slots.'
          );
        }
        const revCount =
          state.workspace.revisions.filter((r) => r.projectId === projectId).length + 1;
        const revisionId = `rev-${projectId}-v${revCount}`;
        const nextWorkspace = saveProject(state.workspace, {
          projectId,
          revisionId,
          name: input.name,
          kind: input.kind,
          authorId: state.nickname || 'Founder Lead',
          createdAt: new Date().toISOString(),
          summary: input.summary,
          fields: input.fields,
        });
        if (nextWorkspace === state.workspace) return state;
        const nextProjectRoles = existing
          ? state.projectRoles
          : { ...state.projectRoles, [projectId]: 'owner' as CoWorkRole };
        const nextRole = nextProjectRoles[projectId] ?? 'owner';
        const persistenceStatus = persistState({
          workspace: nextWorkspace,
          activeProjectId: projectId,
          activeRole: nextRole,
          projectRoles: nextProjectRoles,
        });
        return {
          workspace: nextWorkspace,
          activeProjectId: projectId,
          activeRole: nextRole,
          projectRoles: nextProjectRoles,
          persistenceStatus,
        };
      }),

    runProfileAudit: (input) => {
      const state = get();
      const projectId = input.projectId.trim();
      if (!projectId) throw new Error('Project ID is required.');
      const existing = state.workspace.projects.find((p) => p.id === projectId);
      if (!existing) throw new Error('Save the project before auditing this profile.');
      if (existing.archivedAt) {
        throw new Error('Restore the project before auditing this profile.');
      }
      const targetRole = state.projectRoles[projectId] ?? 'owner';
      if (!canRolePerform(targetRole, 'review')) {
        throw new Error('Your project role cannot audit this project profile.');
      }
      const record = auditProjectProfile({
        projectId,
        revisionId: existing.currentRevisionId,
        name: input.name,
        kind: input.kind,
        fields: input.fields,
        actor: state.nickname || 'Founder Lead',
        auditedAt: new Date().toISOString(),
      });
      const nextAudits: Record<string, ProjectProfileAuditRecord> = {
        ...state.profileAudits,
        [projectId]: record,
      };
      const keys = Object.keys(nextAudits);
      if (keys.length > 100) {
        const dropKeys = keys
          .filter((key) => key !== projectId)
          .sort((a, b) =>
            (nextAudits[a].auditedAt || '').localeCompare(nextAudits[b].auditedAt || '')
          )
          .slice(0, keys.length - 100);
        for (const key of dropKeys) delete nextAudits[key];
      }
      const persistenceStatus = persistState({ profileAudits: nextAudits });
      set({ profileAudits: nextAudits, persistenceStatus });
      return record;
    },

    toggleArchiveProject: (projectId) =>
      set((state) => {
        const cleanId = projectId.trim();
        const project = state.workspace.projects.find((p) => p.id === cleanId);
        if (!project) return state;
        if (!canRolePerform(state.projectRoles[cleanId] ?? 'owner', 'manage-project')) {
          throw new Error('Only a project owner can archive or restore project slots.');
        }
        const nextArchived = project.archivedAt ? null : new Date().toISOString();
        const nextWorkspace = archiveProject(state.workspace, cleanId, nextArchived);
        const activeCandidates = nextWorkspace.projects.filter((p) => !p.archivedAt);
        const nextActive =
          state.activeProjectId === cleanId && nextArchived
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
      const targetProject =
        state.workspace.projects.find(
          (project) => project.id === projectId && !project.archivedAt
        ) ?? state.workspace.projects.find((project) => !project.archivedAt);
      if (!targetProject) throw new Error('Restore a project before starting an application.');
      return createAttempt(targetProject.id, grantId, outputs);
    },

    createWorkAttempt: (projectId, grantId) => {
      if (ENV.DATA_SOURCE !== 'mock') {
        throw new Error('Additional applications require a connected application service.');
      }
      if (!canRolePerform(get().projectRoles[projectId] ?? 'owner', 'edit')) {
        throw new Error('Your project role cannot start an application.');
      }
      return createAttempt(projectId, grantId, ['application', 'pitch-deck']);
    },

    pullWorkSlotProfile: (applicationId) =>
      set((state) => {
        const target = state.workspace.applications.find((app) => app.id === applicationId);
        if (target && !canRolePerform(state.projectRoles[target.projectId] ?? 'owner', 'edit')) {
          throw new Error('Your project role cannot sync profile revisions into this work slot.');
        }
        const nextWorkspace = pullProfileRevision(
          state.workspace,
          applicationId,
          new Date().toISOString()
        );
        const persistenceStatus = persistState({ workspace: nextWorkspace });
        return { workspace: nextWorkspace, persistenceStatus };
      }),

    setWorkSlotProfileRevision: (applicationId, revisionId) =>
      set((state) => {
        const target = state.workspace.applications.find((app) => app.id === applicationId);
        if (target && !canRolePerform(state.projectRoles[target.projectId] ?? 'owner', 'edit')) {
          throw new Error('Your project role cannot select profile revisions in this work slot.');
        }
        const nextWorkspace = selectProfileRevision(
          state.workspace,
          applicationId,
          revisionId,
          new Date().toISOString()
        );
        if (nextWorkspace === state.workspace) return state;
        const persistenceStatus = persistState({ workspace: nextWorkspace });
        return { workspace: nextWorkspace, persistenceStatus };
      }),

    markWorkSlotSubmitted: (applicationId, receiptReference) =>
      set((state) => {
        const target = state.workspace.applications.find((app) => app.id === applicationId);
        if (!target) throw new Error('Application work slot not found.');
        if (target.submittedSnapshot || target.status === 'submitted') {
          throw new Error('A receipt is already recorded for this application.');
        }
        if (target.status === 'archived')
          throw new Error('Archived applications cannot record a receipt.');
        if (!canRolePerform(state.projectRoles[target.projectId] ?? 'owner', 'submit')) {
          throw new Error('Only the project owner can record a submission receipt.');
        }
        const receipt = receiptReference.trim();
        if (!receipt) throw new Error('Enter a submission receipt reference.');
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
                    receiptReference: receipt,
                  },
                }
              : app
          ),
        };
        const persistenceStatus = persistState({ workspace: nextWorkspace });
        return { workspace: nextWorkspace, persistenceStatus };
      }),

    setWorkSlotReviewStatus: (applicationId, nextStatus, requiredSections) =>
      set((state) => {
        if (!['drafting', 'review', 'ready'].includes(nextStatus)) {
          throw new Error('Unsupported review status.');
        }
        const target = state.workspace.applications.find((app) => app.id === applicationId);
        if (!target) throw new Error('Application work slot not found.');
        if (target.status === 'submitted' || target.submittedSnapshot !== null) {
          throw new Error('Submitted applications are locked to their receipt snapshot.');
        }
        if (target.status === 'archived') {
          throw new Error('Archived applications cannot change review status.');
        }
        const action = nextStatus === 'drafting' ? 'edit' : 'review';
        if (!canRolePerform(state.projectRoles[target.projectId] ?? 'owner', action)) {
          throw new Error('Your project role cannot change this review status.');
        }
        if (nextStatus === 'ready') {
          const slot = applicationWorkKey(state.workspace, target);
          const work = useWorkbenchStore.getState().work[slot];
          const expectedRequired =
            requiredSections && requiredSections.length > 0
              ? requiredSections
              : DEFAULT_REQUIRED_SECTIONS;
          if (!isWorkSlotReadyToFinish(work, expectedRequired)) {
            throw new Error('Write each draft section before marking the application ready.');
          }
        }
        if (target.status === nextStatus) return state;
        const now = new Date().toISOString();
        const nextWorkspace: Workspace = {
          ...state.workspace,
          applications: state.workspace.applications.map((app) =>
            app.id === applicationId ? { ...app, status: nextStatus, updatedAt: now } : app
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
        const cleanId = projectId.trim();
        if (!state.workspace.projects.some((project) => project.id === cleanId))
          throw new Error('Project not found');
        if (!VALID_ROLES.has(role)) throw new Error('Invalid project role');
        const projectRoles = { ...state.projectRoles, [cleanId]: role };
        const activeRole = cleanId === state.activeProjectId ? role : state.activeRole;
        const persistenceStatus = persistState({ projectRoles, activeRole });
        return { projectRoles, activeRole, persistenceStatus };
      }),

    setPersonalSettings: (nickname, digestEnabled) =>
      set(() => {
        const cleanName = nickname.trim() || 'Founder Lead';
        const persistenceStatus = persistState({ nickname: cleanName, digestEnabled });
        return { nickname: cleanName, digestEnabled, persistenceStatus };
      }),

    completeLaunchTour: () =>
      set((state) => {
        if (state.launchTourCompleted) return state;
        const persistenceStatus = persistState({ launchTourCompleted: true });
        return { launchTourCompleted: true, persistenceStatus };
      }),

    setLaunchTourEnabled: (enabled) =>
      set((state) => {
        const launchTourCompleted = !enabled;
        if (state.launchTourCompleted === launchTourCompleted) return state;
        const persistenceStatus = persistState({ launchTourCompleted });
        return { launchTourCompleted, persistenceStatus };
      }),

    markSupportPromptSeenInSession: () =>
      set((state) =>
        state.supportPromptSeenInSession ? state : { supportPromptSeenInSession: true }
      ),

    resetSupportPromptSession: () => set({ supportPromptSeenInSession: false }),

    dismissSupportPrompt: (nowIso = new Date().toISOString()) =>
      set(() => {
        const persistenceStatus = persistState({ supportPromptDismissedAt: nowIso });
        return {
          supportPromptDismissedAt: nowIso,
          supportPromptSeenInSession: true,
          persistenceStatus,
        };
      }),

    restoreSupportPrompt: () =>
      set(() => {
        const persistenceStatus = persistState({ supportPromptDismissedAt: null });
        return {
          supportPromptDismissedAt: null,
          supportPromptSeenInSession: false,
          persistenceStatus,
        };
      }),

    acknowledgeNotification: (eventId) =>
      set((state) => {
        const clean = eventId.trim();
        if (!clean || state.readNotificationIds.includes(clean)) return state;
        const nextIds = acknowledgeNotificationId(state.readNotificationIds, clean);
        const persistenceStatus = persistState({ readNotificationIds: nextIds });
        return { readNotificationIds: nextIds, persistenceStatus };
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
          actor: `${state.nickname} (staff)`,
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
      launchTourCompleted: slice.launchTourCompleted === true,
      supportPromptDismissedAt: slice.supportPromptDismissedAt ?? null,
      readNotificationIds: isNotificationReadIdList(slice.readNotificationIds)
        ? slice.readNotificationIds
        : [],
      adminQueue:
        ENV.DATA_SOURCE === 'mock'
          ? (slice.adminQueue ?? useWorkspaceStore.getState().adminQueue)
          : [],
      adminAuditLog:
        ENV.DATA_SOURCE === 'mock'
          ? (slice.adminAuditLog ?? useWorkspaceStore.getState().adminAuditLog)
          : [],
      projectRoles: sanitizeProjectRoles(
        slice.projectRoles,
        slice.workspace.projects,
        slice.activeRole
      ),
      profileAudits: isProfileAuditMap(slice.profileAudits) ? slice.profileAudits : {},
    });
  });
  useWorkspaceStore.setState({ hydrated: true, persistenceStatus: persistence.status });
}
