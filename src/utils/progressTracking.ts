import type { AwardRecord } from '@/types/api';
import type { GrantDetail } from '@/types/grant';
import type { ApplicationBundle, CoWorkRole } from '@/types/workspace';
import type { BudgetEvaluationSummary } from '@/utils/budget';
import { deadlineMetricColor, formatCalendarDate, reportUrgency } from '@/utils/presentation';

export type ProgressLifecycleStage =
  'drafting' | 'in-review' | 'ready' | 'submitted' | 'accepted' | 'rejected';

export type WorkplanTaskStatus = 'open' | 'verified' | 'marked-done';
export type WorkplanTargetTab = 'drafting' | 'audit' | 'export' | 'discovery';

export interface WorkplanTaskOverride {
  status: WorkplanTaskStatus;
  updatedAt: string;
  updatedBy: string;
  updatedByRole: CoWorkRole;
  autoPctAtUpdate?: number;
}

export interface SlotActivityEvent {
  id: string;
  timestamp: string;
  actor: string;
  agent: 'agent-1-narrative' | 'agent-2-deterministic' | 'system';
  message: string;
  status: 'passed' | 'failed' | 'running';
}

export interface WorkSlotProgressRecord {
  slotKey: string;
  taskOverrides: Record<string, WorkplanTaskOverride>;
  activityLog: SlotActivityEvent[];
  exportedFormats: ('txt' | 'md')[];
  updatedAt: string;
}

export interface DerivedWorkplanItem {
  id: string;
  title: string;
  detail: string;
  targetTab: WorkplanTargetTab;
  autoCompletionPct: number;
  status: WorkplanTaskStatus;
  override?: WorkplanTaskOverride;
}

export type ProgressBadgeVariant = 'verified' | 'pending' | 'failure' | 'neutral' | 'brand';

export interface DerivedApplicationProgress {
  stage: ProgressLifecycleStage;
  deadlineHeading: string;
  deadlinePrimaryValue: string;
  deadlineBadgeLabel: string;
  deadlineBadgeVariant: ProgressBadgeVariant;
  submissionStatusLabel: string;
  submissionStatusVariant: ProgressBadgeVariant;
  headerSubtitle: string;
  awardStatusValue: string;
  nextDeadlineCardLabel: string;
  nextDeadlineCardValue: string;
  keyDatesSummary: string;
  notificationsEmptyText: string;
  stageSummary: string;
  showWorkplan: boolean;
}

export const MAX_SLOT_ACTIVITY_EVENTS = 100;

const VALID_ROLES: ReadonlySet<CoWorkRole> = new Set(['owner', 'editor', 'reviewer', 'viewer']);
const VALID_EDIT_REVIEW_ROLES: ReadonlySet<CoWorkRole> = new Set(['owner', 'editor', 'reviewer']);
const VALID_TASK_STATUSES: ReadonlySet<WorkplanTaskStatus> = new Set([
  'open',
  'verified',
  'marked-done',
]);
const VALID_EVENT_STATUSES: ReadonlySet<SlotActivityEvent['status']> = new Set([
  'running',
  'passed',
  'failed',
]);
const VALID_EVENT_AGENTS: ReadonlySet<SlotActivityEvent['agent']> = new Set([
  'agent-1-narrative',
  'agent-2-deterministic',
  'system',
]);

/** Only Owner and Reviewer roles may manually mark an incomplete workplan task done. */
export function canRoleMarkWorkplanDone(role: CoWorkRole): boolean {
  return role === 'owner' || role === 'reviewer';
}

export function createEmptyProgressRecord(slotKey: string): WorkSlotProgressRecord {
  return {
    slotKey,
    taskOverrides: {},
    activityLog: [],
    exportedFormats: [],
    updatedAt: '',
  };
}

