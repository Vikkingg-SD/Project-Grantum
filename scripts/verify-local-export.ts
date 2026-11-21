import { buildSafeExportFilename, formatLocalExportContent } from '../src/utils/localExport';
import { seedExportDoc } from '../src/mock/seeds';
import {
  emptyWorkbench,
  resolveApplicationNarrative,
  upsertWorkbenchSection,
} from '../src/utils/drafting';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

function main() {
  const mdName = buildSafeExportFilename('CleanWater AI Infrastructure / Pilot', '1', 'md');
  const txtName = buildSafeExportFilename('***', '2', 'txt');
  check(
    'Given project names When generating local filenames Then special characters are sanitized and safe extensions applied',
    mdName === 'cleanwater-ai-infrastructure-pilot-grant-1.md' &&
      txtName === 'grantum-draft-grant-2.txt'
  );

  const mdContent = formatLocalExportContent({
    format: 'md',
    projectName: 'CleanWater AI Infrastructure',
    grantId: '1',
    profileRevisionId: 'rev-p1-v2',
    body: 'Project summary content.',
  });
  check(
    'Given Markdown export input When formatted Then heading, provenance metadata, and body appear without service boilerplate',
    mdContent.includes('# CleanWater AI Infrastructure (Grant #1)') &&
      mdContent.includes('Pinned Profile Revision: rev-p1-v2') &&
      mdContent.includes('Project summary content.') &&
      !mdContent.includes('pending service connection') &&
      !mdContent.includes('sample mode')
  );

  const txtContent = formatLocalExportContent({
    format: 'txt',
    projectName: 'CleanWater AI Infrastructure',
    grantId: '1',
    profileRevisionId: 'rev-p1-v2',
    body: 'Plain text narrative.',
  });
  check(
    'Given TXT export input When formatted Then plain-text header and body appear without service boilerplate',
    txtContent.includes('CleanWater AI Infrastructure (Grant #1)') &&
      txtContent.includes('Plain text narrative.') &&
      !txtContent.includes('pending service connection') &&
      !txtContent.includes('sample mode')
  );

  const emptyWork = emptyWorkbench();
  const authoredWork = upsertWorkbenchSection(emptyWork, {
    title: 'Mission',
    text: 'Deliver resilient water telemetry to rural municipalities.',
  });
  check(
    'Given unauthored application When resolving narrative Then seed does not leak catalog summary and authored sections flow cleanly',
    seedExportDoc() === '' &&
      resolveApplicationNarrative(null, emptyWork, seedExportDoc()) === '' &&
      resolveApplicationNarrative(null, authoredWork, seedExportDoc()) ===
        'Mission\nDeliver resilient water telemetry to rural municipalities.' &&
      resolveApplicationNarrative('Custom edited narrative', authoredWork, seedExportDoc()) ===
        'Custom edited narrative'
  );

  let emptyErr = '';
  try {
    formatLocalExportContent({
      format: 'txt',
      projectName: 'CleanWater AI Infrastructure',
      grantId: '1',
      profileRevisionId: 'rev-p1-v2',
      body: '   ',
    });
  } catch (e) {
    emptyErr = e instanceof Error ? e.message : String(e);
  }
  check(
    'Given empty narrative body When formatting local export Then explicit validation error throws',
    emptyErr === 'Enter or load application narrative text before downloading.'
  );
}

main();
