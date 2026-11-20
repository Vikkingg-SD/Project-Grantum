import type { OutputKind, ProjectKind } from '@/types/workspace';

/**
 * Known section definition.
 *
 * Architectural note: Required sections form the dynamic, ordered task directory for the
 * drafting agent rather than a fixed static checklist. Standard catalog sections keep fixed
 * canonical requirements across every template type, while user-created sections carry custom
 * descriptions that tell the agent what questions to ask next.
 */
export interface KnownSectionDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export const PROJECT_KIND_OPTIONS: readonly {
  id: ProjectKind;
  label: string;
  summary: string;
}[] = [
  { id: 'grant', label: 'Grant', summary: 'Institutional & public funding proposals' },
  { id: 'startup', label: 'Startup', summary: 'Commercial venture & investor applications' },
  { id: 'rd', label: 'R&D', summary: 'Research, engineering, and technical pilots' },
  { id: 'social', label: 'Social', summary: 'Community impact & nonprofit programs' },
  { id: 'invention', label: 'Invention', summary: 'Applied innovation & patentable prototypes' },
  { id: 'other', label: 'Other', summary: 'Custom structured funding submissions' },
] as const;

export const OUTPUT_KIND_OPTIONS: readonly { id: OutputKind; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'pitch-deck', label: 'Pitch deck' },
  { id: 'document', label: 'Document' },
] as const;

export const KNOWN_SECTION_CATALOG: readonly KnownSectionDefinition[] = [
  {
    id: 'mission',
    title: 'Mission',
    description:
      'Your core purpose, the long-term change your project exists to create, and why your team is building it.',
  },
  {
    id: 'pain',
    title: 'Pain',
    description:
      'The concrete problem or unmet need your target audience faces today, backed by scope and urgency.',
  },
  {
    id: 'solution',
    title: 'Solution',
    description:
      'How your product, service, or program solves the stated pain and what makes the approach workable.',
  },
  {
    id: 'market',
    title: 'Market',
    description:
      'Target segment size, who adopts or funds the solution, and the realistic addressable demand.',
  },
  {
    id: 'competitors',
    title: 'Competitors',
    description:
      'Existing alternatives or incumbent approaches and how your solution compares honestly against them.',
  },
  {
    id: 'moat',
    title: 'Moat',
    description:
      'A technological or any other edge that allows your product to be competitive on the market.',
  },
  {
    id: 'proposal',
    title: 'Proposal',
    description:
      'Concise overview of the funded initiative, core deliverables, and expected public or institutional outcome.',
  },
  {
    id: 'project-summary',
    title: 'Project summary',
    description:
      'Concise overview of the funded initiative, core deliverables, and expected public or institutional outcome.',
  },
  {
    id: 'objectives',
    title: 'Objectives',
    description:
      'Specific, measurable outcomes the funding period will achieve and how success will be verified.',
  },
  {
    id: 'budget',
    title: 'Budget',
    description:
      'Itemized cost breakdown, requested funding amount, co-funding sources, and alignment with funder caps.',
  },
  {
    id: 'delivery-plan',
    title: 'Delivery plan',
    description:
      'Phased milestones, implementation timeline, staffing roles, and operational risk mitigation.',
  },
  {
    id: 'impact-beneficiaries',
    title: 'Impact & beneficiaries',
    description:
      'Who benefits directly and indirectly, measurable impact indicators, and long-term sustainability.',
  },
  {
    id: 'problem',
    title: 'Problem',
    description:
      'The high-frequency customer pain point, current workarounds, and why existing options fall short.',
  },
  {
    id: 'unit-economics',
    title: 'Unit economics',
    description:
      'Customer acquisition cost (CAC), lifetime value (LTV), gross margin, payback period, and key pricing drivers.',
  },
  {
    id: 'business-model',
    title: 'Business model',
    description:
      'How the venture generates revenue, pricing tiers, contract structure, and path to recurring cash flow.',
  },
  {
    id: 'go-to-market',
    title: 'Go-to-market',
    description:
      'Acquisition channels, early design partners, sales motion, and distribution strategy.',
  },
  {
    id: 'hypothesis-novelty',
    title: 'Hypothesis & novelty',
    description:
      'The scientific or engineering hypothesis being evaluated and what distinguishes it from current state of the art.',
  },
  {
    id: 'tech-stack',
    title: 'Tech stack',
    description:
      'Core technologies, hardware or software architecture, lab infrastructure, and key technical dependencies.',
  },
  {
    id: 'methodology',
    title: 'Methodology',
    description:
      'Experimental design, prototyping stages, protocols, and reproducibility standards.',
  },
  {
    id: 'validation-trl',
    title: 'Validation & TRL',
    description:
      'Current Technology Readiness Level (TRL), benchmark criteria, and technical validation milestones.',
  },
  {
    id: 'ip-commercialization',
    title: 'IP & commercialization',
    description:
      'Intellectual property ownership, licensing or patent strategy, and pathway from lab to deployment.',
  },
  {
    id: 'risk-safety',
    title: 'Risk & safety',
    description:
      'Technical failure modes, regulatory or ethical safeguards, and contingency engineering paths.',
  },
  {
    id: 'community-need',
    title: 'Community need',
    description:
      'Documented local or regional gap, stakeholder voices, and baseline need indicators.',
  },
  {
    id: 'beneficiaries',
    title: 'Beneficiaries',
    description: 'Specific communities served, reach estimates, and equitable access commitments.',
  },
  {
    id: 'activities',
    title: 'Activities',
    description: 'Concrete workshops, deployments, or field activities funded under this program.',
  },
  {
    id: 'impact',
    title: 'Impact',
    description:
      'Quantifiable social outcomes, evaluation metrics, and continuity after grant end.',
  },
  {
    id: 'novelty',
    title: 'Novelty',
    description:
      'Original technical mechanism and measurable improvements over published alternatives.',
  },
  {
    id: 'technical-approach',
    title: 'Technical approach',
    description: 'System architecture, core algorithms or hardware, and engineering feasibility.',
  },
  {
    id: 'validation',
    title: 'Validation',
    description: 'Field pilots, benchmark evidence, and independent validation procedures.',
  },
  {
    id: 'overview',
    title: 'Overview',
    description: 'Clear summary of the initiative, scope, and primary deliverables.',
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Primary outcomes, success metrics, and target completion dates.',
  },
  {
    id: 'plan',
    title: 'Plan',
    description: 'Workstream breakdown, owner responsibilities, and milestone schedule.',
  },
  {
    id: 'resources',
    title: 'Resources',
    description: 'Personnel, equipment, partner commitments, and funding allocation.',
  },
  {
    id: 'pitch-outline',
    title: 'Pitch outline',
    description:
      'Structured narrative flow tailored for presentation slides and executive summaries.',
  },
  {
    id: 'supporting-documents',
    title: 'Supporting documents',
    description: 'Inventory of financial statements, letters of support, and technical annexes.',
  },
] as const;

