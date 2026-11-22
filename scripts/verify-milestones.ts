import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import { useProgressStore } from '../src/store/useProgressStore';
import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import type { AwardRecord } from '../src/types/api';
import type { GrantDetail } from '../src/types/grant';
import type { ApplicationBundle } from '../src/types/workspace';
import { buildDefaultBudgetRecord, evaluateWorkSlotBudget } from '../src/utils/budget';
import {
  buildStageWorkplan,
  canRoleMarkWorkplanDone,
  createEmptyProgressRecord,
  deriveApplicationProgress,
  formatDeadlineCountdown,
  isProgressRecordMap,
  markWorkplanTaskDone,
  recordSlotExportFormat,
  reopenWorkplanTask,
  verifyWorkplanTask,
  type WorkSlotProgressRecord,
} from '../src/utils/progressTracking';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

const sampleGrant: GrantDetail = {
  id: '1',
  title: 'Climate Resilience Infrastructure',
  funder: 'Northstar Foundation',
  deadline: '28 days',
  amount: '$250k–$500k',
  matchPct: 94,
  region: 'Global',
  summary: 'Flood resilience infrastructure.',
  requirements: ['Mission', 'Budget'],
};

const baseApp: ApplicationBundle = {
  id: 'app-1',
  projectId: 'project-1',
  grantId: '1',
  fundingRoundId: 'round-1',
  profileRevisionId: 'rev-p1-v1',
  template: { id: 'tpl-1', version: '1.0' },
  status: 'drafting',
  artifacts: [],
  updatedAt: '2026-11-10T09:00:00Z',
  submittedSnapshot: null,
};

const awardFixture: AwardRecord = {
  grantId: '1',
  status: 'awarded',
  submittedAt: '2026-11-12T10:00:00Z',
  nextReportAt: '2027-01-15T00:00:00Z',
  amount: '$250k–$500k',
  contractStatus: 'Contract countersigned',
  events: [],
};

