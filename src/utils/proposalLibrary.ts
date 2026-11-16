export interface ReusableSectionEntry {
  id: string;
  title: string;
  text: string;
  evidence: string;
  projectId: string;
  projectName: string;
  grantId: string;
  tags: string[];
  savedAt: string;
}

export const DEFAULT_REUSABLE_SECTIONS: ReusableSectionEntry[] = [
  {
    id: 'lib-seed-1',
    title: 'Municipal Hydrophone Telemetry Architecture',
    text: 'Deploy low-power acoustic hydrophone arrays across 12 municipal water districts with automated edge-AI leak isolation.',
    evidence: 'https://cleanwater.example.org/spec',
    projectId: 'project-1',
    projectName: 'CleanWater AI Infrastructure',
    grantId: '1',
    tags: ['startup', 'infrastructure'],
    savedAt: '2026-11-12T10:00:00.000Z',
  },
  {
    id: 'lib-seed-2',
    title: 'Rural Clinic Cold-Chain & Training Protocol',
    text: 'Equip 45 rural clinics with solar diagnostic micro-labs and accredited telehealth practitioner training.',
    evidence: 'https://stemlab.example.org/protocol',
    projectId: 'project-2',
    projectName: 'Community Health & STEM Lab',
    grantId: '2',
    tags: ['social', 'health'],
    savedAt: '2026-11-12T11:00:00.000Z',
  },
];

export function saveReusableSection(
  entries: readonly ReusableSectionEntry[],
  input: {
    title: string;
    text: string;
    evidence?: string;
    projectId: string;
    projectName: string;
    grantId: string;
    tags?: string[];
  },
  nowIso = new Date().toISOString()
): ReusableSectionEntry[] {
  const title = input.title.trim();
  const text = input.text.trim();
  if (!title) throw new Error('Section title is required.');
  if (!text) throw new Error('Write section text before saving to the reusable library.');
  const tags = Array.from(
    new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 8);
  const existing = entries.find(
    (entry) =>
      entry.title.toLowerCase() === title.toLowerCase() && entry.projectId === input.projectId
  );
  const nextEntry: ReusableSectionEntry = {
    id: existing?.id ?? `lib-${Date.parse(nowIso) || entries.length + 1}-${entries.length}`,
    title: title.slice(0, 120),
    text: text.slice(0, 10000),
    evidence: (input.evidence ?? '').trim().slice(0, 2048),
    projectId: input.projectId,
    projectName: input.projectName.trim() || input.projectId,
    grantId: input.grantId,
    tags,
    savedAt: nowIso,
  };
  const filtered = entries.filter((entry) => entry.id !== nextEntry.id);
  return [nextEntry, ...filtered].slice(0, 100);
}

export function searchReusableSections(
  entries: readonly ReusableSectionEntry[],
  query: string,
  projectIdFilter?: string
): ReusableSectionEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (projectIdFilter && entry.projectId !== projectIdFilter) return false;
    if (!q) return true;
    const haystack =
      `${entry.title} ${entry.text} ${entry.projectName} ${entry.grantId} ${entry.tags.join(' ')}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function requiresOverwriteConfirmation(currentText: string): boolean {
  return Boolean(currentText.trim());
}

export function isReusableSectionList(value: unknown): value is ReusableSectionEntry[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as ReusableSectionEntry;
      return (
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        entry.title.trim().length > 0 &&
        typeof entry.text === 'string' &&
        entry.text.trim().length > 0 &&
        typeof entry.evidence === 'string' &&
        typeof entry.projectId === 'string' &&
        typeof entry.projectName === 'string' &&
        typeof entry.grantId === 'string' &&
        Array.isArray(entry.tags) &&
        entry.tags.every((t) => typeof t === 'string') &&
        typeof entry.savedAt === 'string' &&
        Number.isFinite(Date.parse(entry.savedAt))
      );
    })
  );
}
