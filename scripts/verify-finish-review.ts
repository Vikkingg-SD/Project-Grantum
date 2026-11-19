import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import { useWorkbenchStore } from '../src/store/useWorkbenchStore';
import { workSlotKey } from '../src/utils/workspace';
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
    sections: [{ id: 'goal', title: 'Goal', text: 'Deliver a field assessment.', evidence: '' }],
  }));
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
    'Given submitted work slot When attempting reopen Then error protects immutable submission snapshot',
    lockedError === 'Submitted applications are locked to their receipt snapshot.'
  );
}

main();