/** Converts a grant deadline string into a human countdown prefix ("28 days left", "Due today"). */
export function formatDeadlineCountdown(rawDeadline: string, nowMs: number): string {
  const trimmed = rawDeadline.trim();
  if (!trimmed) return 'Deadline pending';
  if (/^today$/i.test(trimmed)) return 'Due today';
  if (/^rolling$/i.test(trimmed)) return 'Rolling deadline';
  const rel = /^(-?\d+)\s*days?$/i.exec(trimmed);
  if (rel) {
    const days = Number(rel[1]);
    if (days < 0) return 'Deadline passed';
    if (days === 0) return 'Due today';
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const [year, month, day] = iso.slice(1).map(Number);
    const targetUtc = Date.UTC(year, month - 1, day);
    const today = new Date(nowMs);
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const diffDays = Math.round((targetUtc - todayUtc) / 86400000);
    if (diffDays < 0) return 'Deadline passed';
    if (diffDays === 0) return 'Due today';
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`;
  }
  return `${trimmed} left`;
}

export function deriveApplicationProgress(input: {
  grant: GrantDetail;
  application?: ApplicationBundle;
  awardRecord?: AwardRecord;
  nowMs: number;
}): DerivedApplicationProgress {
  const { grant, application, awardRecord, nowMs } = input;
  const countdown = formatDeadlineCountdown(grant.deadline, nowMs);
  const deadlineColor = deadlineMetricColor(grant.deadline, nowMs);
  const deadlineVariant: ProgressBadgeVariant = deadlineColor === 'main' ? 'brand' : deadlineColor;

  const isSubmitted = Boolean(
    application && (application.status === 'submitted' || application.submittedSnapshot !== null)
  );

  if (isSubmitted && awardRecord?.status === 'awarded') {
    const submittedRaw =
      application?.submittedSnapshot?.submittedAt ??
      awardRecord.submittedAt ??
      application?.updatedAt;
    const submittedText = submittedRaw ? formatCalendarDate(submittedRaw) : 'Date recorded';
    const nextReportDisplay = awardRecord.nextReportAt
      ? formatCalendarDate(awardRecord.nextReportAt, true)
      : 'Soon';
    const urgency = awardRecord.nextReportAt
      ? reportUrgency(awardRecord.nextReportAt, nowMs)
      : { label: 'Reporting schedule pending', variant: 'neutral' as const };
    const reportCountdown = awardRecord.nextReportAt
      ? formatDeadlineCountdown(awardRecord.nextReportAt.slice(0, 10), nowMs)
      : 'Accepted';
    const submissionStatusLabel =
      reportCountdown === 'Accepted'
        ? 'Accepted | Status - Accepted'
        : `${reportCountdown} | Status - Accepted`;

    return {
      stage: 'accepted',
      deadlineHeading: 'Next reporting date',
      deadlinePrimaryValue: nextReportDisplay,
      deadlineBadgeLabel: urgency.label,
      deadlineBadgeVariant: urgency.variant,
      submissionStatusLabel,
      submissionStatusVariant: 'verified',
      headerSubtitle: `${grant.funder} · Submitted ${submittedText}`,
      awardStatusValue: awardRecord.contractStatus?.trim() || 'Accepted',
      nextDeadlineCardLabel: 'Next report',
      nextDeadlineCardValue: awardRecord.nextReportAt
        ? formatCalendarDate(awardRecord.nextReportAt)
        : 'Soon',
      keyDatesSummary: `Submitted: ${submittedText} · Next report: ${
        awardRecord.nextReportAt ? formatCalendarDate(awardRecord.nextReportAt) : 'Soon'
      }`,
      notificationsEmptyText:
        'No live notifications connected. Next reporting date is read from the official award record.',
      stageSummary: 'Post-award reporting workplan generated from the active award schedule.',
      showWorkplan: true,
    };
  }

  if (isSubmitted && (awardRecord?.status === 'declined' || awardRecord?.status === 'rejected')) {
    const submittedRaw =
      application?.submittedSnapshot?.submittedAt ??
      awardRecord.submittedAt ??
      application?.updatedAt;
    const submittedText = submittedRaw ? formatCalendarDate(submittedRaw) : 'Date recorded';

    return {
      stage: 'rejected',
      deadlineHeading: 'Next deadline',
      deadlinePrimaryValue: 'Application closed',
      deadlineBadgeLabel: 'Closed · Status - Rejected',
      deadlineBadgeVariant: 'failure',
      submissionStatusLabel: 'Closed | Status - Rejected',
      submissionStatusVariant: 'failure',
      headerSubtitle: `${grant.funder} · Submitted ${submittedText}`,
      awardStatusValue: 'Rejected',
      nextDeadlineCardLabel: 'Next deadline',
      nextDeadlineCardValue: 'None',
      keyDatesSummary: `Opportunity window: ${grant.deadline} · Submitted: ${submittedText}`,
      notificationsEmptyText:
        'No live notifications connected. Official application decision: Rejected.',
      stageSummary: 'Official status is Rejected. No submission workplan tasks remain.',
      showWorkplan: false,
    };
  }

  if (isSubmitted) {
    const submittedRaw =
      application?.submittedSnapshot?.submittedAt ??
      awardRecord?.submittedAt ??
      application?.updatedAt;
    const submittedText = submittedRaw ? formatCalendarDate(submittedRaw) : 'Pending receipt date';

    return {
      stage: 'submitted',
      deadlineHeading: 'Next deadline',
      deadlinePrimaryValue: 'Awaiting official decision',
      deadlineBadgeLabel: `${countdown} · Under review`,
      deadlineBadgeVariant: 'pending',
      submissionStatusLabel: `${countdown} | Status - In review`,
      submissionStatusVariant: 'pending',
      headerSubtitle: `${grant.funder} · Submitted ${submittedText}`,
      awardStatusValue: 'Soon',
      nextDeadlineCardLabel: 'Next deadline',
      nextDeadlineCardValue: 'Soon',
      keyDatesSummary: `Opportunity deadline: ${grant.deadline} · Submitted: ${submittedText}`,
      notificationsEmptyText:
        'No live notifications connected. Official funder review is in progress.',
      stageSummary: 'Application submitted. Monitoring official review window.',
      showWorkplan: true,
    };
  }

  if (application?.status === 'review') {
    return {
      stage: 'in-review',
      deadlineHeading: 'Next deadline',
      deadlinePrimaryValue: `${countdown} · Application deadline`,
      deadlineBadgeLabel: `Application deadline (${grant.deadline})`,
      deadlineBadgeVariant: deadlineVariant,
      submissionStatusLabel: `${countdown} | Status - In review`,
      submissionStatusVariant: 'pending',
      headerSubtitle: `${grant.funder} · In review · Deadline: ${grant.deadline}`,
      awardStatusValue: 'Soon',
      nextDeadlineCardLabel: 'Next deadline',
      nextDeadlineCardValue: grant.deadline || 'Soon',
      keyDatesSummary: `Opportunity deadline: ${grant.deadline} · Stage: Team review`,
      notificationsEmptyText:
        'No live notifications connected. Application deadline comes from the opportunity listing.',
      stageSummary: 'Stage workplan generated for your active team review stage.',
      showWorkplan: true,
    };
  }

  if (application?.status === 'ready') {
    return {
      stage: 'ready',
      deadlineHeading: 'Next deadline',
      deadlinePrimaryValue: `${countdown} · Application deadline`,
      deadlineBadgeLabel: `Application deadline (${grant.deadline})`,
      deadlineBadgeVariant: deadlineVariant,
      submissionStatusLabel: `${countdown} | Status - Ready to submit`,
      submissionStatusVariant: 'pending',
      headerSubtitle: `${grant.funder} · Ready to submit · Deadline: ${grant.deadline}`,
      awardStatusValue: 'Soon',
      nextDeadlineCardLabel: 'Next deadline',
      nextDeadlineCardValue: grant.deadline || 'Soon',
      keyDatesSummary: `Opportunity deadline: ${grant.deadline} · Stage: Ready to submit`,
      notificationsEmptyText:
        'No live notifications connected. Application deadline comes from the opportunity listing.',
      stageSummary: 'Stage workplan generated to verify export and final submission readiness.',
      showWorkplan: true,
    };
  }

  return {
    stage: 'drafting',
    deadlineHeading: 'Next deadline',
    deadlinePrimaryValue: `${countdown} · Application deadline`,
    deadlineBadgeLabel: `Application deadline (${grant.deadline})`,
    deadlineBadgeVariant: deadlineVariant,
    submissionStatusLabel: `${countdown} | Status - Drafting`,
    submissionStatusVariant: 'brand',
    headerSubtitle: `${grant.funder} · Deadline: ${grant.deadline}`,
    awardStatusValue: 'Soon',
    nextDeadlineCardLabel: 'Next deadline',
    nextDeadlineCardValue: grant.deadline || 'Soon',
    keyDatesSummary: `Opportunity deadline: ${grant.deadline} · Stage: Drafting`,
    notificationsEmptyText:
      'No live notifications connected. Application deadline comes from the opportunity listing.',
    stageSummary:
      'Stage workplan generated from required sections, budget, audit, and export state.',
    showWorkplan: true,
  };
}

export function buildStageWorkplan(input: {
  stage: ProgressLifecycleStage;
  record: WorkSlotProgressRecord;
  filledSectionsCount: number;
  totalSectionsCount: number;
  missingSectionTitles: readonly string[];
  budgetSavedForSlot: boolean;
  budgetEvaluation: BudgetEvaluationSummary;
  auditPassed: boolean;
  auditStale: boolean;
  auditHistoryCount: number;
  exportNarrativeFilled: boolean;
  nextReportDateDisplay?: string;
}): DerivedWorkplanItem[] {
  const {
    stage,
    record,
    filledSectionsCount,
    totalSectionsCount,
    missingSectionTitles,
    budgetSavedForSlot,
    budgetEvaluation,
    auditPassed,
    auditStale,
    auditHistoryCount,
    exportNarrativeFilled,
    nextReportDateDisplay,
  } = input;

  if (stage === 'rejected') return [];

  const withOverride = (
    id: string,
    title: string,
    detail: string,
    targetTab: WorkplanTargetTab,
    autoCompletionPct: number
  ): DerivedWorkplanItem => {
    const override = record.taskOverrides[id];
    const effectiveStatus: WorkplanTaskStatus =
      override?.status === 'verified' && autoCompletionPct < 100
        ? 'open'
        : (override?.status ?? 'open');
    return {
      id,
      title,
      detail,
      targetTab,
      autoCompletionPct,
      status: effectiveStatus,
      override: effectiveStatus === 'open' ? undefined : override,
    };
  };

  if (stage === 'submitted') {
    return [
      withOverride(
        'funder-review',
        'Monitor official application decision',
        'Submission snapshot is locked. Check opportunity timelines while official evaluation is pending.',
        'discovery',
        50
      ),
    ];
  }

  if (stage === 'accepted') {
    const dueNote = nextReportDateDisplay
      ? `Prepare deliverables due by ${nextReportDateDisplay}.`
      : 'Prepare next scheduled report once the funder reporting date is published.';
    return [
      withOverride(
        'next-report',
        'Prepare scheduled post-award report',
        dueNote,
        'export',
        record.exportedFormats.length > 0 ? 50 : 0
      ),
    ];
  }

  const sectionsPct =
    totalSectionsCount > 0 ? Math.round((filledSectionsCount / totalSectionsCount) * 100) : 0;
  const sectionsDetail =
    totalSectionsCount === 0
      ? 'Add required sections in Drafting workspace.'
      : missingSectionTitles.length === 0
        ? `All ${totalSectionsCount}/${totalSectionsCount} required sections contain authored text.`
        : `${filledSectionsCount}/${totalSectionsCount} filled · Remaining: ${missingSectionTitles.slice(0, 3).join(', ')}`;

  const budgetHealthy =
    budgetEvaluation.lines.length > 0 &&
    budgetEvaluation.unresolvedCount === 0 &&
    !budgetEvaluation.capExceeded &&
    !budgetEvaluation.overheadExceeded &&
    budgetEvaluation.configIssues.length === 0;
  const budgetPct =
    budgetSavedForSlot && budgetHealthy ? 100 : budgetEvaluation.lines.length > 0 ? 50 : 0;
  const budgetDetail = !budgetSavedForSlot
    ? 'Starter budget not yet confirmed for this application — review and save in Audit.'
    : budgetHealthy
      ? `${budgetEvaluation.lines.length} line item(s) validated within funding caps.`
      : budgetEvaluation.capExceeded || budgetEvaluation.overheadExceeded
        ? 'Budget cap or overhead limit exceeded — review in Audit.'
        : budgetEvaluation.lines.length === 0
          ? 'No budget line items entered yet.'
          : 'Resolve incomplete budget lines or cap settings.';

  const auditPct = auditPassed && !auditStale ? 100 : auditHistoryCount > 0 ? 50 : 0;
  const auditDetail =
    auditPassed && !auditStale
      ? 'Latest application check passed on current sections and Export text.'
      : auditStale && auditHistoryCount > 0
        ? 'Draft edits occurred after the last audit — re-run Audit.'
        : 'Run application audit check before exporting.';

  const hasExported = record.exportedFormats.length > 0;
  const exportPct = hasExported && exportNarrativeFilled ? 100 : exportNarrativeFilled ? 50 : 0;
  const exportDetail =
    hasExported && exportNarrativeFilled
      ? `Exported package (.${record.exportedFormats.join(', .')}) for this application.`
      : exportNarrativeFilled
        ? 'Narrative loaded in Export; download a .txt or .md package when ready.'
        : 'Open Export to assemble and download your application bundle.';

  return [
    withOverride('sections', 'Complete required sections', sectionsDetail, 'drafting', sectionsPct),
    withOverride('budget', 'Complete budget sheet', budgetDetail, 'audit', budgetPct),
    withOverride('audit', 'Run final audit check', auditDetail, 'audit', auditPct),
    withOverride(
      'export',
      'Prepare & export application package',
      exportDetail,
      'export',
      exportPct
    ),
  ];
}

export function appendSlotActivity(
  record: WorkSlotProgressRecord,
  input: {
    id: string;
    actor: string;
    message: string;
    agent?: SlotActivityEvent['agent'];
    status?: SlotActivityEvent['status'];
    timestamp?: string;
  }
): WorkSlotProgressRecord {
  const cleanMessage = input.message.trim();
  if (!cleanMessage) return record;
  const ts = input.timestamp ?? new Date().toISOString();
  const nextEvent: SlotActivityEvent = {
    id: input.id,
    timestamp: ts,
    actor: input.actor.trim() || 'User',
    agent: input.agent ?? 'system',
    message: cleanMessage,
    status: input.status ?? 'passed',
  };
  return {
    ...record,
    activityLog: [nextEvent, ...record.activityLog].slice(0, MAX_SLOT_ACTIVITY_EVENTS),
    updatedAt: ts,
  };
}

export function recordSlotExportFormat(
  record: WorkSlotProgressRecord,
  input: {
    id: string;
    format: 'txt' | 'md';
    filename: string;
    actor: string;
    timestamp?: string;
  }
): WorkSlotProgressRecord {
  const ts = input.timestamp ?? new Date().toISOString();
  const nextFormats = record.exportedFormats.includes(input.format)
    ? record.exportedFormats
    : [...record.exportedFormats, input.format];
  const withFormat: WorkSlotProgressRecord = {
    ...record,
    exportedFormats: nextFormats,
    updatedAt: ts,
  };
  return appendSlotActivity(withFormat, {
    id: input.id,
    actor: input.actor,
    agent: 'system',
    status: 'passed',
    timestamp: ts,
    message: `Exported application as .${input.format} (${input.filename})`,
  });
}

export function verifyWorkplanTask(
  record: WorkSlotProgressRecord,
  input: {
    id: string;
    taskId: string;
    taskTitle: string;
    autoCompletionPct: number;
    actor: string;
    role: CoWorkRole;
    timestamp?: string;
  }
): WorkSlotProgressRecord {
  if (!VALID_EDIT_REVIEW_ROLES.has(input.role)) {
    throw new Error('Only Owner, Editor, or Reviewer roles can verify workplan items.');
  }
  if (input.autoCompletionPct < 100) {
    throw new Error(
      `"${input.taskTitle}" is at ${input.autoCompletionPct}%. Continue work to reach 100% or use Owner/Reviewer Mark done.`
    );
  }
  const ts = input.timestamp ?? new Date().toISOString();
  const nextRecord: WorkSlotProgressRecord = {
    ...record,
    taskOverrides: {
      ...record.taskOverrides,
      [input.taskId]: {
        status: 'verified',
        updatedAt: ts,
        updatedBy: input.actor.trim() || 'User',
        updatedByRole: input.role,
        autoPctAtUpdate: input.autoCompletionPct,
      },
    },
    updatedAt: ts,
  };
  return appendSlotActivity(nextRecord, {
    id: input.id,
    actor: input.actor,
    agent: 'agent-2-deterministic',
    status: 'passed',
    timestamp: ts,
    message: `Verified to-do: ${input.taskTitle} (100%)`,
  });
}

export function markWorkplanTaskDone(
  record: WorkSlotProgressRecord,
  input: {
    id: string;
    taskId: string;
    taskTitle: string;
    autoCompletionPct: number;
    actor: string;
    role: CoWorkRole;
    timestamp?: string;
  }
): WorkSlotProgressRecord {
  if (!canRoleMarkWorkplanDone(input.role)) {
    throw new Error('Only Owner or Reviewer roles can mark incomplete workplan items done.');
  }
  const ts = input.timestamp ?? new Date().toISOString();
  const nextRecord: WorkSlotProgressRecord = {
    ...record,
    taskOverrides: {
      ...record.taskOverrides,
      [input.taskId]: {
        status: 'marked-done',
        updatedAt: ts,
        updatedBy: input.actor.trim() || 'Owner',
        updatedByRole: input.role,
        autoPctAtUpdate: input.autoCompletionPct,
      },
    },
    updatedAt: ts,
  };
  return appendSlotActivity(nextRecord, {
    id: input.id,
    actor: input.actor,
    agent: 'system',
    status: 'passed',
    timestamp: ts,
    message: `Closed to-do: ${input.taskTitle} (marked done at ${input.autoCompletionPct}% by ${input.role})`,
  });
}

export function reopenWorkplanTask(
  record: WorkSlotProgressRecord,
  input: {
    id: string;
    taskId: string;
    taskTitle: string;
    actor: string;
    role: CoWorkRole;
    timestamp?: string;
  }
): WorkSlotProgressRecord {
  if (!VALID_EDIT_REVIEW_ROLES.has(input.role)) {
    throw new Error('Only Owner, Editor, or Reviewer roles can reopen workplan items.');
  }
  const ts = input.timestamp ?? new Date().toISOString();
  const nextOverrides = { ...record.taskOverrides };
  delete nextOverrides[input.taskId];
  const nextRecord: WorkSlotProgressRecord = {
    ...record,
    taskOverrides: nextOverrides,
    updatedAt: ts,
  };
  return appendSlotActivity(nextRecord, {
    id: input.id,
    actor: input.actor,
    agent: 'system',
    status: 'running',
    timestamp: ts,
    message: `Reopened to-do: ${input.taskTitle}`,
  });
}

export function isProgressRecordMap(
  value: unknown
): value is Record<string, WorkSlotProgressRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 200) return false;
  return entries.every(([key, item]) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const rec = item as WorkSlotProgressRecord;
    if (
      typeof key !== 'string' ||
      !key.trim() ||
      rec.slotKey !== key ||
      typeof rec.updatedAt !== 'string' ||
      !rec.taskOverrides ||
      typeof rec.taskOverrides !== 'object' ||
      Array.isArray(rec.taskOverrides) ||
      !Array.isArray(rec.activityLog) ||
      rec.activityLog.length > MAX_SLOT_ACTIVITY_EVENTS ||
      !Array.isArray(rec.exportedFormats) ||
      rec.exportedFormats.length > 2 ||
      new Set(rec.exportedFormats).size !== rec.exportedFormats.length ||
      !rec.exportedFormats.every((fmt) => fmt === 'txt' || fmt === 'md')
    ) {
      return false;
    }
    const validOverrides = Object.values(rec.taskOverrides).every(
      (ov) =>
        ov &&
        typeof ov === 'object' &&
        !Array.isArray(ov) &&
        VALID_TASK_STATUSES.has(ov.status) &&
        typeof ov.updatedAt === 'string' &&
        typeof ov.updatedBy === 'string' &&
        VALID_ROLES.has(ov.updatedByRole) &&
        (ov.autoPctAtUpdate === undefined ||
          (typeof ov.autoPctAtUpdate === 'number' &&
            Number.isFinite(ov.autoPctAtUpdate) &&
            ov.autoPctAtUpdate >= 0 &&
            ov.autoPctAtUpdate <= 100))
    );
    const validEvents = rec.activityLog.every(
      (ev) =>
        ev &&
        typeof ev === 'object' &&
        !Array.isArray(ev) &&
        typeof ev.id === 'string' &&
        typeof ev.timestamp === 'string' &&
        typeof ev.actor === 'string' &&
        VALID_EVENT_AGENTS.has(ev.agent) &&
        typeof ev.message === 'string' &&
        VALID_EVENT_STATUSES.has(ev.status)
    );
    return validOverrides && validEvents;
  });
}
