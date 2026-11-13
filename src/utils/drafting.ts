import type {
  OutputKind,
  PitchSlide,
  ProjectKind,
  RequirementMapping,
  WorkSlotAuditSummary,
} from '../types/workspace';

export interface DraftSection {
  id: string;
  title: string;
  text: string;
  evidence: string;
}
export interface DraftVersion {
  id: string;
  createdAt: string;
  summary: string;
  author: string;
  sections: DraftSection[];
  outputs: OutputKind[];
}
export interface DraftWorkbench {
  kind: ProjectKind;
  outputs: OutputKind[];
  sections: DraftSection[];
  pitchSlides?: PitchSlide[];
  requirementMappings?: RequirementMapping[];
  versions: DraftVersion[];
  submissions: {
    id: string;
    recordedAt: string;
    receipt: string;
    destination: string;
    version: DraftVersion;
  }[];
}
export const templates: Record<ProjectKind, readonly string[]> = {
  grant: ['Project summary', 'Objectives', 'Delivery plan', 'Budget'],
  startup: ['Problem', 'Solution', 'Market', 'Business model'],
  social: ['Community need', 'Beneficiaries', 'Activities', 'Impact'],
  invention: ['Problem', 'Novelty', 'Technical approach', 'Validation'],
  other: ['Overview', 'Goals', 'Plan', 'Resources'],
};
export const DEFAULT_PITCH_SLIDES: readonly PitchSlide[] = [
  { id: 'slide-1', title: '1. Mission & Urgency', bulletPoints: '' },
  { id: 'slide-2', title: '2. Solution & Technical Edge', bulletPoints: '' },
  { id: 'slide-3', title: '3. Measurable Impact & Budget', bulletPoints: '' },
];
export const emptyWorkbench = (): DraftWorkbench => ({
  kind: 'grant',
  outputs: ['application'],
  sections: [],
  pitchSlides: DEFAULT_PITCH_SLIDES.map((s) => ({ ...s })),
  requirementMappings: [],
  versions: [],
  submissions: [],
});
export function applyTemplate(
  work: DraftWorkbench,
  kind: ProjectKind,
  outputs: OutputKind[]
): DraftWorkbench {
  if (!outputs.length) throw new Error('Choose at least one output');
  const titles = [
    ...templates[kind],
    ...(outputs.includes('pitch-deck') ? ['Pitch outline'] : []),
    ...(outputs.includes('document') ? ['Supporting documents'] : []),
  ];
  const additions = titles.filter(
    (title) => !work.sections.some((s) => s.title.toLowerCase() === title.toLowerCase())
  );
  const existingSlides = work.pitchSlides?.length
    ? work.pitchSlides
    : DEFAULT_PITCH_SLIDES.map((s) => ({ ...s }));
  return {
    ...work,
    kind,
    outputs: [...outputs],
    pitchSlides: existingSlides,
    sections: [
      ...work.sections,
      ...additions.map((title) => ({ id: `template:${title}`, title, text: '', evidence: '' })),
    ],
  };
}
export function validSource(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}
export function syncGrantRequirements(
  work: DraftWorkbench,
  requirements: readonly string[],
  sourceUrl: string
): DraftWorkbench {
  if (sourceUrl && !validSource(sourceUrl)) throw new Error('Reference URL must use http or https');
  const cleanReqs = requirements.map((r) => r.trim()).filter(Boolean);
  const newSections = [...work.sections];
  const newMappings = [...(work.requirementMappings ?? [])];

  for (const req of cleanReqs) {
    let section = newSections.find((s) => s.title.toLowerCase() === req.toLowerCase());
    if (!section) {
      section = {
        id: `track:${req.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: req,
        text: '',
        evidence: sourceUrl,
      };
      newSections.push(section);
    }
    if (!newMappings.some((m) => m.requirement.toLowerCase() === req.toLowerCase())) {
      newMappings.push({
        id: `map:${section.id}`,
        requirement: req,
        sourceUrl,
        sectionId: section.id,
        evidenceUrl: section.evidence || sourceUrl,
        owner: 'Lead Author',
        reviewStatus: 'drafting',
      });
    }
  }

  return {
    ...work,
    sections: newSections,
    requirementMappings: newMappings,
  };
}
export function computeLineDiff(
  savedText: string,
  currentText: string
): { type: 'same' | 'added' | 'removed'; line: string }[] {
  const oldLines = savedText ? savedText.split('\n') : [];
  const newLines = currentText ? currentText.split('\n') : [];
  const result: { type: 'same' | 'added' | 'removed'; line: string }[] = [];
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  for (const line of oldLines) {
    if (!newSet.has(line)) result.push({ type: 'removed', line });
  }
  for (const line of newLines) {
    if (oldSet.has(line)) result.push({ type: 'same', line });
    else result.push({ type: 'added', line });
  }
  return result;
}
export function saveVersion(
  work: DraftWorkbench,
  id: string,
  createdAt: string,
  summary: string,
  author = 'You (this session)'
): DraftWorkbench {
  if (!summary.trim()) throw new Error('Describe the change');
  if (work.versions.some((version) => version.id === id)) throw new Error('Version already exists');
  if (work.sections.some((section) => section.evidence && !validSource(section.evidence)))
    throw new Error('Evidence links must use http or https');
  const version: DraftVersion = {
    id,
    createdAt,
    summary: summary.trim(),
    author,
    sections: work.sections.map((s) => ({ ...s })),
    outputs: [...work.outputs],
  };
  return { ...work, versions: [...work.versions, version] };
}
export function restoreVersion(
  work: DraftWorkbench,
  id: string,
  newId: string,
  createdAt: string
): DraftWorkbench {
  const version = work.versions.find((item) => item.id === id);
  if (!version) throw new Error('Version not found');
  // Keep current work in history before restoring, so restore never silently discards edits.
  const preserved = saveVersion(work, newId, createdAt, 'Before restoring ' + version.summary);
  return {
    ...preserved,
    sections: version.sections.map((s) => ({ ...s })),
    outputs: [...version.outputs],
  };
}
export function recordSubmission(
  work: DraftWorkbench,
  id: string,
  recordedAt: string,
  receipt: string,
  destination: string
): DraftWorkbench {
  if (!receipt.trim() || !validSource(destination))
    throw new Error('Enter a receipt reference and official http(s) destination');
  if (!work.sections.length || work.sections.some((s) => !s.text.trim()))
    throw new Error('Complete each section before recording submission');
  const saved = saveVersion(work, id, recordedAt, 'Submission snapshot');
  const version = saved.versions[saved.versions.length - 1];
  return {
    ...saved,
    submissions: [
      ...saved.submissions,
      { id, recordedAt, receipt: receipt.trim(), destination, version },
    ],
  };
}
export const bundleText = (work: DraftWorkbench) =>
  work.sections
    .map((s) => `${s.title}\n${s.text}${s.evidence ? '\nSource: ' + s.evidence : ''}`)
    .join('\n\n');

export function fullArtifactBundleText(
  work: DraftWorkbench,
  projectName = 'Active Project',
  profileRevisionId = 'latest'
): string {
  const parts: string[] = [
    `# Project Profile: ${projectName} (Revision: ${profileRevisionId})`,
    `Requested Outputs: ${work.outputs.join(', ')}`,
  ];
  const narrative = bundleText(work);
  if (narrative.trim()) {
    parts.push(`## Application Narrative\n${narrative}`);
  }
  if (work.outputs.includes('pitch-deck') && work.pitchSlides?.length) {
    const filledSlides = work.pitchSlides.filter((s) => s.bulletPoints.trim());
    if (filledSlides.length) {
      parts.push(
        `## Pitch Deck Outline\n` +
          filledSlides.map((s) => `### ${s.title}\n${s.bulletPoints.trim()}`).join('\n\n')
      );
    }
  }
  if (work.requirementMappings?.length) {
    parts.push(
      `## Requirement-to-Evidence Compliance Annex\n` +
        work.requirementMappings
          .map(
            (m) =>
              `- [${m.reviewStatus.toUpperCase()}] ${m.requirement} (Owner: ${m.owner} | Source: ${m.sourceUrl})`
          )
          .join('\n')
    );
  }
  return parts.join('\n\n');
}

export function evaluateWorkSlotAudit(work: DraftWorkbench, syncLag: number): WorkSlotAuditSummary {
  const totalSections = work.sections.length;
  const filledSections = work.sections.filter((s) => s.text.trim().length > 0).length;
  const linkedSections = work.sections.filter(
    (s) => s.text.trim().length > 0 && validSource(s.evidence)
  ).length;
  const unlinkedSections = Math.max(0, totalSections - linkedSections);
  const mappings = work.requirementMappings ?? [];
  const totalRequirements = mappings.length;
  const approvedRequirements = mappings.filter((m) => m.reviewStatus === 'approved').length;
  const pendingRequirements = Math.max(0, totalRequirements - approvedRequirements);
  const readyForHandoff =
    totalSections > 0 &&
    filledSections === totalSections &&
    unlinkedSections === 0 &&
    pendingRequirements === 0 &&
    syncLag === 0;
  return {
    totalSections,
    filledSections,
    linkedSections,
    unlinkedSections,
    totalRequirements,
    approvedRequirements,
    pendingRequirements,
    syncLag,
    readyForHandoff,
  };
}

export interface TextSuggestion {
  sectionId: string;
  original: string;
  proposed: string;
  sources: string[];
}
export function buildSectionSuggestion(
  section: DraftSection,
  projectName: string,
  referenceUrl: string
): TextSuggestion {
  const baseText = section.text.trim();
  const source = validSource(section.evidence)
    ? section.evidence
    : validSource(referenceUrl)
      ? referenceUrl
      : '';
  const proposed = baseText
    ? `${baseText}\n\nReview note: check this section against the ${projectName} project profile.`
    : `Describe ${section.title} for ${projectName}. Add supporting facts and review any references before submission.`;
  return {
    sectionId: section.id,
    original: section.text,
    proposed,
    sources: source ? [source] : [],
  };
}
export function acceptSuggestion(
  work: DraftWorkbench,
  suggestion: TextSuggestion,
  id: string,
  time: string
): DraftWorkbench {
  const section = work.sections.find((s) => s.id === suggestion.sectionId);
  if (!section || section.text !== suggestion.original)
    throw new Error('The section changed. Review a fresh suggestion.');
  if (suggestion.sources.some((source) => !validSource(source)))
    throw new Error('A suggestion needs valid source links');
  const saved = saveVersion(work, id, time, 'Before accepting suggestion');
  return {
    ...saved,
    sections: saved.sections.map((s) =>
      s.id === section.id ? { ...s, text: suggestion.proposed } : s
    ),
  };
}
