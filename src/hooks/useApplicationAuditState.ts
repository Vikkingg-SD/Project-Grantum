import { useMemo } from 'react';
import { ENV } from '@/config/env';
import type { AuditScan } from '@/types/api';
import type { DraftWorkbench } from '@/utils/drafting';
import { isExportUnlocked } from '@/utils/scoring';
import {
  computeApplicationAuditSignature,
  computeSectionCompletionPct,
  normalizeSectionTitle,
  resolveActiveRequiredSections,
  resolveSectionDescription,
} from '@/utils/sectionCatalog';

export interface ActiveSectionItem {
  title: string;
  completionPct: number;
  isFilled: boolean;
  text: string;
  description: string;
  isFixed: boolean;
}

function hasRemovedSectionSinceAudit(
  auditedSignature: string | null,
  activeSections: readonly string[]
): boolean {
  if (!auditedSignature) return false;
  try {
    const parsed = JSON.parse(auditedSignature) as { requiredSections?: unknown };
    if (!Array.isArray(parsed.requiredSections)) return false;
    const currentNorm = new Set(activeSections.map(normalizeSectionTitle));
    return parsed.requiredSections.some(
      (title) => typeof title === 'string' && !currentNorm.has(normalizeSectionTitle(title))
    );
  } catch {
    return false;
  }
}

export function buildActiveSectionItems(
  requiredSections: readonly string[],
  completedSections: readonly string[],
  work: DraftWorkbench
): ActiveSectionItem[] {
  const activeSections = resolveActiveRequiredSections(requiredSections, work);
  const completedSet = new Set(completedSections);
  const workByNorm = new Map(
    work.sections.map((section) => [normalizeSectionTitle(section.title), section])
  );
  return activeSections.map((title) => {
    const workbenchSection = workByNorm.get(normalizeSectionTitle(title));
    const isCatalogComplete = completedSet.has(title);
    const completionPct = computeSectionCompletionPct(title, {
      workbenchSection,
      isCatalogComplete,
    });
    const isFilled = Boolean(workbenchSection && workbenchSection.text.trim().length > 0);
    const resolved = resolveSectionDescription(title, workbenchSection?.description);
    return {
      title,
      completionPct,
      isFilled,
      text: workbenchSection?.text ?? '',
      description: resolved.description,
      isFixed: resolved.isFixed,
    };
  });
}

export function useApplicationAuditState(input: {
  requiredSections?: readonly string[];
  completedSections?: readonly string[];
  work: DraftWorkbench;
  exportBody: string;
  contentRevision: number;
  auditedSignature: string | null;
  profileRevisionId?: string;
  scanStatus?: AuditScan['status'];
  running: boolean;
}) {
  const rawRequired = input.requiredSections;
  const rawCompleted = input.completedSections;
  const {
    work,
    exportBody,
    contentRevision,
    auditedSignature,
    profileRevisionId,
    scanStatus,
    running,
  } = input;

  const sectionItems = useMemo(
    () => buildActiveSectionItems(rawRequired ?? [], rawCompleted ?? [], work),
    [rawCompleted, rawRequired, work]
  );

  const activeSections = useMemo(() => sectionItems.map((item) => item.title), [sectionItems]);

  const effectiveAuditedSignature = auditedSignature ?? work.auditedSignature ?? null;
  const auditHistory = work.auditHistory ?? [];

  const currentSignature = useMemo(
    () =>
      computeApplicationAuditSignature({
        requiredSections: activeSections,
        completedSections: rawCompleted ?? [],
        workSections: work.sections,
        kind: work.kind,
        outputs: work.outputs,
        exportBody,
        profileRevisionId,
      }),
    [
      activeSections,
      exportBody,
      profileRevisionId,
      rawCompleted,
      work.kind,
      work.outputs,
      work.sections,
    ]
  );

  const completeSections = useMemo(
    () => sectionItems.filter((item) => item.completionPct >= 100),
    [sectionItems]
  );
  const incompleteSections = useMemo(
    () => sectionItems.filter((item) => item.completionPct < 100),
    [sectionItems]
  );
  const filledSections = useMemo(
    () => sectionItems.filter((item) => item.isFilled),
    [sectionItems]
  );
  const unfilledSections = useMemo(
    () => sectionItems.filter((item) => !item.isFilled),
    [sectionItems]
  );
  const allSectionsFilled = sectionItems.length > 0 && unfilledSections.length === 0;
  const confidenceScore = sectionItems.length
    ? Math.round((completeSections.length / sectionItems.length) * 100)
    : 0;

  const hadPriorPassedAudit =
    Boolean(effectiveAuditedSignature) ||
    auditHistory.some((entry) => entry.status === 'passed') ||
    (ENV.DATA_SOURCE !== 'mock' && scanStatus === 'passed' && auditHistory.length === 0);
  const latestHistoryEntry = auditHistory[auditHistory.length - 1];
  const latestAuditFailedCurrent = Boolean(
    latestHistoryEntry &&
    latestHistoryEntry.status === 'failed' &&
    latestHistoryEntry.signature === currentSignature
  );
  const auditStale = Boolean(
    hadPriorPassedAudit &&
    (effectiveAuditedSignature
      ? effectiveAuditedSignature !== currentSignature
      : contentRevision > 0 ||
        Boolean(work.templateApplied) ||
        Boolean(work.removedCatalogSections?.length))
  );
  const sectionsRemovedSinceAudit = useMemo(
    () => auditStale && hasRemovedSectionSinceAudit(effectiveAuditedSignature, activeSections),
    [activeSections, auditStale, effectiveAuditedSignature]
  );
  const serverFailed = ENV.DATA_SOURCE !== 'mock' && scanStatus === 'failed';
  const failed =
    !running && (serverFailed || incompleteSections.length > 0 || sectionsRemovedSinceAudit);
  const passed = !running && !failed && !auditStale && hadPriorPassedAudit;
  const unlocked =
    !running &&
    !serverFailed &&
    sectionItems.length > 0 &&
    incompleteSections.length === 0 &&
    isExportUnlocked(confidenceScore) &&
    !auditStale;

  return {
    activeSections,
    sectionItems,
    completeSections,
    incompleteSections,
    filledSections,
    unfilledSections,
    allSectionsFilled,
    confidenceScore,
    currentSignature,
    auditStale,
    latestAuditFailedCurrent,
    failed,
    passed,
    unlocked,
    auditHistory,
  };
}
