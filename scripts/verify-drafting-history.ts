import {
  acceptSuggestion,
  applySelectedTemplate,
  applyTemplate,
  buildSectionSuggestion,
  computeLineDiff,
  emptyWorkbench,
  evaluateWorkSlotAudit,
  fullArtifactBundleText,
  recordSubmission,
  removeWorkbenchSection,
  restoreVersion,
  saveVersion,
  syncGrantRequirements,
  upsertWorkbenchSection,
} from '../src/utils/drafting';
import {
  computeApplicationAuditSignature,
  computeSectionCompletionPct,
  resolveActiveRequiredSections,
  resolveSectionDescription,
  TEMPLATE_TYPE_SECTIONS,
} from '../src/utils/sectionCatalog';
const check = (name: string, value: boolean) => {
  if (!value) throw new Error(name);
  console.info('PASS ' + name);
};
let work = applyTemplate(emptyWorkbench(), 'social', ['application', 'pitch-deck']);
work = {
  ...work,
  sections: work.sections.map((s) => ({
    ...s,
    text: 'Original answer',
    evidence: 'https://example.org/source',
  })),
};
work = saveVersion(work, 'v1', '2026-11-12', 'First draft');
work = { ...work, sections: work.sections.map((s) => ({ ...s, text: 'Edited answer' })) };
work = restoreVersion(work, 'v1', 'v2', '2026-11-12');
check(
  'Given edited work When restoring Then current edits are preserved in history',
  work.versions[1].sections[0].text === 'Edited answer' &&
    work.sections[0].text === 'Original answer'
);
work = recordSubmission(
  work,
  'submission',
  '2026-11-12',
  'Receipt 12',
  'https://example.org/submit'
);
work = { ...work, sections: work.sections.map((s) => ({ ...s, text: 'Later edit' })) };
check(
  'Given a recorded submission When editing Then snapshot stays unchanged',
  work.submissions[0].version.sections[0].text === 'Original answer'
);
const count = work.sections.length;
work = applyTemplate(work, 'social', ['application', 'pitch-deck']);
check(
  'Given existing sections When applying the same template Then text is preserved without duplicates',
  work.sections.length === count && work.sections[0].text === 'Later edit'
);
work = syncGrantRequirements(
  work,
  ['Matching Co-Funding Annex', 'Environmental Permit'],
  'https://example.org/grant-track'
);
const syncedCount = work.sections.length;
work = syncGrantRequirements(
  work,
  ['Matching Co-Funding Annex'],
  'https://example.org/grant-track'
);
check(
  'Given official grant track requirements When synced repeatedly Then sections and requirement mappings avoid duplicates',
  work.sections.length === syncedCount && (work.requirementMappings?.length ?? 0) === 2
);
const diff = computeLineDiff('Line A\nLine B', 'Line A\nLine C');
check(
  'Given saved and current section text When computing line diff Then added and removed lines are classified',
  diff.some((d) => d.type === 'removed' && d.line === 'Line B') &&
    diff.some((d) => d.type === 'added' && d.line === 'Line C')
);
let rejected = false;
try {
  recordSubmission(emptyWorkbench(), 'invalid', 'now', 'receipt', 'javascript:alert(1)');
} catch {
  rejected = true;
}
check('Given invalid destination When recording submission Then it is rejected', rejected);

const section = work.sections[0];
const accepted = acceptSuggestion(
  work,
  {
    sectionId: section.id,
    original: section.text,
    proposed: 'Suggested answer',
    sources: ['https://example.org/evidence'],
  },
  'ai-before',
  'now'
);
check(
  'Given sourced suggestion When accepted Then original text is preserved for undo',
  accepted.sections[0].text === 'Suggested answer' &&
    accepted.versions[accepted.versions.length - 1].sections[0].text === section.text
);

const auditBefore = evaluateWorkSlotAudit(accepted, 1);
check(
  'Given work slot with unapproved requirements and profile sync lag When audited Then handoff is blocked',
  auditBefore.syncLag === 1 &&
    auditBefore.pendingRequirements > 0 &&
    auditBefore.readyForHandoff === false
);
const serializedBundle = fullArtifactBundleText(accepted, 'CleanWater AI', 'rev-p1-v2');
check(
  'Given multi-artifact work slot When serialized for export Then narrative and compliance annex are included',
  serializedBundle.includes('# Project Profile: CleanWater AI (Revision: rev-p1-v2)') &&
    serializedBundle.includes('## Application Narrative') &&
    serializedBundle.includes('## Requirement-to-Evidence Compliance Annex')
);
const builtSuggestion = buildSectionSuggestion(
  accepted.sections[0],
  'CleanWater AI',
  'https://example.org/grant'
);
check(
  'Given drafted section When building a template suggestion Then original and source URL are preserved',
  builtSuggestion.original === accepted.sections[0].text &&
    builtSuggestion.proposed.includes('CleanWater AI') &&
    builtSuggestion.sources[0].startsWith('https://')
);

