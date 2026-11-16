export interface BudgetLineItem {
  id: string;
  description: string;
  quantity: string;
  unitRate: string;
}

export interface WorkSlotBudgetRecord {
  slotKey: string;
  fundingCap: string;
  overheadPctCap: string;
  overheadAmount: string;
  items: BudgetLineItem[];
  updatedAt: string;
}

export interface EvaluatedBudgetLine {
  id: string;
  description: string;
  quantity: number | null;
  unitRate: number | null;
  lineTotal: number | null;
  status: 'valid' | 'unresolved';
  issue?: string;
}

export interface BudgetEvaluationSummary {
  lines: EvaluatedBudgetLine[];
  directSubtotal: number;
  overheadAmount: number | null;
  fundingCap: number | null;
  overheadPctCap: number | null;
  grandTotal: number;
  unresolvedCount: number;
  capExceeded: boolean;
  overheadExceeded: boolean;
  overheadPctActual: number | null;
  statusLabel: string;
  statusVariant: 'verified' | 'pending' | 'failure' | 'neutral';
  configIssues: string[];
}

export function parseNonNegativeAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, '');
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function parsePositiveQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(/[,\s]/g, '');
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildDefaultBudgetRecord(slotKey: string): WorkSlotBudgetRecord {
  return {
    slotKey,
    fundingCap: '250000',
    overheadPctCap: '15',
    overheadAmount: '20000',
    items: [
      {
        id: 'bgt-1',
        description: 'Edge-AI hydrophone sensor array',
        quantity: '12',
        unitRate: '14500',
      },
      {
        id: 'bgt-2',
        description: 'Field telemetry integration & calibration',
        quantity: '1',
        unitRate: '46000',
      },
    ],
    updatedAt: '',
  };
}

export function evaluateWorkSlotBudget(record: WorkSlotBudgetRecord): BudgetEvaluationSummary {
  const lines: EvaluatedBudgetLine[] = record.items.map((item) => {
    const desc = item.description.trim();
    const qty = parsePositiveQuantity(item.quantity);
    const rate = parseNonNegativeAmount(item.unitRate);
    const issues: string[] = [];
    if (!desc) issues.push('Enter item description');
    if (qty === null) issues.push('Quantity must be > 0');
    if (rate === null) issues.push('Unit rate must be a non-negative number');
    if (issues.length > 0 || qty === null || rate === null) {
      return {
        id: item.id,
        description: desc || 'Untitled line item',
        quantity: qty,
        unitRate: rate,
        lineTotal: null,
        status: 'unresolved',
        issue: issues.join(' · '),
      };
    }
    return {
      id: item.id,
      description: desc,
      quantity: qty,
      unitRate: rate,
      lineTotal: Math.round(qty * rate * 100) / 100,
      status: 'valid',
    };
  });

  const directSubtotal =
    Math.round(lines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0) * 100) / 100;

  const configIssues: string[] = [];
  const capTrimmed = record.fundingCap.trim();
  const fundingCap = capTrimmed ? parseNonNegativeAmount(capTrimmed) : null;
  if (capTrimmed && fundingCap === null) {
    configIssues.push('Funding cap must be a valid non-negative number');
  }

  const pctTrimmed = record.overheadPctCap.trim();
  const overheadPctCap = pctTrimmed ? parseNonNegativeAmount(pctTrimmed) : null;
  if (pctTrimmed && overheadPctCap === null) {
    configIssues.push('Overhead cap (%) must be a valid non-negative number');
  }

  const ohTrimmed = record.overheadAmount.trim();
  const overheadAmount = ohTrimmed ? parseNonNegativeAmount(ohTrimmed) : 0;
  if (ohTrimmed && overheadAmount === null) {
    configIssues.push('Overhead amount must be a valid non-negative number');
  }

  const grandTotal = Math.round((directSubtotal + (overheadAmount ?? 0)) * 100) / 100;
  const unresolvedLines = lines.filter((line) => line.status === 'unresolved').length;
  const unresolvedCount = unresolvedLines + configIssues.length;

  const capExceeded = fundingCap !== null && grandTotal > fundingCap;
  const overheadPctActual =
    directSubtotal > 0 && overheadAmount !== null
      ? Math.round((overheadAmount / directSubtotal) * 1000) / 10
      : null;
  const overheadExceeded =
    overheadPctCap !== null &&
    overheadAmount !== null &&
    ((directSubtotal > 0 && (overheadAmount / directSubtotal) * 100 > overheadPctCap) ||
      (directSubtotal === 0 && overheadAmount > 0));

  let statusLabel = `Total ${formatUsd(grandTotal)}`;
  let statusVariant: BudgetEvaluationSummary['statusVariant'] = 'verified';
  if (capExceeded) {
    statusLabel = 'Funding cap exceeded';
    statusVariant = 'failure';
  } else if (overheadExceeded) {
    statusLabel = 'Overhead cap exceeded';
    statusVariant = 'failure';
  } else if (unresolvedCount > 0) {
    statusLabel = `${unresolvedCount} unresolved row(s)`;
    statusVariant = 'pending';
  } else if (fundingCap !== null) {
    statusLabel = `Within cap · ${formatUsd(grandTotal)} / ${formatUsd(fundingCap)}`;
    statusVariant = 'verified';
  } else {
    statusLabel = `Total ${formatUsd(grandTotal)} (no cap set)`;
    statusVariant = 'neutral';
  }

  return {
    lines,
    directSubtotal,
    overheadAmount,
    fundingCap,
    overheadPctCap,
    grandTotal,
    unresolvedCount,
    capExceeded,
    overheadExceeded,
    overheadPctActual,
    statusLabel,
    statusVariant,
    configIssues,
  };
}

