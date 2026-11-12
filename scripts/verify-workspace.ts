import {
  addApplication,
  archiveProject,
  emptyWorkspace,
  saveProject,
  searchProjects,
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
assert.throws(
  () => addApplication(workspace, { ...application, id: 'a3', projectId: 'p2' }),
  /revision/
);
console.info(
  'PASS Given two projects When applying to one grant Then bundles retain distinct identity and valid revision ownership'
);
workspace = saveProject(workspace, { ...input, revisionId: 'r3', summary: 'Edit profile' });
assert.equal(workspace.applications[0].profileRevisionId, 'r1');
assert.equal(workspace.revisions[2].parentRevisionId, 'r1');
assert.equal(workspace.revisions[0].fields.mission, 'Teach');
assert.throws(() => saveProject(workspace, input), /already exists/);
assert.throws(() => saveProject(workspace, { ...input, revisionId: 'r4', name: ' ' }), /required/);
console.info(
  'PASS Given a pinned application When project context changes Then prior revisions and application pins are preserved'
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