async function main() {
  const nowMs = Date.parse('2026-11-15T12:00:00Z');

  check(
    'Given relative and calendar deadlines When formatted Then countdown reflects remaining time',
    formatDeadlineCountdown('28 days', nowMs) === '28 days left' &&
      formatDeadlineCountdown('today', nowMs) === 'Due today' &&
      formatDeadlineCountdown('2026-11-20', nowMs) === '5 days left'
  );

  const draftingProgress = deriveApplicationProgress({
    grant: sampleGrant,
    application: baseApp,
    awardRecord: awardFixture,
    nowMs,
  });
  check(
    'Given pre-submission drafting slot even with mock award endpoint When derived Then never displays Awarded or Contract countersigned',
    draftingProgress.stage === 'drafting' &&
      draftingProgress.deadlineHeading === 'Next deadline' &&
      draftingProgress.submissionStatusLabel === '28 days left | Status - Drafting' &&
      draftingProgress.awardStatusValue === 'Soon' &&
      draftingProgress.nextDeadlineCardValue === '28 days' &&
      !draftingProgress.headerSubtitle.includes('Submitted')
  );

  const acceptedProgress = deriveApplicationProgress({
    grant: sampleGrant,
    application: {
      ...baseApp,
      status: 'submitted',
      submittedSnapshot: {
        profileRevisionId: 'rev-p1-v1',
        artifactRevisionIds: [],
        submittedAt: '2026-11-12T10:00:00Z',
        receiptReference: 'rcpt-1',
      },
    },
    awardRecord: awardFixture,
    nowMs,
  });
  check(
    'Given submitted and accepted slot When derived Then emits green Accepted status and reporting schedule',
    acceptedProgress.stage === 'accepted' &&
      acceptedProgress.submissionStatusVariant === 'verified' &&
      acceptedProgress.submissionStatusLabel.includes('Status - Accepted') &&
      acceptedProgress.deadlineHeading === 'Next reporting date' &&
      acceptedProgress.awardStatusValue === 'Contract countersigned'
  );

  const rejectedProgress = deriveApplicationProgress({
    grant: sampleGrant,
    application: {
      ...baseApp,
      status: 'submitted',
      submittedSnapshot: {
        profileRevisionId: 'rev-p1-v1',
        artifactRevisionIds: [],
        submittedAt: '2026-11-12T10:00:00Z',
        receiptReference: 'rcpt-1',
      },
    },
    awardRecord: { ...awardFixture, status: 'declined', contractStatus: 'Declined' },
    nowMs,
  });
  check(
    'Given submitted and declined slot When derived Then emits red Rejected status and hides workplan',
    rejectedProgress.stage === 'rejected' &&
      rejectedProgress.submissionStatusVariant === 'failure' &&
      rejectedProgress.submissionStatusLabel === 'Closed | Status - Rejected' &&
      rejectedProgress.showWorkplan === false
  );

  const emptyRecord = createEmptyProgressRecord('slot:project-1:1');
  const budgetEval = evaluateWorkSlotBudget(buildDefaultBudgetRecord('slot:project-1:1'));
  const preSubmissionPlan = buildStageWorkplan({
    stage: 'drafting',
    record: emptyRecord,
    filledSectionsCount: 3,
    totalSectionsCount: 6,
    missingSectionTitles: ['Budget', 'Team', 'Timeline'],
    budgetSavedForSlot: false,
    budgetEvaluation: budgetEval,
    auditPassed: false,
    auditStale: false,
    auditHistoryCount: 0,
    exportNarrativeFilled: false,
  });
  check(
    'Given pre-submission drafting stage When workplan built Then generates stage tasks instead of hardcoded post-award reports',
    preSubmissionPlan.length === 4 &&
      preSubmissionPlan[0].title === 'Complete required sections' &&
      preSubmissionPlan[0].autoCompletionPct === 50 &&
      preSubmissionPlan[1].title === 'Complete budget sheet' &&
      preSubmissionPlan[1].autoCompletionPct === 50 &&
      !preSubmissionPlan.some((item) => item.title.includes('Financial Expenditure'))
  );

  let editorError = '';
  try {
    markWorkplanTaskDone(emptyRecord, {
      id: 'evt-1',
      taskId: 'budget',
      taskTitle: 'Complete budget sheet',
      autoCompletionPct: 50,
      actor: 'Alex Editor',
      role: 'editor',
      timestamp: '2026-11-15T12:10:00Z',
    });
  } catch (e) {
    editorError = e instanceof Error ? e.message : String(e);
  }
  check(
    'Given editor or reviewer/owner roles When marking incomplete task done Then editor blocked while owner/reviewer succeed',
    !canRoleMarkWorkplanDone('editor') &&
      !canRoleMarkWorkplanDone('viewer') &&
      canRoleMarkWorkplanDone('owner') &&
      canRoleMarkWorkplanDone('reviewer') &&
      editorError.includes('Owner or Reviewer')
  );

  const ownerMarked = markWorkplanTaskDone(emptyRecord, {
    id: 'evt-2',
    taskId: 'budget',
    taskTitle: 'Complete budget sheet',
    autoCompletionPct: 50,
    actor: 'Founder Lead',
    role: 'owner',
    timestamp: '2026-11-15T12:15:00Z',
  });
  const exportedRec = recordSlotExportFormat(ownerMarked, {
    id: 'evt-3',
    format: 'md',
    filename: 'cleanwater-1.md',
    actor: 'Founder Lead',
    timestamp: '2026-11-15T12:20:00Z',
  });
  const updatedPlan = buildStageWorkplan({
    stage: 'drafting',
    record: exportedRec,
    filledSectionsCount: 6,
    totalSectionsCount: 6,
    missingSectionTitles: [],
    budgetSavedForSlot: false,
    budgetEvaluation: budgetEval,
    auditPassed: true,
    auditStale: false,
    auditHistoryCount: 1,
    exportNarrativeFilled: true,
  });
  check(
    'Given owner override and export When persisted record applied Then task shows marked-done and export flips to 100%',
    updatedPlan.find((t) => t.id === 'budget')?.status === 'marked-done' &&
      updatedPlan.find((t) => t.id === 'export')?.autoCompletionPct === 100 &&
      exportedRec.activityLog.length === 2 &&
      exportedRec.activityLog[0].message.includes('Exported application as .md')
  );

  let verifyIncompleteError = '';
  try {
    verifyWorkplanTask(emptyRecord, {
      id: 'evt-4',
      taskId: 'sections',
      taskTitle: 'Complete required sections',
      autoCompletionPct: 50,
      actor: 'Founder Lead',
      role: 'owner',
    });
  } catch (e) {
    verifyIncompleteError = e instanceof Error ? e.message : String(e);
  }
  const verified100 = verifyWorkplanTask(exportedRec, {
    id: 'evt-5',
    taskId: 'sections',
    taskTitle: 'Complete required sections',
    autoCompletionPct: 100,
    actor: 'Reviewer Jane',
    role: 'reviewer',
    timestamp: '2026-11-15T12:25:00Z',
  });
  const reopened = reopenWorkplanTask(verified100, {
    id: 'evt-6',
    taskId: 'sections',
    taskTitle: 'Complete required sections',
    actor: 'Reviewer Jane',
    role: 'reviewer',
    timestamp: '2026-11-15T12:30:00Z',
  });
  const verifiedStale = buildStageWorkplan({
    stage: 'drafting',
    record: verified100,
    filledSectionsCount: 5,
    totalSectionsCount: 6,
    missingSectionTitles: ['Budget'],
    budgetSavedForSlot: false,
    budgetEvaluation: budgetEval,
    auditPassed: false,
    auditStale: true,
    auditHistoryCount: 1,
    exportNarrativeFilled: true,
  });
  check(
    'Given verify/reopen and stale verified state When sections drop below 100% Then verified reopens while owner marked-done persists',
    verifyIncompleteError.includes('50%') &&
      verified100.taskOverrides.sections?.status === 'verified' &&
      verifiedStale.find((t) => t.id === 'sections')?.status === 'open' &&
      verifiedStale.find((t) => t.id === 'budget')?.status === 'marked-done' &&
      reopened.taskOverrides.sections === undefined &&
      reopened.activityLog[0].message.includes('Reopened to-do')
  );

  // Store-level authoritative RBAC enforcement against spoofed caller roles
  useWorkspaceStore.setState({ hydrated: true });
  useWorkspaceStore.getState().setProjectRole('project-1', 'editor');
  let storeSpoofErr = '';
  try {
    useProgressStore.getState().markTaskDone('slot:project-1:1', {
      taskId: 'budget',
      taskTitle: 'Complete budget sheet',
      autoCompletionPct: 50,
      actor: 'Spoofed Editor',
      role: 'owner',
    });
  } catch (e) {
    storeSpoofErr = e instanceof Error ? e.message : String(e);
  }
  useWorkspaceStore.getState().setProjectRole('project-1', 'viewer');
  let viewerExportErr = '';
  try {
    useProgressStore
      .getState()
      .recordExportDownload('slot:project-1:1', 'txt', 'cleanwater-1.txt', 'Viewer User');
  } catch (e) {
    viewerExportErr = e instanceof Error ? e.message : String(e);
  }
  useWorkspaceStore.getState().setProjectRole('project-1', 'owner');
  check(
    'Given store-level RBAC When caller spoofs role or viewer logs export Then authoritative project role rejects write',
    storeSpoofErr.includes('Owner or Reviewer') && viewerExportErr.includes('cannot record export')
  );

  const validMap: Record<string, WorkSlotProgressRecord> = {
    'slot:project-1:1': reopened,
  };
  check(
    'Given valid and corrupt progress maps When checked with type guard Then only matching slot keys pass',
    isProgressRecordMap(validMap) &&
      !isProgressRecordMap({ 'slot:project-1:1': { ...reopened, slotKey: 'wrong-key' } })
  );

  const backing = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence('grantum.progress.v1', storage, isProgressRecordMap);
  let restored: Record<string, WorkSlotProgressRecord> = {};
  await persistence.hydrate((next) => {
    restored = next;
  });
  let status = '';
  persistence.save(validMap, (next) => {
    status = next;
  });
  await persistence.flush();

  const reload = createDevicePersistence('grantum.progress.v1', storage, isProgressRecordMap);
  await reload.hydrate((next) => {
    restored = next;
  });
  check(
    'Given saved progress map When persisted and reloaded Then workplan overrides and activity log survive',
    status === 'device-saved' &&
      restored['slot:project-1:1']?.taskOverrides.budget?.status === 'marked-done' &&
      restored['slot:project-1:1']?.activityLog.length === 4
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
