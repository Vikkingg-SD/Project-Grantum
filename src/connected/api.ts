import type { User } from '@firebase/auth';
import { ApiError, apiClientOptions, createApiClient } from '@/api/client';
import type { GrantDetail } from '@/types/grant';

export type Role = 'owner' | 'editor' | 'reviewer' | 'viewer';
export type WorkStatus = 'drafting' | 'review' | 'ready' | 'submitted' | 'awarded' | 'declined';
export type Format = 'markdown' | 'notebook' | 'word' | 'pdf';
export type Section = { name: string; text: string };
export type BudgetLine = {
  name: string;
  amountMinor: number;
  currency: 'USD' | 'EUR' | 'KZT' | 'GBP';
};
export type Session = {
  id: string;
  displayName: string;
  staff: boolean;
  isOnboarded: boolean;
  analyticsAvailable: boolean;
  analyticsOptIn: boolean;
};
export type ProjectInput = {
  name: string;
  description: string;
  region: string;
  legalEntity: string;
};
export type Project = ProjectInput & { id: string; archived: boolean; version: number; role: Role };
export type Member = { id: string; displayName: string; role: Role };
export type DocumentInfo = { id: string; name: string; size: number; checksum: string };
export type Attempt = {
  id: string;
  projectId: string;
  grantId: string;
  grantTitle: string;
  title: string;
  role: Role;
  version: number;
  status: WorkStatus;
  requirements: string[];
  sections: Section[];
  budget: BudgetLine[];
  completionPct: number;
  updatedAt: string;
  receipt: string | null;
  decisionReference: string | null;
};
export type Audit = {
  id: string;
  version: number;
  score: number;
  missing: string[];
  current: boolean;
  createdAt: string;
};
export type Revision = { version: number; status: WorkStatus; createdAt: string };
export type Notice = { id: string; message: string; read: boolean; createdAt: string };
export type BountyStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type Bounty = {
  id: string;
  title: string;
  url: string;
  note: string;
  status: BountyStatus;
  reviewNote: string | null;
  version: number;
};
export type ExportFile = {
  name: string;
  mime: string;
  base64: string;
  checksum: string;
  version: number;
};
export type Dashboard = {
  greetingName: string;
  pipeline: { label: WorkStatus; count: number }[];
  activeDraft: { attemptId: string; grantId: string; title: string } | null;
};

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(): never {
  throw new ApiError('Grantum returned an unexpected response.', 0, 'INVALID_RESPONSE');
}

function validate<T>(value: T, shape: (item: T) => boolean): T {
  if (!value || !shape(value)) invalid();
  return value;
}

function checkAttempt(value: Attempt) {
  return (
    typeof value.id === 'string' &&
    typeof value.grantId === 'string' &&
    typeof value.title === 'string' &&
    Number.isInteger(value.version) &&
    Array.isArray(value.sections) &&
    value.sections.every(
      (entry) => entry && typeof entry.name === 'string' && typeof entry.text === 'string'
    ) &&
    Array.isArray(value.requirements) &&
    Array.isArray(value.budget)
  );
}

export function connectedApi(user?: User) {
  const options = apiClientOptions();
  const local =
    __DEV__ && /^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):5050\/?$/.test(options.baseUrl);
  const request = createApiClient({
    ...options,
    baseUrl: /^https:\/\//i.test(options.baseUrl) || local ? options.baseUrl : '',
    getToken: () => user?.getIdToken() ?? null,
  });
  return {
    get: <T>(route: string) => request<T>('/api/v1' + route),
    post: <T>(route: string, body?: unknown) =>
      request<T>('/api/v1' + route, { method: 'POST', body }),
    patch: <T>(route: string, body: unknown) =>
      request<T>('/api/v1' + route, { method: 'PATCH', body }),
    remove: (route: string) => request<void>('/api/v1' + route, { method: 'DELETE' }),
    session: async () =>
      validate(
        await request<Session>('/api/v1/auth/session', { method: 'POST' }),
        (row) =>
          typeof row.id === 'string' &&
          typeof row.staff === 'boolean' &&
          typeof row.displayName === 'string' &&
          typeof row.isOnboarded === 'boolean'
      ),
    attempt: async (id: string) =>
      validate(await request<Attempt>('/api/v1/attempts/' + encodeURIComponent(id)), checkAttempt),
    grants: (term: string) =>
      request<GrantDetail[]>('/api/v1/grants?q=' + encodeURIComponent(term), { public: true }),
  };
}

export type ConnectedClient = ReturnType<typeof connectedApi>;
