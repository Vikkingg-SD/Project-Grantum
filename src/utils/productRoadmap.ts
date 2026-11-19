import { MOTION } from '@/config/motion';

export type RoadmapStageStatus = 'completed' | 'current' | 'upcoming';

export type RoadmapStageAccent = 'verified' | 'pending' | 'primary' | 'gold' | 'violet';

export interface ProductRoadmapStage {
  id: string;
  label: string;
  shortLabel: string;
  status: RoadmapStageStatus;
  headline: string;
  detail: string;
  accent: RoadmapStageAccent;
}

export const ROADMAP_PULSE_DURATION_MS = MOTION.roadmapPulseMs;

export const GRANTUM_FEEDBACK_EMAIL = 'suggestions_grantum@gmail.com';
export const GRANTUM_FEEDBACK_MAILTO =
  'mailto:suggestions_grantum@gmail.com?subject=Grantum%20feedback';

export const PRODUCT_ROADMAP_STAGES: readonly ProductRoadmapStage[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    shortLabel: 'Core',
    status: 'completed',
    headline: 'Workspace foundation complete',
    detail: 'Structured project profiles, work-slot isolation, and local draft editing are active.',
    accent: 'verified',
  },
  {
    id: 'architecture',
    label: 'Hardening',
    shortLabel: 'Nav',
    status: 'completed',
    headline: 'Navigation & draft safeguards complete',
    detail:
      'Unified shell navigation, history bounds, and authored-draft readiness guards are in place.',
    accent: 'pending',
  },
  {
    id: 'beta',
    label: 'Beta',
    shortLabel: 'Beta',
    status: 'current',
    headline: 'Beta is conducted, release coming soon',
    detail:
      'UI/UX refinement and interactive verification across workspace screens are underway before release.',
    accent: 'primary',
  },
  {
    id: 'release',
    label: 'Release',
    shortLabel: 'Launch',
    status: 'upcoming',
    headline: 'Public release upcoming',
    detail: 'Connected opportunity sources, guided drafting workflows, and live export services.',
    accent: 'gold',
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem',
    shortLabel: 'Scale',
    status: 'upcoming',
    headline: 'Connected ecosystem',
    detail: 'Multi-user collaboration, verified funder feeds, and automated progress tracking.',
    accent: 'violet',
  },
] as const;

export const CURRENT_ROADMAP_STAGE_ID = 'beta';

export function getDefaultRoadmapStageId(
  stages: readonly ProductRoadmapStage[] = PRODUCT_ROADMAP_STAGES
): string {
  const current = stages.find((stage) => stage.status === 'current');
  return current?.id ?? stages[0]?.id ?? '';
}

export function getCoveredProgressRatio(
  stages: readonly ProductRoadmapStage[] = PRODUCT_ROADMAP_STAGES
): number {
  if (stages.length <= 1) return stages.length === 1 ? 1 : 0;
  const currentIndex = stages.findIndex((stage) => stage.status === 'current');
  if (currentIndex >= 0) return currentIndex / (stages.length - 1);
  let lastCompleted = -1;
  stages.forEach((stage, index) => {
    if (stage.status === 'completed') lastCompleted = index;
  });
  return lastCompleted <= 0 ? 0 : lastCompleted / (stages.length - 1);
}

export function statusLabelForStage(status: RoadmapStageStatus): string {
  if (status === 'current') return 'Current stage';
  if (status === 'completed') return 'Completed';
  return 'Upcoming';
}
