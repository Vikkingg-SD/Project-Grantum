import {
  addApplication,
  archiveProject,
  buildProfileComparison,
  canRolePerform,
  computeProfileReadiness,
  emptyWorkspace,
  getProfileSyncLag,
  parseVaultDocs,
  pullProfileRevision,
  saveProject,
  searchProjects,
  toggleVaultDoc,
  workSlotKey,
} from '../src/utils/workspace';
import type { ApplicationBundle } from '../src/types/workspace';
const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  },
  notEqual(actual: unknown, expected: unknown) {
    if (actual === expected) throw new Error('Expected distinct values');
  },
  throws(action: () => unknown, pattern: RegExp) {
    try {
      action();
    } catch (error) {
      if (error instanceof Error && pattern.test(error.message)) return;
      throw error;
    }
    throw new Error('Expected operation to fail');
  },
};

const fields = { mission: 'Teach' };
const input = {
  projectId: 'p1',
  revisionId: 'r1',
  name: 'Learning lab',
  kind: 'social' as const,
  authorId: 'local',
  createdAt: '2026-11-12T00:00:00Z',
  summary: 'Create',
  fields,
};
let workspace = saveProject(emptyWorkspace(), input);
fields.mission = 'Changed outside workspace';
assert.equal(workspace.revisions[0].fields.mission, 'Teach');
workspace = saveProject(workspace, {
  ...input,
  projectId: 'p2',
  revisionId: 'r2',
  name: 'Second project',
});
const application: ApplicationBundle = {
  id: 'a1',
  projectId: 'p1',
  grantId: 'same-grant',
  fundingRoundId: null,
  profileRevisionId: 'r1',
  template: { id: 'social', version: '1' },
  status: 'drafting',
  artifacts: [],
  updatedAt: input.createdAt,
  submittedSnapshot: null,
};
workspace = addApplication(workspace, application);
workspace = addApplication(workspace, {
  ...application,
  id: 'a2',
  projectId: 'p2',
  profileRevisionId: 'r2',
});
assert.equal(workspace.applications.length, 2);
assert.notEqual(workspace.applications[0].projectId, workspace.applications[1].projectId);
assert.notEqual(workSlotKey('p1', 'same-grant'), workSlotKey('p2', 'same-grant'));
assert.throws(
  () => addApplication(workspace, { ...application, id: 'a3', projectId: 'p2' }),
  /revision/
);
console.info(
  'PASS Given two projects When applying to one grant Then bundles retain distinct identity and valid revision ownership'
);
workspace = saveProject(workspace, { ...input, revisionId: 'r3', summary: 'Edit profile' });
assert.equal(workspace.applications[0].profileRevisionId, 'r1');
assert.equal(getProfileSyncLag(workspace, 'a1'), 1);
assert.equal(workspace.revisions[2].parentRevisionId, 'r1');
assert.equal(workspace.revisions[0].fields.mission, 'Teach');
assert.throws(() => saveProject(workspace, input), /already exists/);
assert.throws(() => saveProject(workspace, { ...input, revisionId: 'r4', name: ' ' }), /required/);
console.info(
  'PASS Given a pinned application When project context changes Then prior revisions and application pins are preserved'
);
workspace = pullProfileRevision(workspace, 'a1', '2026-11-12T01:00:00Z');
assert.equal(workspace.applications[0].profileRevisionId, 'r3');
assert.equal(getProfileSyncLag(workspace, 'a1'), 0);
const lockedWorkspace = {
  ...workspace,
  applications: workspace.applications.map((item) =>
    item.id === 'a1'
      ? {
          ...item,
          status: 'submitted' as const,
          submittedSnapshot: {
            profileRevisionId: 'r3',
            artifactRevisionIds: [],
            submittedAt: '2026-11-12T02:00:00Z',
            receiptReference: 'REC-1',
          },
        }
      : item
  ),
};
assert.throws(
  () => pullProfileRevision(lockedWorkspace, 'a1', '2026-11-12T03:00:00Z'),
  /locked to their snapshot/
);
console.info(
  'PASS Given cross-slot profile commits When pulling into a work slot Then drafts update and submitted snapshots stay locked'
);
const readiness = computeProfileReadiness(workspace.projects[0], workspace.revisions[2]);
assert.equal(typeof readiness.score, 'number');
const matchReport = buildProfileComparison(
  {
    id: 'g1',
    title: 'Clean Water Fund',
    funder: 'EU Water',
    deadline: '30 days',
    amount: '$200,000',
    matchPct: 94,
    region: 'Global',
    summary: 'Water telemetry grant',
  },
  workspace.projects[0],
  workspace.revisions[2],
  ['Telemetry validation']
);
assert.equal(matchReport.score, 94);
assert.equal(matchReport.eligibilityGates.length, 4);
assert.equal(canRolePerform('viewer', 'edit'), false);
assert.equal(canRolePerform('reviewer', 'review'), true);
assert.equal(canRolePerform('editor', 'edit'), true);
assert.equal(canRolePerform('owner', 'submit'), true);
const vaultRaw = toggleVaultDoc('Audited_Financials.pdf', 'Utility_MoU.pdf');
assert.equal(parseVaultDocs(vaultRaw).length, 2);
assert.equal(parseVaultDocs(toggleVaultDoc(vaultRaw, 'Audited_Financials.pdf')).length, 1);
console.info(
  'PASS Given profile readiness, verifiable match, vault docs, and co-work roles When evaluated Then capabilities and gates are deterministic'
);
workspace = archiveProject(workspace, 'p1', input.createdAt);
assert.equal(searchProjects(workspace, 'learning').length, 0);
assert.equal(searchProjects(workspace, 'LEARNING', true).length, 1);
assert.throws(() => addApplication(workspace, { ...application, id: 'a3' }), /active project/);
workspace = archiveProject(workspace, 'p1', null);
assert.equal(searchProjects(workspace, 'learning').length, 1);
assert.equal(workspace.applications.length, 2);
console.info(
  'PASS Given archived work When restored Then search resumes without deleting application history'
);

assert.equal(matchReport.referenceUrl, null);
assert.equal(
  matchReport.eligibilityGates.some((item) => item.status === 'pass'),
  false
);