export const TEMPLATE_TYPE_SECTIONS: Record<ProjectKind, readonly string[]> = {
  grant: ['Proposal', 'Mission', 'Objectives', 'Budget', 'Delivery plan', 'Impact & beneficiaries'],
  startup: [
    'Problem',
    'Solution',
    'Market',
    'Unit economics',
    'Business model',
    'Moat',
    'Go-to-market',
  ],
  rd: [
    'Hypothesis & novelty',
    'Tech stack',
    'Methodology',
    'Validation & TRL',
    'IP & commercialization',
    'Budget',
    'Risk & safety',
  ],
  social: ['Community need', 'Beneficiaries', 'Activities', 'Impact', 'Budget'],
  invention: ['Problem', 'Novelty', 'Technical approach', 'Validation', 'IP & commercialization'],
  other: ['Overview', 'Goals', 'Plan', 'Resources'],
} as const;

export const SECTION_TARGET_CHARS = 160;

export function normalizeSectionTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

const KNOWN_BY_NORMALIZED = new Map<string, KnownSectionDefinition>(
  KNOWN_SECTION_CATALOG.map((entry) => [normalizeSectionTitle(entry.title), entry])
);

export function findKnownSection(title: string): KnownSectionDefinition | null {
  return KNOWN_BY_NORMALIZED.get(normalizeSectionTitle(title)) ?? null;
}

export function isKnownSection(title: string): boolean {
  return KNOWN_BY_NORMALIZED.has(normalizeSectionTitle(title));
}

export function resolveSectionDescription(
  title: string,
  customDescription?: string
): { description: string; isFixed: boolean } {
  const known = findKnownSection(title);
  if (known) {
    return { description: known.description, isFixed: true };
  }
  const clean = customDescription?.trim();
  return {
    description:
      clean ||
      'Custom section created for this application. Add clear guidance so the agent asks targeted questions.',
    isFixed: false,
  };
}

export function computeSectionCompletionPct(
  _title: string,
  options: { workbenchSection?: { text: string }; isCatalogComplete?: boolean }
): number {
  if (options.workbenchSection !== undefined) {
    const len = options.workbenchSection.text.trim().length;
    if (len === 0) return 0;
    return Math.min(100, Math.max(1, Math.round((len / SECTION_TARGET_CHARS) * 100)));
  }
  return options.isCatalogComplete ? 100 : 0;
}

export function resolveActiveRequiredSections(
  catalogRequired: readonly string[],
  work: {
    templateApplied?: boolean;
    removedCatalogSections?: readonly string[];
    sections: readonly { title: string }[];
  }
): string[] {
  if (work.templateApplied) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const section of work.sections) {
      const clean = section.title.trim();
      const norm = normalizeSectionTitle(clean);
      if (!clean || seen.has(norm)) continue;
      seen.add(norm);
      list.push(clean);
    }
    return list;
  }
  const removedSet = new Set((work.removedCatalogSections ?? []).map(normalizeSectionTitle));
  const seen = new Set<string>();
  const combined: string[] = [];
  for (const title of catalogRequired) {
    const clean = title.trim();
    const norm = normalizeSectionTitle(clean);
    if (!clean || removedSet.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    combined.push(clean);
  }
  for (const section of work.sections) {
    const clean = section.title.trim();
    const norm = normalizeSectionTitle(clean);
    if (!clean || seen.has(norm)) continue;
    seen.add(norm);
    combined.push(clean);
  }
  return combined;
}

export function computeApplicationAuditSignature(input: {
  requiredSections: readonly string[];
  completedSections: readonly string[];
  workSections: readonly { id: string; title: string; text: string; description?: string }[];
  kind: ProjectKind;
  outputs: readonly OutputKind[];
  exportBody: string;
  contentRevision: number;
}): string {
  return JSON.stringify({
    kind: input.kind,
    outputs: [...input.outputs],
    requiredSections: [...input.requiredSections],
    completedSections: [...input.completedSections],
    workSections: input.workSections.map((section) => ({
      title: section.title,
      text: section.text,
      description: section.description ?? '',
    })),
    exportBody: input.exportBody,
    contentRevision: input.contentRevision,
  });
}
