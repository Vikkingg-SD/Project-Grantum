import type { GrantSearchParams } from '@/types/api';

export const queryKeys = {
  grants: (params?: GrantSearchParams) =>
    [
      'grants',
      params?.q ?? '',
      [...(params?.region ?? [])].sort(),
      [...(params?.category ?? [])].sort(),
    ] as const,
  grant: (grantId: string) => ['grant', grantId] as const,
  draft: (grantId: string) => ['proposal-draft', grantId] as const,
  sections: (grantId: string) => ['proposal-sections', grantId] as const,
  audit: (grantId: string) => ['audit-status', grantId] as const,
  award: (grantId: string) => ['award', grantId] as const,
  dashboard: ['dashboard-summary'] as const,
  me: ['auth', 'me'] as const,
};
