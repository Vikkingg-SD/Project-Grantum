import type { OutputKind, ProjectKind } from '../types/workspace';

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
export const emptyWorkbench = (): DraftWorkbench => ({
  kind: 'grant',
  outputs: ['application'],
  sections: [],
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
  return {
    ...work,
    kind,
    outputs: [...outputs],
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
export function saveVersion(
  work: DraftWorkbench,
  id: string,
  createdAt: string,
  summary: string
): DraftWorkbench {
  if (!summary.trim()) throw new Error('Describe the change');
  if (work.versions.some((version) => version.id === id)) throw new Error('Version already exists');
  if (work.sections.some((section) => section.evidence && !validSource(section.evidence)))
    throw new Error('Evidence links must use http or https');
  const version: DraftVersion = {
    id,
    createdAt,
    summary: summary.trim(),
    author: 'You (this session)',
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

export interface TextSuggestion {
  sectionId: string;
  original: string;
  proposed: string;
  sources: string[];
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
  if (!suggestion.sources.length || suggestion.sources.some((source) => !validSource(source)))
    throw new Error('A suggestion needs valid source links');
  const saved = saveVersion(work, id, time, 'Before accepting suggestion');
  return {
    ...saved,
    sections: saved.sections.map((s) =>
      s.id === section.id ? { ...s, text: suggestion.proposed } : s
    ),
  };
}
