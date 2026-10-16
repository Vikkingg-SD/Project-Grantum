import type { DashboardSummary } from '@/types/api';

export const mockDashboardSummary: DashboardSummary = {
  greetingName: 'Alex',
  pipeline: [
    { label: 'Discovery', count: 24 },
    { label: 'Pre-screen', count: 8 },
    { label: 'Draft', count: 3 },
    { label: 'Audit', count: 2 },
    { label: 'Ready', count: 1 },
    { label: 'Awarded', count: 1 },
  ],
  profileCompletionPct: 51,
  activeDraft: {
    grantId: '1',
    title: 'Climate Resilience Infrastructure',
    completionPct: 42,
  },
};
