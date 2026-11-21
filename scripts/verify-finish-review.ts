import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import { isValidWorkbenchMap, useWorkbenchStore } from '../src/store/useWorkbenchStore';
import {
  isWorkSlotReadyToFinish,
  recordAuditHistoryEntry,
  emptyWorkbench,
} from '../src/utils/drafting';
import { computeSectionCompletionPct } from '../src/utils/sectionCatalog';
import { pullProfileRevision, selectProfileRevision, workSlotKey } from '../src/utils/workspace';
import {
  evaluateFinishReview,
  FINISH_REVERSIBILITY_NOTE,
  FINISH_REVERSIBILITY_TITLE,
} from '../src/utils/finishReview';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

function capturesError(action: () => void) {
  try {
    action();
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function main() {
  const partial = evaluateFinishReview({
    status: 'drafting',
    filledSections: 1,
    totalSections: 3,
    approvedRequirements: 0,
    totalRequirements: 2,
    syncLag: 1,
  });
  check(
    'Given incomplete drafting state When evaluated Then 0/3 checks met and transitions remain reversible',
    partial.passedCount === 0 &&
      partial.totalCount === 3 &&
      partial.canTransition === true &&
      partial.reversibilityTitle === FINISH_REVERSIBILITY_TITLE &&
      partial.reversibilityNote === FINISH_REVERSIBILITY_NOTE
  );

  const readyCheck = evaluateFinishReview({
    status: 'ready',
    filledSections: 3,
    totalSections: 3,
    approvedRequirements: 2,
    totalRequirements: 2,
    syncLag: 0,
  });
  check(
    'Given completed checks and ready status When evaluated Then 3/3 checks met and reopening stays enabled',
    readyCheck.passedCount === 3 && readyCheck.canTransition === true
  );

  const submittedCheck = evaluateFinishReview({
    status: 'submitted',
    filledSections: 3,
    totalSections: 3,
    approvedRequirements: 2,
    totalRequirements: 2,
    syncLag: 0,
  });
  check(
    'Given submitted application status When evaluated Then review transitions are locked',
    submittedCheck.canTransition === false
  );

  const store = useWorkspaceStore.getState();
  const workbench = useWorkbenchStore.getState();
  const slot = workSlotKey('project-1', '1');
  workbench.update(slot, (work) => ({
    ...work,
    sections: [{ id: 'goal', title: 'Goal', text: '   ', evidence: '' }],
  }));
  check(
    'Given a title and whitespace only When marking ready Then the store rejects the transition',
    capturesError(() => store.setWorkSlotReviewStatus('app-p1-g1', 'ready')) ===
      'Write each draft section before marking the application ready.'
  );
  workbench.update(slot, (work) => ({
    ...work,
    templateApplied: false,
    sections: [
      {
        id: 'mission',
        title: 'Mission',
        text: 'Only one of six catalog sections filled.',
        evidence: '',
      },
    ],
  }));
  check(
    'Given only 1 of 6 required catalog sections filled When marking ready Then the store rejects the transition',
    capturesError(() => store.setWorkSlotReviewStatus('app-p1-g1', 'ready')) ===
      'Write each draft section before marking the application ready.'
  );
  workbench.update(slot, (work) => ({
    ...work,
    templateApplied: true,
    sections: [
      { id: 'goal', title: 'Goal', text: 'Short filled goal text.', evidence: '' },
      { id: 'budget', title: 'Budget', text: 'Short filled budget summary.', evidence: '' },
    ],
  }));
  const currentWork = useWorkbenchStore.getState().work[slot];
  const shortPct = computeSectionCompletionPct('Goal', {
    workbenchSection: currentWork.sections[0],
  });
  check(
    'Given all required sections filled with <100% character target When checked for finish readiness Then finish is clickable',
    shortPct > 0 && shortPct < 100 && isWorkSlotReadyToFinish(currentWork, ['Goal', 'Budget'])
  );

  store.setProjectRole('project-1', 'viewer');
  check(
    'Given a viewer with a populated draft When changing review status Then the store rejects the transition',
    capturesError(() => store.setWorkSlotReviewStatus('app-p1-g1', 'ready')) ===
      'Your project role cannot change this review status.'
  );
  store.setProjectRole('project-1', 'owner');
  store.setWorkSlotReviewStatus('app-p1-g1', 'ready');
  check(
    'Given drafting work slot When marked ready Then status becomes ready',
    useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
      ?.status === 'ready'
  );

  useWorkspaceStore.getState().setWorkSlotReviewStatus('app-p1-g1', 'review');
  check(
    'Given ready work slot When marked in review Then status becomes review',
    useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
      ?.status === 'review'
  );

  useWorkspaceStore.getState().setWorkSlotReviewStatus('app-p1-g1', 'drafting');
  check(
    'Given review work slot When reopened for drafting Then status becomes drafting',
    useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
      ?.status === 'drafting'
  );

  store.setProjectRole('project-1', 'viewer');
  check(
    'Given a viewer When switching profile commit Then the store rejects the transition',
    capturesError(() => store.setWorkSlotProfileRevision('app-p1-g1', 'rev-p1-v2')) ===
      'Your project role cannot select profile revisions in this work slot.'
  );
  store.setProjectRole('project-1', 'reviewer');
  check(
    'Given a reviewer When switching profile commit Then the store rejects the transition',
    capturesError(() => store.setWorkSlotProfileRevision('app-p1-g1', 'rev-p1-v2')) ===
      'Your project role cannot select profile revisions in this work slot.'
  );
  store.setProjectRole('project-1', 'owner');

  store.setWorkSlotProfileRevision('app-p1-g1', 'rev-p1-v2');
  check(
    'Given multiple project profile commits When selecting commit #2 Then work slot pins selected profile revision',
    useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
      ?.profileRevisionId === 'rev-p1-v2'
  );
  store.setWorkSlotProfileRevision('app-p1-g1', 'rev-p1-v1');
  const archivedWorkspace = {
    ...useWorkspaceStore.getState().workspace,
    applications: useWorkspaceStore
      .getState()
      .workspace.applications.map((a) =>
        a.id === 'app-p1-g1' ? { ...a, status: 'archived' as const } : a
      ),
  };
  check(
    'Given pinned profile commit #2 When switching back to commit #1 Then work slot pins earlier revision and rejects foreign or archived slots',
    useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
      ?.profileRevisionId === 'rev-p1-v1' &&
      capturesError(() =>
        selectProfileRevision(
          useWorkspaceStore.getState().workspace,
          'app-p1-g1',
          'rev-p2-v1',
          '2026-11-21T00:00:00Z'
        )
      ) === 'Profile revision does not belong to this project' &&
      capturesError(() =>
        selectProfileRevision(archivedWorkspace, 'app-p1-g1', 'rev-p1-v2', '2026-11-21T00:00:00Z')
      ) === 'Archived applications cannot change profile revisions' &&
      capturesError(() =>
        pullProfileRevision(archivedWorkspace, 'app-p1-g1', '2026-11-21T00:00:00Z')
      ) === 'Archived applications cannot change profile revisions'
  );

  check(
    'Given malformed persisted auditHistory or versions When validated Then isValidWorkbenchMap rejects corrupted entries',
    !isValidWorkbenchMap({
      'slot:project-1:1': {
        ...emptyWorkbench(),
        auditHistory: [
          {
            id: 'bad-1',
            turn: 1,
            timestamp: '2026-11-21T00:00:00Z',
            status: 'passed',
            confidenceScore: 100,
            missingSections: [],
            message: 'Missing statusLabel',
            signature: 'sig',
            profileRevisionId: 'rev-p1-v1',
          },
        ],
      },
    }) &&
      !isValidWorkbenchMap({
        'slot:project-1:1': {
          ...emptyWorkbench(),
          versions: [{ id: 'bad-ver', createdAt: 'now', summary: 'missing sections' }],
        },
      }) &&
      isValidWorkbenchMap({
        'slot:project-1:1': recordAuditHistoryEntry(emptyWorkbench(), {
          id: 'ok-1',
          timestamp: '2026-11-21T00:00:00Z',
          status: 'passed',
          confidenceScore: 100,
          missingSections: [],
          signature: 'sig',
          profileRevisionId: 'rev-p1-v1',
        }),
      })
  );

  let histWork = recordAuditHistoryEntry(emptyWorkbench(), {
    id: 'run-1',
    timestamp: '2026-11-19T00:03:00Z',
    status: 'passed',
    confidenceScore: 100,
    missingSections: [],
    signature: 'sig-1',
    profileRevisionId: 'rev-p1-v1',
    sectionVersionId: 'v1',
  });
  histWork = recordAuditHistoryEntry(histWork, {
    id: 'run-2',
    timestamp: '2026-11-19T00:23:00Z',
    status: 'failed',
    confidenceScore: 83,
    missingSections: ['Mission'],
    signature: 'sig-2',
    profileRevisionId: 'rev-p1-v2',
    sectionVersionId: 'v2',
  });
  check(
    'Given two audit turns When recorded Then turn-by-turn history retains both passed and failed runs',
    (histWork.auditHistory?.length ?? 0) === 2 &&
      histWork.auditHistory?.[0].turn === 1 &&
      histWork.auditHistory?.[0].message === 'All required sections are marked present' &&
      histWork.auditHistory?.[1].turn === 2 &&
      histWork.auditHistory?.[1].message === 'Missing: Mission' &&
      histWork.auditedSignature === 'sig-1'
  );

  useWorkspaceStore.getState().markWorkSlotSubmitted('app-p1-g1', 'RCPT-2026-001');
  check(
    'Given a submitted application When recording another receipt Then the original is preserved',
    capturesError(() => store.markWorkSlotSubmitted('app-p1-g1', 'REPLACEMENT')) ===
      'A receipt is already recorded for this application.' &&
      useWorkspaceStore.getState().workspace.applications.find((a) => a.id === 'app-p1-g1')
        ?.submittedSnapshot?.receiptReference === 'RCPT-2026-001'
  );
  let lockedError = '';
  try {
    useWorkspaceStore.getState().setWorkSlotReviewStatus('app-p1-g1', 'drafting');
  } catch (e) {
    lockedError = e instanceof Error ? e.message : String(e);
  }
  check(
    'Given submitted work slot When attempting profile switch or reopen Then error protects immutable submission snapshot',
    capturesError(() => store.setWorkSlotProfileRevision('app-p1-g1', 'rev-p1-v2')) ===
      'Submitted applications are locked to their snapshot' &&
      lockedError === 'Submitted applications are locked to their receipt snapshot.'
  );
}

main();
