import {
  addApplication,
  addVaultDoc,
  archiveProject,
  auditProjectProfile,
  buildProfileComparison,
  canRolePerform,
  computeProfileReadiness,
  emptyWorkspace,
  evaluateProfileField,
  formatProfileRegions,
  getProfileSyncLag,
  PROFILE_FIELD_DEFINITIONS,
  hasProfileChanges,
  isProfileAuditMap,
  MAX_PROJECT_DOCS,
  parseProfileRegions,
  parseVaultDocs,
  pullProfileRevision,
  removeVaultDoc,
  sanitizeVaultDocName,
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
assert.equal(
  saveProject(workspace, {
    ...input,
    revisionId: 'r3',
    name: ' ' + input.name + ' ',
    summary: 'Note without a profile edit',
    fields: { ...input.fields, mission: ' Teach ', optional: '' },
  }),
  workspace
);
console.info(
  'PASS Given unchanged profile content When saving a different note Then no revision is created'
);
workspace = saveProject(workspace, {
  ...input,
  revisionId: 'r3',
  summary: 'Edit profile',
  fields: { ...input.fields, mission: 'Teach at three schools' },
});
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

// Section 9: real profile detail evaluation, anti-filler, regions, paperclip docs, spam guard & profile audit
const longSentence = (tag: string, minLen: number) => {
  const words = [
    tag,
    'municipal',
    'telemetry',
    'sensors',
    'deployment',
    'utilities',
    'pressure',
    'calibration',
    'monitoring',
    'consortium',
    'milestones',
    'verification',
    'resilience',
    'metrics',
    'infrastructure',
    'district',
    'engineering',
    'compliance',
    'impact',
    'budget',
  ];
  let out = '';
  let idx = 0;
  while (out.length < minLen || idx < 22) {
    out += (out ? ' ' : '') + words[idx % words.length] + `-${idx}`;
    idx += 1;
  }
  return out;
};

const missionDef = PROFILE_FIELD_DEFINITIONS.find((d) => d.key === 'mission')!;
assert.equal(evaluateProfileField(missionDef, 'Too short sentence').filled, false);
assert.equal(evaluateProfileField(missionDef, 'a'.repeat(250)).filled, false);
assert.equal(evaluateProfileField(missionDef, 'test '.repeat(60)).filled, false);
assert.equal(
  evaluateProfileField(missionDef, 'We build clean water sensors for urban cities. '.repeat(6))
    .filled,
  false
);
assert.equal(evaluateProfileField(missionDef, 'test, test. test! test? '.repeat(15)).filled, false);
const cjkValid =
  '本项目致力于在老旧市政供水管网中部署低功耗声学泄漏遥测传感节点，使水务部门能够在数分钟内精准定位地下主干管道破裂与隐蔽渗漏位置，将净化饮用水输送损耗降低一半以上，全面提升沿海与内陆高损耗社区及公立诊所的供水系统韧性、应急响应效率、压力阀门自动隔离水平、水资源计量审计透明度与长期可持续发展能力。我们计划在十二座城市分阶段推进声学硬件校准与实地运维培训，联合地方水务工程团队建立连续监测指标体系与应急调度规程，确保偏远居民区长期受益。';
assert.equal(cjkValid.length >= 200, true);
assert.equal(evaluateProfileField(missionDef, cjkValid).filled, true);
assert.equal(evaluateProfileField(missionDef, longSentence('water', 210)).filled, true);

const longPdfName = `${'a'.repeat(190)}.pdf`;
assert.equal(sanitizeVaultDocName(longPdfName).length, 180);
assert.equal(sanitizeVaultDocName(longPdfName).endsWith('.pdf'), true);

const regions = parseProfileRegions('Global, East Europe, global, CIS');
assert.equal(regions.length, 3);
assert.equal(formatProfileRegions(regions), 'Global, East Europe, CIS');

let docRaw = '';
docRaw = addVaultDoc(docRaw, 'Financial|Statement.pdf').next;
assert.equal(parseVaultDocs(docRaw)[0], 'Financial-Statement.pdf');
const dup = addVaultDoc(docRaw, 'financial-statement.pdf');
assert.equal(Boolean(dup.error), true);
for (let idx = 1; idx < MAX_PROJECT_DOCS; idx++) {
  docRaw = addVaultDoc(docRaw, `Annex-${idx}.pdf`).next;
}
const overflowDoc = addVaultDoc(docRaw, 'Extra.pdf');
assert.equal(Boolean(overflowDoc.error), true);
docRaw = removeVaultDoc(docRaw, 'Financial-Statement.pdf');
assert.equal(parseVaultDocs(docRaw).length, MAX_PROJECT_DOCS - 1);

const fullFields: Record<string, string> = {
  mission: longSentence('mission', 210),
  problem: longSentence('problem', 210),
  solution: longSentence('solution', 210),
  beneficiaries: longSentence('beneficiaries', 130),
  budget: longSentence('budget', 90),
  region: 'Global, East Europe',
  entityType: 'For-profit Startup (C-Corp / LLC)',
  teamLead: 'Alex Rivera, Principal Systems Lead',
};
let profileWs = saveProject(emptyWorkspace(), {
  projectId: 'p-audit',
  revisionId: 'r-audit-1',
  name: 'Audit Test Project',
  kind: 'startup',
  authorId: 'Tester',
  createdAt: '2026-11-22T00:00:00Z',
  summary: 'Initial complete fields',
  fields: fullFields,
});
const pAudit = profileWs.projects[0];
const rAudit = profileWs.revisions[0];
assert.equal(
  hasProfileChanges(pAudit, rAudit, {
    name: '  Audit Test Project  ',
    kind: 'startup',
    fields: { ...fullFields, region: 'East Europe, Global' },
  }),
  false
);
const preAudit = computeProfileReadiness(pAudit, rAudit);
assert.equal(preAudit.score, 100);
assert.equal(preAudit.auditedScore, 0);
assert.equal(preAudit.auditStatus, 'not-audited');
assert.equal(
  preAudit.checklist.every((item) => item.status === 'review-required'),
  true
);
const auditRec = auditProjectProfile({
  projectId: pAudit.id,
  revisionId: rAudit.id,
  name: pAudit.name,
  kind: pAudit.kind,
  fields: rAudit.fields,
  actor: 'Tester',
  auditedAt: '2026-11-22T01:00:00Z',
});
assert.equal(auditRec.allPassed, true);
const postAudit = computeProfileReadiness(pAudit, rAudit, auditRec);
assert.equal(postAudit.auditStatus, 'audited');
assert.equal(postAudit.auditedScore, 100);
assert.equal(
  postAudit.checklist.every((item) => item.status === 'audited'),
  true
);
profileWs = saveProject(profileWs, {
  projectId: 'p-audit',
  revisionId: 'r-audit-2',
  name: pAudit.name,
  kind: pAudit.kind,
  authorId: 'Tester',
  createdAt: '2026-11-22T02:00:00Z',
  summary: 'Update mission',
  fields: { ...fullFields, mission: longSentence('revised', 215) },
});
const staleReadiness = computeProfileReadiness(
  profileWs.projects[0],
  profileWs.revisions[1],
  auditRec
);
assert.equal(staleReadiness.auditStatus, 'stale');
assert.equal(
  staleReadiness.checklist.find((item) => item.key === 'mission')?.status,
  'review-required'
);
assert.equal(staleReadiness.checklist.find((item) => item.key === 'solution')?.status, 'audited');
assert.equal(
  isProfileAuditMap({
    'p-audit': { ...auditRec, recommendations: [123] },
  }),
  false
);
assert.equal(
  isProfileAuditMap({
    'p-audit': { ...auditRec, fieldResults: [] },
  }),
  false
);
assert.equal(
  isProfileAuditMap({
    'other-id': auditRec,
  }),
  false
);
assert.equal(isProfileAuditMap({ 'p-audit': auditRec }), true);
console.info(
  'PASS Given real detail checks, filler rejection, normalized diffs, regions, docs, and profile audit When updated Then review-required, audited, and stale states stay consistent'
);
