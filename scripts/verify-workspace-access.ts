import { ENV } from '../src/config/env';
import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import { computeProfileReadiness } from '../src/utils/workspace';

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}
function throws(action: () => unknown) {
  let failed = false;
  try {
    action();
  } catch {
    failed = true;
  }
  if (!failed) throw new Error('Expected the invalid operation to fail');
}
const state = () => useWorkspaceStore.getState();
if (process.argv.includes('--api')) {
  equal(ENV.DATA_SOURCE, 'api');
  throws(() => state().setProjectRole('project-1', 'owner'));
  throws(() => state().resolveAdminQueueItem('adm-1', 'retried'));
  equal(state().adminQueue.length, 0);
  process.stdout.write(
    'PASS Given API mode When sample role or staff actions are requested Then actions are unavailable and sample queues are absent\n'
  );
} else {
  state().setRole('viewer');
  state().setActiveProject('project-2');
  equal(state().activeRole, 'owner');
  state().setRole('reviewer');
  state().setActiveProject('project-1');
  equal(state().activeRole, 'viewer');
  equal(state().projectRoles['project-2'], 'reviewer');
  throws(() => state().setProjectRole('missing-project', 'editor'));
  process.stdout.write(
    'PASS Given two projects When role previews change Then roles remain scoped to each project\n'
  );

  state().setRole('owner');
  const project = state().workspace.projects.find((item) => item.id === 'project-1')!;
  const before = state().workspace.revisions.find((item) => item.id === project.currentRevisionId)!;
  equal(computeProfileReadiness(project, before).score, 92);
  state().saveProjectProfile({
    projectId: project.id,
    name: project.name,
    kind: project.kind,
    summary: 'Complete team lead',
    fields: { ...before.fields, teamLead: 'Verified team lead contact' },
  });
  const saved = state().workspace.projects.find((item) => item.id === project.id)!;
  const revision = state().workspace.revisions.find((item) => item.id === saved.currentRevisionId)!;
  equal(computeProfileReadiness(saved, revision).score, 100);
  equal(
    state().workspace.revisions.some((item) => item.id === before.id),
    true
  );
  process.stdout.write(
    'PASS Given an incomplete profile When saved Then readiness updates and prior revisions remain\n'
  );

  state().setPersonalSettings('  New display name  ', false);
  equal(state().nickname, 'New display name');
  equal(state().digestEnabled, false);
  const queueItem = state().adminQueue.find((item) => item.category === 'failed-job')!;
  const auditCount = state().adminAuditLog.length;
  throws(() => state().resolveAdminQueueItem(queueItem.id, 'approved'));
  state().resolveAdminQueueItem(queueItem.id, 'retried');
  state().resolveAdminQueueItem(queueItem.id, 'retried');
  equal(state().adminAuditLog.length, auditCount + 1);
  equal(state().adminQueue.find((item) => item.id === queueItem.id)?.status, 'retried');
  process.stdout.write(
    'PASS Given sample staff work When resolved twice Then only one valid action is recorded\n'
  );
}
