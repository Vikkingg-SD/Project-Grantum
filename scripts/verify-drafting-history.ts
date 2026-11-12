import {
  acceptSuggestion,
  applyTemplate,
  emptyWorkbench,
  recordSubmission,
  restoreVersion,
  saveVersion,
} from '../src/utils/drafting';
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
