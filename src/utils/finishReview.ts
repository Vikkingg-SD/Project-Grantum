import type { ApplicationBundle } from '@/types/workspace';

export type EditableReviewStatus = 'drafting' | 'review' | 'ready';

export interface FinishCheckItem {
  id: 'sections' | 'requirements' | 'profile-sync';
  label: string;
  detail: string;
  met: boolean;
}

export interface FinishReviewSummary {
  status: ApplicationBundle['status'];
  checks: FinishCheckItem[];
  passedCount: number;
  totalCount: number;
  canTransition: boolean;
  reversibilityTitle: string;
  reversibilityNote: string;
}

export const FINISH_REVERSIBILITY_TITLE = 'Why finishing is reversible';
export const FINISH_REVERSIBILITY_NOTE =
  'Finishing marks this application READY for export or team review. You can reopen it to DRAFTING at any time to continue editing. Nothing is sent to an external funder.';

export function evaluateFinishReview(input: {
  status: ApplicationBundle['status'];
  filledSections: number;
  totalSections: number;
  approvedRequirements: number;
  totalRequirements: number;
  syncLag: number;
}): FinishReviewSummary {
  const checks: FinishCheckItem[] = [
    {
      id: 'sections',
      label: 'Drafting sections populated',
      detail:
        input.totalSections > 0
          ? `${input.filledSections}/${input.totalSections} sections drafted`
          : 'Apply a template to initialize sections',
      met: input.totalSections > 0 && input.filledSections === input.totalSections,
    },
    {
      id: 'requirements',
      label: 'Requirements reviewed & approved',
      detail:
        input.totalRequirements > 0
          ? `${input.approvedRequirements}/${input.totalRequirements} requirements approved`
          : 'No imported requirements yet',
      met: input.totalRequirements === 0 || input.approvedRequirements === input.totalRequirements,
    },
    {
      id: 'profile-sync',
      label: 'Work slot synced with Project Profile',
      detail:
        input.syncLag === 0
          ? 'Pinned to latest profile revision'
          : `${input.syncLag} profile commit(s) ahead`,
      met: input.syncLag === 0,
    },
  ];

  return {
    status: input.status,
    checks,
    passedCount: checks.filter((item) => item.met).length,
    totalCount: checks.length,
    canTransition: input.status !== 'submitted' && input.status !== 'archived',
    reversibilityTitle: FINISH_REVERSIBILITY_TITLE,
    reversibilityNote: FINISH_REVERSIBILITY_NOTE,
  };
}
