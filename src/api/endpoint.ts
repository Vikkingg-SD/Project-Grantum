export const ENDPOINTS = {
  GRANTS: '/grants',
  GRANT_DETAIL: (id: string) => `/grants/${id}`,
  PROPOSAL_DRAFT: (grantId: string) => `/proposals/${grantId}/draft`,
  PROPOSAL_SECTIONS: (grantId: string) => `/proposals/${grantId}/sections`,
  PROPOSAL_AUDIT: (grantId: string) => `/proposals/${grantId}/audit`,
  PROPOSAL_EXPORT: (grantId: string) => `/proposals/${grantId}/export`,
} as const;
