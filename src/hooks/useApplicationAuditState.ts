import { useMemo } from 'react';
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
  text: string;
  description: string;
  isFixed: boolean;
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
    const completionPct = computeSectionCompletionPct(title, {
      workbenchSection,
      isCatalogComplete: completedSet.has(title),
    });
    const resolved = resolveSectionDescription(title, workbenchSection?.description);
    return {
      title,
      completionPct,
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
  scanStatus?: AuditScan['status'];
  running: boolean;
}) {
  const rawRequired = input.requiredSections;
  const rawCompleted = input.completedSections;
  const { work, exportBody, contentRevision, auditedSignature, scanStatus, running } = input;

  const sectionItems = useMemo(
    () => buildActiveSectionItems(rawRequired ?? [], rawCompleted ?? [], work),
    [rawCompleted, rawRequired, work]
  );

  const activeSections = useMemo(() => sectionItems.map((item) => item.title), [sectionItems]);

  const currentSignature = useMemo(
    () =>
      computeApplicationAuditSignature({
        requiredSections: activeSections,
        completedSections: rawCompleted ?? [],
        workSections: work.sections,
        kind: work.kind,
        outputs: work.outputs,
        exportBody,
        contentRevision,
      }),
    [
      activeSections,
      contentRevision,
      exportBody,
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
  const confidenceScore = sectionItems.length
    ? Math.round((completeSections.length / sectionItems.length) * 100)
    : 0;

  const hadPriorPassedAudit = scanStatus === 'passed' || Boolean(auditedSignature);
  const auditStale = Boolean(
    hadPriorPassedAudit &&
    (auditedSignature
      ? auditedSignature !== currentSignature
      : contentRevision > 0 ||
        Boolean(work.templateApplied) ||
        Boolean(work.removedCatalogSections?.length))
  );
  const failed = !running && (scanStatus === 'failed' || incompleteSections.length > 0);
  const passed = !running && !failed && !auditStale && hadPriorPassedAudit;
  const unlocked =
    sectionItems.length > 0 &&
    incompleteSections.length === 0 &&
    isExportUnlocked(confidenceScore) &&
    !auditStale;

  return {
    activeSections,
    sectionItems,
    completeSections,
    incompleteSections,
    confidenceScore,
    currentSignature,
    auditStale,
    failed,
    passed,
    unlocked,
  };
}
