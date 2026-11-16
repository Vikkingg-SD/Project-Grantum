export type MilestoneStatus = 'Pending' | 'Prepared' | 'Verified';
export type ApplicationOutcomeStatus = 'in-progress' | 'submitted' | 'awarded' | 'declined';

export interface ComplianceMilestone {
  id: string;
  title: string;
  deliverable: string;
  dueDate: string;
  status: MilestoneStatus;
}

export interface WorkSlotMilestoneRecord {
  slotKey: string;
  outcome: ApplicationOutcomeStatus;
  submittedDate: string;
  expectedResultDate: string;
  nextReportDate: string;
  milestones: ComplianceMilestone[];
  updatedAt: string;
}

const VALID_MILESTONE_STATUSES: ReadonlySet<MilestoneStatus> = new Set([
  'Pending',
  'Prepared',
  'Verified',
]);
const VALID_OUTCOMES: ReadonlySet<ApplicationOutcomeStatus> = new Set([
  'in-progress',
  'submitted',
  'awarded',
  'declined',
]);

export function isValidIsoDateInput(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed;
}

export function buildDefaultMilestoneRecord(
  slotKey: string,
  submittedDate = '2026-11-10',
  nextReportDate = '2026-12-15'
): WorkSlotMilestoneRecord {
  return {
    slotKey,
    outcome: 'submitted',
    submittedDate: isValidIsoDateInput(submittedDate) ? submittedDate : '2026-11-10',
    expectedResultDate: '2026-12-05',
    nextReportDate: isValidIsoDateInput(nextReportDate) ? nextReportDate : '2026-12-15',
    milestones: [
      {
        id: 'ms-1',
        title: '1. Financial Expenditure & Co-Funding Report',
        deliverable: 'General ledger drawdowns + utility co-funding match receipts',
        dueDate: '2026-12-01',
        status: 'Prepared',
      },
      {
        id: 'ms-2',
        title: '2. Technical Milestone & Telemetry Deliverable',
        deliverable: 'Deployment verification log and sensor calibration annex',
        dueDate: '2026-12-15',
        status: 'Pending',
      },
      {
        id: 'ms-3',
        title: '3. Beneficiary Impact & Audit Verification',
        deliverable: 'Quarterly service coverage metrics and signed compliance attestation',
        dueDate: '2027-01-15',
        status: 'Pending',
      },
    ],
    updatedAt: '',
  };
}

export function setMilestoneItemStatus(
  record: WorkSlotMilestoneRecord,
  milestoneId: string,
  status: MilestoneStatus,
  nowIso = new Date().toISOString()
): WorkSlotMilestoneRecord {
  return {
    ...record,
    milestones: record.milestones.map((item) =>
      item.id === milestoneId ? { ...item, status } : item
    ),
    updatedAt: nowIso,
  };
}

export function setWorkSlotMilestoneDates(
  record: WorkSlotMilestoneRecord,
  input: {
    outcome: ApplicationOutcomeStatus;
    submittedDate: string;
    expectedResultDate: string;
    nextReportDate: string;
  },
  nowIso = new Date().toISOString()
): WorkSlotMilestoneRecord {
  if (!VALID_OUTCOMES.has(input.outcome)) {
    throw new Error('Select a valid application outcome status.');
  }
  for (const [label, value] of [
    ['Submitted date', input.submittedDate],
    ['Expected result date', input.expectedResultDate],
    ['Next report date', input.nextReportDate],
  ] as const) {
    if (value.trim() && !isValidIsoDateInput(value)) {
      throw new Error(`${label} must use YYYY-MM-DD format.`);
    }
  }
  return {
    ...record,
    outcome: input.outcome,
    submittedDate: input.submittedDate.trim(),
    expectedResultDate: input.expectedResultDate.trim(),
    nextReportDate: input.nextReportDate.trim(),
    updatedAt: nowIso,
  };
}

export function summarizeSlotMilestones(record: WorkSlotMilestoneRecord) {
  const verifiedCount = record.milestones.filter((m) => m.status === 'Verified').length;
  const preparedCount = record.milestones.filter((m) => m.status === 'Prepared').length;
  const pendingCount = record.milestones.filter((m) => m.status === 'Pending').length;
  const totalCount = record.milestones.length;
  const nextReport = record.nextReportDate || 'Not set';
  return {
    verifiedCount,
    preparedCount,
    pendingCount,
    totalCount,
    summaryLine: `Outcome: ${record.outcome.toUpperCase()} \u00b7 Next report: ${nextReport} \u00b7 Verified milestones: ${verifiedCount}/${totalCount}`,
  };
}

export function isMilestoneRecordMap(
  value: unknown
): value is Record<string, WorkSlotMilestoneRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 200) return false;
  return entries.every(([key, item]) => {
    if (!item || typeof item !== 'object') return false;
    const rec = item as WorkSlotMilestoneRecord;
    return (
      typeof key === 'string' &&
      rec.slotKey === key &&
      VALID_OUTCOMES.has(rec.outcome) &&
      typeof rec.submittedDate === 'string' &&
      typeof rec.expectedResultDate === 'string' &&
      typeof rec.nextReportDate === 'string' &&
      typeof rec.updatedAt === 'string' &&
      Array.isArray(rec.milestones) &&
      rec.milestones.length <= 20 &&
      rec.milestones.every(
        (ms) =>
          ms &&
          typeof ms.id === 'string' &&
          typeof ms.title === 'string' &&
          typeof ms.deliverable === 'string' &&
          typeof ms.dueDate === 'string' &&
          VALID_MILESTONE_STATUSES.has(ms.status)
      )
    );
  });
}
