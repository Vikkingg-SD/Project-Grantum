import { ENV } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 0,
    public readonly code: string = 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  getToken?: () => string | null | Promise<string | null>;
  fetcher?: typeof fetch;
};

export function createApiClient({ baseUrl, timeoutMs, getToken, fetcher = fetch }: ClientOptions) {
  return async function request<T>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; public?: boolean } = {}
  ): Promise<T> {
    if (!/^https?:\/\//i.test(baseUrl) || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new ApiError('Configure an HTTP(S) API base URL and a positive timeout.', 0, 'CONFIG');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = options.public ? null : await getToken?.();
      const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ApiError(`Request failed (${response.status}).`, response.status, 'HTTP_ERROR');
      }
      try {
        return (await response.json()) as T;
      } catch {
        if (controller.signal.aborted) throw new Error('Request aborted.');
        throw new ApiError(
          'The server returned invalid JSON.',
          response.status,
          'INVALID_RESPONSE'
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? 'The request timed out. Try again.'
          : 'Unable to reach the server.',
        0,
        controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'
      );
    } finally {
      clearTimeout(timer);
    }
  };
}

export function apiClientOptions() {
  return { baseUrl: ENV.API_BASE_URL, timeoutMs: ENV.API_TIMEOUT_MS };
}