export function addBudgetLineItem(
  record: WorkSlotBudgetRecord,
  input: { description: string; quantity: string; unitRate: string },
  nowIso = new Date().toISOString()
): WorkSlotBudgetRecord {
  const description = input.description.trim();
  if (!description) {
    throw new Error('Enter a line item description before adding.');
  }
  if (record.items.length >= 50) {
    throw new Error('Maximum of 50 budget line items per work slot reached.');
  }
  const nextId = `bgt-${Date.parse(nowIso) || record.items.length + 1}-${record.items.length + 1}`;
  return {
    ...record,
    items: [
      ...record.items,
      {
        id: nextId,
        description: description.slice(0, 160),
        quantity: input.quantity.trim(),
        unitRate: input.unitRate.trim(),
      },
    ],
    updatedAt: nowIso,
  };
}

export function updateBudgetLineItem(
  record: WorkSlotBudgetRecord,
  itemId: string,
  patch: Partial<Pick<BudgetLineItem, 'description' | 'quantity' | 'unitRate'>>,
  nowIso = new Date().toISOString()
): WorkSlotBudgetRecord {
  return {
    ...record,
    items: record.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    updatedAt: nowIso,
  };
}

export function removeBudgetLineItem(
  record: WorkSlotBudgetRecord,
  itemId: string,
  nowIso = new Date().toISOString()
): WorkSlotBudgetRecord {
  return {
    ...record,
    items: record.items.filter((item) => item.id !== itemId),
    updatedAt: nowIso,
  };
}

export function updateBudgetCaps(
  record: WorkSlotBudgetRecord,
  input: { fundingCap: string; overheadPctCap: string; overheadAmount: string },
  nowIso = new Date().toISOString()
): WorkSlotBudgetRecord {
  return {
    ...record,
    fundingCap: input.fundingCap.trim(),
    overheadPctCap: input.overheadPctCap.trim(),
    overheadAmount: input.overheadAmount.trim(),
    updatedAt: nowIso,
  };
}

export function isBudgetRecordMap(value: unknown): value is Record<string, WorkSlotBudgetRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 200) return false;
  return entries.every(([key, raw]) => {
    if (!raw || typeof raw !== 'object') return false;
    const rec = raw as WorkSlotBudgetRecord;
    return (
      typeof key === 'string' &&
      rec.slotKey === key &&
      typeof rec.fundingCap === 'string' &&
      typeof rec.overheadPctCap === 'string' &&
      typeof rec.overheadAmount === 'string' &&
      typeof rec.updatedAt === 'string' &&
      Array.isArray(rec.items) &&
      rec.items.length <= 50 &&
      rec.items.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.description === 'string' &&
          typeof item.quantity === 'string' &&
          typeof item.unitRate === 'string'
      )
    );
  });
}