check(
  'Given a local template When generated Then no verification claim or invented URL is added',
  !builtSuggestion.proposed.includes('verified against') &&
    !builtSuggestion.proposed.includes('Grounded in')
);

const unlinked = syncGrantRequirements(emptyWorkbench(), ['Catalog requirement'], '');
check(
  'Given catalog text without a source When copied Then no evidence link is invented',
  unlinked.sections[0].evidence === '' && unlinked.requirementMappings?.[0].sourceUrl === ''
);
const templateOnly = buildSectionSuggestion(unlinked.sections[0], 'Project', '');
check(
  'Given a template without sources When previewed Then sources stay empty and user review is required',
  templateOnly.sources.length === 0 && templateOnly.proposed.includes('review')
);

check(
  'Given Grant, Startup, and R&D types When inspecting choosers Then each exposes distinct template sections including Unit economics and Tech stack',
  TEMPLATE_TYPE_SECTIONS.grant.includes('Proposal') &&
    TEMPLATE_TYPE_SECTIONS.startup.includes('Unit economics') &&
    TEMPLATE_TYPE_SECTIONS.rd.includes('Tech stack') &&
    TEMPLATE_TYPE_SECTIONS.rd.includes('Validation & TRL')
);

const moatDesc = resolveSectionDescription('Moat', 'Attempted override');
const customDesc = resolveSectionDescription('Pilot safety protocol', 'Verify battery isolation');
check(
  'Given known vs custom section descriptions When resolved Then standard Moat stays fixed and custom remains editable',
  moatDesc.isFixed &&
    moatDesc.description ===
      'A technological or any other edge that allows your product to be competitive on the market.' &&
    !customDesc.isFixed &&
    customDesc.description === 'Verify battery isolation'
);

let templated = applySelectedTemplate(
  emptyWorkbench(),
  'rd',
  ['application', 'document'],
  [
    { title: 'Tech stack' },
    { title: 'Данные безопасности (Кириллица)' },
    { title: 'Оценка рисков (Кириллица)', description: 'Custom description text' },
  ]
);
templated = upsertWorkbenchSection(templated, {
  title: 'Данные безопасности (Кириллица)',
  text: '80 chars minimum text sample for partial check',
});
check(
  'Given non-Latin sections with punctuation When edited Then distinct IDs prevent collisions and compute partial percentage',
  templated.templateApplied === true &&
    templated.sections.length === 3 &&
    templated.sections[1].id !== templated.sections[2].id &&
    templated.sections[1].text.length > 0 &&
    templated.sections[2].text === '' &&
    computeSectionCompletionPct('Данные безопасности (Кириллица)', {
      workbenchSection: templated.sections[1],
    }) > 0 &&
    computeSectionCompletionPct('Данные безопасности (Кириллица)', {
      workbenchSection: templated.sections[1],
    }) < 100 &&
    computeSectionCompletionPct('Оценка рисков (Кириллица)', {
      workbenchSection: templated.sections[2],
    }) === 0
);

const sigBase = computeApplicationAuditSignature({
  requiredSections: ['Tech stack'],
  completedSections: ['Tech stack'],
  workSections: templated.sections,
  kind: 'rd',
  outputs: ['application'],
  exportBody: 'Initial export statement',
  contentRevision: 0,
});
const sigExportEdited = computeApplicationAuditSignature({
  requiredSections: ['Tech stack'],
  completedSections: ['Tech stack'],
  workSections: templated.sections,
  kind: 'rd',
  outputs: ['application'],
  exportBody: 'Modified export statement',
  contentRevision: 1,
});
const afterRemove = removeWorkbenchSection(templated, 'Оценка рисков (Кириллица)');
const catalogRemoved = removeWorkbenchSection(emptyWorkbench(), 'Moat');
const catalogResolvedAfterRemove = resolveActiveRequiredSections(
  ['Mission', 'Moat'],
  catalogRemoved
);
const catalogRestored = upsertWorkbenchSection(catalogRemoved, { title: 'Moat', text: '' });
const catalogResolvedAfterRestore = resolveActiveRequiredSections(
  ['Mission', 'Moat'],
  catalogRestored
);
check(
  'Given an audited signature When Export text or sections change Then audit signature invalidates',
  sigBase !== sigExportEdited &&
    afterRemove.sections.length === 2 &&
    catalogRemoved.removedCatalogSections?.includes('Moat') === true &&
    !catalogResolvedAfterRemove.includes('Moat') &&
    catalogResolvedAfterRestore.includes('Moat')
);
