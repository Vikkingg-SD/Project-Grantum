import { mockGrants } from '../src/mock/grants';
import { createDevicePersistence, type DeviceStorage } from '../src/store/devicePersistence';
import {
  addCustomPreflightQuestion,
  applyAgentPreflightQuestions,
  buildEmptyPreflight,
  buildPreflightForGrantAndProfile,
  extractMaxChatSeq,
  formatPreflightContextBrief,
  isEligibilityPreflightMap,
  isEligibilityPreflightState,
  MAX_PREFLIGHT_RECORDS,
  preflightScopeKey,
  prunePreflightRecords,
  setPreflightCriterionAnswer,
  setPreflightCriterionStatus,
  stableQuestionId,
  summarizePreflight,
  type GrantPreflightRecord,
  type PreflightPersistedState,
} from '../src/utils/eligibilityPreflight';
import { extractGrantTags, filterGrants, isGrantTagHighlighted } from '../src/utils/filters';
import { useWorkspaceStore } from '../src/store/useWorkspaceStore';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

async function main() {
  const scalingOnly = filterGrants(mockGrants, { stages: ['Scaling'] });
  check(
    'Given Scaling stage filter When applied Then only Climate Resilience Infrastructure matches',
    scalingOnly.length === 1 && scalingOnly[0].id === '1'
  );

  const soloSmall = filterGrants(mockGrants, { participations: ['Solo'], teamSizes: ['1-3'] });
  check(
    'Given Solo + 1-3 team size filters When applied Then only Open Data for Public Good matches',
    soloSmall.length === 1 && soloSmall[0].id === '3'
  );

  const mismatched = filterGrants(mockGrants, {
    stages: ['Idea / Early'],
    participations: ['Consortium'],
  });
  check(
    'Given conflicting stage and participation filters When applied Then no grants match',
    mismatched.length === 0
  );

  const soloEligible = filterGrants(mockGrants, { participations: ['Solo'] });
  const consortiumEligible = filterGrants(mockGrants, { participations: ['Consortium'] });
  check(
    'Given Solo or Consortium filter When a grant specifies Either Then applicant-intent matching includes that grant',
    soloEligible.map((g) => g.id).join(',') === '2,3' &&
      consortiumEligible.map((g) => g.id).join(',') === '1,2'
  );

  const tagsGrant2 = extractGrantTags(mockGrants[1]);
  const missingTagGrant = extractGrantTags({
    id: 'missing-tags',
    title: 'Minimal Call',
    funder: 'Funder',
    deadline: '30 days',
    amount: '$10k',
    matchPct: 50,
    region: 'Global',
    summary: 'Missing facets',
  });
  check(
    'Given grant metadata or missing facets When building card tags Then explicit labels and active filter highlights work',
    tagsGrant2.map((t) => t.label).join(' | ') ===
      'Stage: Prototype / Pilot | Format: Either | Team: 4-10' &&
      isGrantTagHighlighted(tagsGrant2[1], { participations: ['Solo'] }) === true &&
      isGrantTagHighlighted(tagsGrant2[0], { stages: ['Scaling'] }) === false &&
      missingTagGrant.every((t) => !t.specified && t.label.endsWith('Unspecified'))
  );

  const ws = useWorkspaceStore.getState().workspace;
  const project1 = ws.projects.find((p) => p.id === 'project-1')!;
  const rev1 = ws.revisions.find((r) => r.id === project1.currentRevisionId)!;
  const project2 = ws.projects.find((p) => p.id === 'project-2')!;
  const rev2 = ws.revisions.find((r) => r.id === project2.currentRevisionId)!;

  const emptyScope = {
    projectId: project2.id,
    grantId: 'custom-grant',
    profileRevisionId: rev2.id,
    chatId: 'chat-1',
  };
  const emptyFromAbsent = buildPreflightForGrantAndProfile({
    scope: emptyScope,
    grant: {
      id: 'custom-grant',
      title: 'Open Call',
      region: 'Global',
      amount: '$50k',
      eligibilityCriteria: [],
    },
    project: project2,
    revision: rev2,
  });
  const emptySummary = summarizePreflight(emptyFromAbsent);
  check(
    'Given a grant without criteria and complete profile When building preflight Then it starts as an empty agent-fillable template',
    emptyFromAbsent.mode === 'empty-template' &&
      emptyFromAbsent.criteria.length === 0 &&
      emptySummary.isEmpty &&
      emptySummary.summaryText.includes('Empty pre-flight template')
  );

  const agentFilled = applyAgentPreflightQuestions(
    buildEmptyPreflight(emptyScope),
    [
      {
        question: 'Confirm matching municipal letter of commitment',
        uncertainty: 'Not listed in active profile documents',
      },
      {
        question: 'Confirm sensor calibration audit window',
        uncertainty: 'Timeline must finish before Q4',
      },
    ],
    '2026-11-19T10:00:00.000Z'
  );
  check(
    'Given an empty preflight template When agent populates questions Then mode becomes agent-populated with stable IDs',
    agentFilled.mode === 'agent-populated' &&
      agentFilled.criteria.length === 2 &&
      agentFilled.criteria[0].source === 'agent' &&
      agentFilled.criteria[0].id ===
        stableQuestionId('Confirm matching municipal letter of commitment')
  );

  const scopeP1G1C1 = {
    projectId: project1.id,
    grantId: mockGrants[0].id,
    profileRevisionId: rev1.id,
    chatId: 'chat-1',
  };
  const scopeP2G1C1 = {
    projectId: project2.id,
    grantId: mockGrants[0].id,
    profileRevisionId: rev2.id,
    chatId: 'chat-1',
  };
  const scopeP1G2C1 = {
    projectId: project1.id,
    grantId: mockGrants[1].id,
    profileRevisionId: rev1.id,
    chatId: 'chat-1',
  };
  const scopeP1G1C2 = {
    ...scopeP1G1C1,
    chatId: 'chat-2',
  };
  check(
    'Given two projects, two grants, and two chats When computing scope keys Then all four scopes are isolated',
    new Set([
      preflightScopeKey(scopeP1G1C1),
      preflightScopeKey(scopeP2G1C1),
      preflightScopeKey(scopeP1G2C1),
      preflightScopeKey(scopeP1G1C2),
    ]).size === 4
  );

  const p1g1 = buildPreflightForGrantAndProfile({
    scope: scopeP1G1C1,
    grant: mockGrants[0],
    project: project1,
    revision: rev1,
  });
  const p2g1 = buildPreflightForGrantAndProfile({
    scope: scopeP2G1C1,
    grant: mockGrants[0],
    project: project2,
    revision: rev2,
  });
  const p1g2 = buildPreflightForGrantAndProfile({
    scope: scopeP1G2C1,
    grant: mockGrants[1],
    project: project1,
    revision: rev1,
  });
  check(
    'Given Project 1 missing project lead vs complete Project 2 When scanning Grant 1 Then Project 1 receives profile-gap question while Project 2 does not',
    p1g1.criteria.some((c) => c.source === 'profile-gap') &&
      !p2g1.criteria.some((c) => c.source === 'profile-gap') &&
      p1g1.criteria[0].label !== p1g2.criteria[0].label
  );

  const updated = setPreflightCriterionStatus(
    p1g1,
    p1g1.criteria[0].id,
    'met',
    '2026-11-19T00:00:00.000Z'
  );
  const answered = setPreflightCriterionAnswer(
    updated,
    p1g1.criteria[0].id,
    'Municipal consortium agreement signed in Q3.',
    '2026-11-19T00:00:30.000Z'
  );
  const reviewed = setPreflightCriterionStatus(
    answered,
    p1g1.criteria[1].id,
    'review',
    '2026-11-19T00:01:00.000Z'
  );
  const withCustom = addCustomPreflightQuestion(
    reviewed,
    'Confirm open-source telemetry license compatibility',
    undefined,
    '2026-11-19T00:02:00.000Z'
  );
  const summary = summarizePreflight(withCustom);
  check(
    'Given confirmed, review, and custom preflight items When summarized Then counts and honest disclaimer match without device-copy',
    summary.metCount === 1 &&
      summary.reviewCount === 1 &&
      summary.totalCount === p1g1.criteria.length + 1 &&
      summary.summaryText.includes(`1/${p1g1.criteria.length + 1} pre-flight checks confirmed`) &&
      !summary.summaryText.toLowerCase().includes('on this device') &&
      summary.summaryText.includes('Does not verify official funder eligibility.') &&
      formatPreflightContextBrief(withCustom).includes(
        'Municipal consortium agreement signed in Q3.'
      )
  );

  const reorderedGrant = {
    ...mockGrants[0],
    eligibilityCriteria: [
      mockGrants[0].eligibilityCriteria![2],
      mockGrants[0].eligibilityCriteria![0],
      'Revised criterion replacing original item 2',
    ],
  };
  const reconciled = buildPreflightForGrantAndProfile({
    scope: scopeP1G1C1,
    grant: reorderedGrant,
    project: project1,
    revision: rev1,
    existing: withCustom,
  });
  const movedOriginalFirst = reconciled.criteria.find(
    (c) => c.label === mockGrants[0].eligibilityCriteria![0]
  );
  const replacedSecond = reconciled.criteria.find(
    (c) => c.label === 'Revised criterion replacing original item 2'
  );
  check(
    'Given reordered and edited grant criteria When rescanned Then moved item keeps its answer and edited item resets to unconfirmed',
    movedOriginalFirst?.status === 'met' &&
      movedOriginalFirst?.answer === 'Municipal consortium agreement signed in Q3.' &&
      replacedSecond?.status === 'unconfirmed' &&
      reconciled.criteria.some((c) => c.source === 'custom')
  );

  // Regression: agent population and large >=20-criterion scans must preserve applicant-authored custom questions.
  const agentWithCustom = applyAgentPreflightQuestions(
    withCustom,
    [
      {
        question: 'Confirm audit readiness timeline',
        uncertainty: 'Timeline missing in draft',
      },
    ],
    '2026-11-19T11:00:00.000Z'
  );
  const largeCriteriaGrant = {
    ...mockGrants[0],
    eligibilityCriteria: Array.from({ length: 22 }, (_, i) => `Funder rule ${i + 1}`),
  };
  const rescannedLarge = buildPreflightForGrantAndProfile({
    scope: scopeP1G1C1,
    grant: largeCriteriaGrant,
    project: project1,
    revision: rev1,
    existing: withCustom,
  });
  check(
    'Given applicant custom question When agent populates or >=20 criteria rescan runs Then custom question is preserved within 20-item cap',
    agentWithCustom.criteria.some((c) => c.source === 'custom') &&
      rescannedLarge.criteria.length === 20 &&
      rescannedLarge.criteria.some((c) => c.source === 'custom')
  );

  // Regression: pruning keeps records <= MAX_PREFLIGHT_RECORDS so persisted map stays valid past 200 writes.
  const oversized: Record<string, GrantPreflightRecord> = {};
  for (let i = 0; i < MAX_PREFLIGHT_RECORDS + 15; i++) {
    const scope = {
      projectId: project1.id,
      grantId: mockGrants[0].id,
      profileRevisionId: rev1.id,
      chatId: `chat-${i + 1}`,
    };
    const rec = buildEmptyPreflight(scope, new Date(Date.UTC(2026, 10, 1, 0, i, 0)).toISOString());
    oversized[rec.scopeKey] = rec;
  }
  const pruned = prunePreflightRecords(oversized);
  check(
    'Given >200 preflight records When pruned Then newest 200 remain and pass storage validator',
    Object.keys(pruned).length === MAX_PREFLIGHT_RECORDS &&
      isEligibilityPreflightMap(pruned) &&
      extractMaxChatSeq(pruned, project1.id, mockGrants[0].id) === MAX_PREFLIGHT_RECORDS + 15
  );

  const validMap: Record<string, GrantPreflightRecord> = { [withCustom.scopeKey]: withCustom };
  const validState: PreflightPersistedState = {
    records: validMap,
    chatSessions: { [`${project1.id}:${mockGrants[0].id}`]: 2 },
  };
  const invalidMap = {
    [withCustom.scopeKey]: { ...withCustom, scopeKey: 'mismatch' },
  };
  check(
    'Given valid and invalid v2 preflight states When validated with type guard Then only matching valid state passes',
    isEligibilityPreflightMap(validMap) &&
      !isEligibilityPreflightMap(invalidMap) &&
      isEligibilityPreflightState(validState) &&
      !isEligibilityPreflightState({ records: validMap, chatSessions: { bad: 0 } })
  );

  const backing = new Map<string, string>();
  const storage: DeviceStorage = {
    getItem: async (key) => backing.get(key) ?? null,
    setItem: async (key, value) => {
      backing.set(key, value);
    },
  };
  const persistence = createDevicePersistence(
    'grantum.eligibility-preflight.v2',
    storage,
    isEligibilityPreflightState
  );
  let restored: PreflightPersistedState = { records: {}, chatSessions: {} };
  await persistence.hydrate((next) => {
    restored = next;
  });
  let status = '';
  persistence.save(validState, (next) => {
    status = next;
  });
  await persistence.flush();

  const reload = createDevicePersistence(
    'grantum.eligibility-preflight.v2',
    storage,
    isEligibilityPreflightState
  );
  await reload.hydrate((next) => {
    restored = next;
  });
  check(
    'Given saved scoped preflight state When persisted and reloaded Then statuses, answers, custom questions, and chatSessions survive reload',
    status === 'device-saved' &&
      restored.chatSessions[`${project1.id}:${mockGrants[0].id}`] === 2 &&
      restored.records[withCustom.scopeKey]?.criteria[0].status === 'met' &&
      restored.records[withCustom.scopeKey]?.criteria[0].answer ===
        'Municipal consortium agreement signed in Q3.' &&
      restored.records[withCustom.scopeKey]?.criteria[1].status === 'review'
  );
}

main().catch((error) => {
  console.error(error);
  throw error;
});
