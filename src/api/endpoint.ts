import type { GrantSearchParams } from '@/types/api';

const id = (value: string) => {
  if (!value.trim()) throw new Error('A record identifier is required.');
  return encodeURIComponent(value);
};
const proposal = (grantId: string) => `/api/v1/proposals/${id(grantId)}`;

export const ENDPOINTS = {
  grants: (params?: GrantSearchParams) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    params?.region?.forEach((region) => query.append('region', region));
    params?.category?.forEach((category) => query.append('category', category));
    return `/api/v1/grants${query.size ? `?${query.toString()}` : ''}`;
  },
  grant: (grantId: string) => `/api/v1/grants/${id(grantId)}`,
  draft: (grantId: string) => `${proposal(grantId)}/draft`,
  sections: (grantId: string) => `${proposal(grantId)}/sections`,
  audit: (grantId: string) => `${proposal(grantId)}/audit`,
  auditScan: (grantId: string, scanId: string) => `${proposal(grantId)}/audit/${id(scanId)}`,
  export: (grantId: string) => `${proposal(grantId)}/export`,
  award: (grantId: string) => `${proposal(grantId)}/award`,
  dashboard: '/api/v1/dashboard/summary',
  me: '/api/v1/auth/me',
  magicLink: '/api/v1/auth/magic-link',
  oauth: '/api/v1/auth/oauth',
  onboarding: '/api/v1/auth/onboarding',
  bounty: '/api/v1/bounties',
} as const;
