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
  throws(() =>
    state().saveProjectProfile({
      projectId: 'project-1',
      name: 'Blocked viewer edit',
      kind: 'startup',
      summary: 'Should fail',
      fields: { mission: 'Blocked' },
    })
  );
  throws(() => state().toggleArchiveProject('project-1'));
  throws(() => state().pullWorkSlotProfile(state().workspace.applications[0].id));
  state().setRole('editor');
  throws(() =>
    state().saveProjectProfile({
      projectId: 'project-new-blocked',
      name: 'Editor cannot create project',
      kind: 'grant',
      summary: 'Should fail',
      fields: { mission: 'Blocked' },
    })
  );
  throws(() => state().toggleArchiveProject('project-1'));
  state().setRole('viewer');
  state().setActiveProject('project-2');
  equal(state().activeRole, 'owner');
  const p1Before = state().workspace.projects.find((item) => item.id === 'project-1')!.name;
  throws(() =>
    state().saveProjectProfile({
      projectId: '  project-1  ',
      name: 'Bypass attempt',
      kind: 'startup',
      summary: 'Blocked',
      fields: { mission: 'Blocked' },
    })
  );
  equal(state().workspace.projects.find((item) => item.id === 'project-1')!.name, p1Before);
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
  const beforeReadiness = computeProfileReadiness(
    project,
    before,
    state().profileAudits[project.id]
  );
  equal(beforeReadiness.score, 92);
  equal(beforeReadiness.auditStatus, 'not-audited');
  equal(beforeReadiness.auditedScore, 0);
  equal(
    beforeReadiness.checklist.find((item) => item.key === 'mission')?.status,
    'review-required'
  );
  equal(beforeReadiness.checklist.find((item) => item.key === 'teamLead')?.status, 'needs-detail');
  const revCountBefore = state().workspace.revisions.length;
  state().saveProjectProfile({
    projectId: project.id,
    name: project.name,
    kind: project.kind,
    summary: 'Note only with no field change',
    fields: { ...before.fields },
  });
  equal(state().workspace.revisions.length, revCountBefore);

  state().setProjectRole(project.id, 'viewer');
  throws(() =>
    state().runProfileAudit({
      projectId: project.id,
      name: project.name,
      kind: project.kind,
      fields: before.fields,
    })
  );
  state().setProjectRole(project.id, 'owner');
  throws(() =>
    state().runProfileAudit({
      projectId: 'unsaved-project-id',
      name: 'Unsaved',
      kind: 'grant',
      fields: before.fields,
    })
  );

  state().saveProjectProfile({
    projectId: project.id,
    name: project.name,
    kind: project.kind,
    summary: 'Complete team lead',
    fields: { ...before.fields, teamLead: 'Alex Rivera, Principal Systems Lead' },
  });
  const saved = state().workspace.projects.find((item) => item.id === project.id)!;
  const revision = state().workspace.revisions.find((item) => item.id === saved.currentRevisionId)!;
  const preAudit = computeProfileReadiness(saved, revision, state().profileAudits[saved.id]);
  equal(preAudit.score, 100);
  equal(preAudit.auditStatus, 'not-audited');
  const auditResult = state().runProfileAudit({
    projectId: saved.id,
    name: saved.name,
    kind: saved.kind,
    fields: revision.fields,
  });
  equal(auditResult.allPassed, true);
  const postAudit = computeProfileReadiness(saved, revision, state().profileAudits[saved.id]);
  equal(postAudit.auditStatus, 'audited');
  equal(postAudit.auditedScore, 100);
  equal(
    postAudit.checklist.every((item) => item.status === 'audited'),
    true
  );
  equal(
    state().workspace.revisions.some((item) => item.id === before.id),
    true
  );
  process.stdout.write(
    'PASS Given an incomplete profile When saved and audited Then readiness, review-required, audited states, RBAC, and spam guards behave deterministically\n'
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
