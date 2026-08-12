import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../config/env';
import { decodeJwtPayload } from '../../utils/jwt';

export const TOKEN_KEY = 'ff_auth_token';
export const REFRESH_TOKEN_KEY = 'ff_refresh_token';

// ─── Axios Instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Token Refresh Queue ───────────────────────────────────────────────────────
// Holds concurrent 401 requests while a single refresh is in-flight.

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// AuthProvider registers this callback so the interceptor can trigger sign-out
// without importing the auth store (which would create a circular dependency).
let _onSignOut: (() => void) | null = null;
export function registerSignOut(cb: () => void) {
  _onSignOut = cb;
}

// ─── Shared Token Refresh ───────────────────────────────────────────────────────
// Both the response interceptor (reacting to a 401) and getValidAccessToken()
// (proactively checked by SignalR before it negotiates) need to rotate the
// access token. They share isRefreshing/failedQueue above so two refreshes
// never fire concurrently regardless of which caller noticed the stale token first.

interface RefreshTokenResponse {
  success: boolean;
  data: { accessToken: string; refreshToken: string; expiresIn: number };
}

async function performRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => failedQueue.push({ resolve, reject }));
  }

  isRefreshing = true;
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('no_refresh_token');

    // Plain axios — bypasses apiClient interceptors to avoid re-triggering this handler
    const { data: res } = await axios.post<RefreshTokenResponse>(
      `${ENV.API_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const newToken = res.data.accessToken;
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken);
    apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;

    processQueue(null, newToken);
    return newToken;
  } catch (refreshError) {
    processQueue(refreshError, null);
    // A network/timeout failure (no response from the server) doesn't mean the
    // refresh token is invalid — only a server-issued rejection does. Treating
    // it the same would force a full sign-out on a transient network blip,
    // which is exactly when SignalR's automatic reconnect (a caller of this
    // function via getValidAccessToken) is also likely to be firing.
    const isNetworkFailure = axios.isAxiosError(refreshError) && !refreshError.response;
    if (!isNetworkFailure) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      _onSignOut?.();
    }
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

// exp is seconds-since-epoch per JWT spec; treat anything unreadable as expired
// so callers fall through to a refresh attempt rather than trusting a bad token.
function jwtExpiresAt(token: string): number | null {
  try {
    const json = decodeJwtPayload(token) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Buffer before the real expiry so a token that's about to die mid-negotiation
// still gets refreshed proactively instead of round-tripping a 401 first.
const EXPIRY_BUFFER_MS = 10_000;

/**
 * Returns a token guaranteed not to be expired, refreshing it first if needed.
 * Unlike the request interceptor (which only reacts to a REST 401), this is for
 * callers outside apiClient — e.g. SignalR's accessTokenFactory — that have no
 * 401-retry path of their own and would otherwise negotiate with a dead token.
 */
export async function getValidAccessToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return '';

  const expiresAt = jwtExpiresAt(token);
  if (expiresAt !== null && expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return token;
  }

  try {
    return await performRefresh();
  } catch {
    // Refresh failed (network blip or a real rejection) — fall back to the
    // cached token rather than ''. It may still have a few seconds of
    // validity left inside EXPIRY_BUFFER_MS; if it's genuinely expired,
    // negotiate will fail and the caller's own retry/backoff picks up a
    // freshly refreshed token on the next attempt.
    return token;
  }
}

// ─── Request Interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ──────────────────────────────────────────────────────

interface EnvelopeAwareRequestConfig extends AxiosRequestConfig {
  preserveEnvelope?: boolean;
}

interface CursorPagedEnvelope<T> {
  success: true;
  data: T[];
  meta: {
    pageSize: number;
    nextCursor: string | null;
  };
}

export interface CursorPagedResult<T> {
  data: T[];
  meta: {
    pageSize: number;
    nextCursor: string | null;
  };
}

apiClient.interceptors.response.use(
  // ── Success: unwrap BE envelope { success: true, data: T } → T ─────────────────
  (response: AxiosResponse) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success === true) {
        const config = response.config as EnvelopeAwareRequestConfig;
        if (config.preserveEnvelope) return response;
        response.data = body.data as unknown;
      }
    }
    return response;
  },

  // ── Error: transform envelope + 401 refresh logic ─────────────────────────────
  async (error: AxiosError) => {
    // Transform error envelope { success: false, error: { code, message } }
    // into the legacy flat shape { code, message } so existing handlers still work.
    if (error.response?.data && typeof error.response.data === 'object') {
      const body = error.response.data as Record<string, unknown>;
      if (body.success === false && body.error) {
        const errDetail = body.error as Record<string, unknown>;
        error.response.data = {
          code: errDetail.code ?? '',
          message: errDetail.message ?? '',
        };
      }
    }

    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Endpoints whose own 401 means something other than "our access token
    // expired" — e.g. /auth/login's 401 is INVALID_CREDENTIALS (wrong email/
    // password), not an expired session. Treating it as an expired-session
    // signal made a plain login mistake throw "no_refresh_token" (no token was
    // ever issued yet), which surfaced to the user as "Không có kết nối mạng"
    // and wrongly flagged sessionExpired, instead of showing the real error.
    const NEVER_REFRESH_ENDPOINTS = ['/auth/refresh', '/auth/login', '/auth/logout'];

    if (error.response?.status === 401 && !original._retry) {
      if (NEVER_REFRESH_ENDPOINTS.some((endpoint) => original.url?.includes(endpoint))) {
        // Only /auth/refresh's own 401 means the session is actually dead —
        // login/logout 401s are just that request's own outcome.
        if (original.url?.includes('/auth/refresh')) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          _onSignOut?.();
        }
        return Promise.reject(error);
      }

      // Mark retried before awaiting — otherwise a request that still comes back
      // 401 after a queued refresh (e.g. that endpoint is 401 for an unrelated
      // reason) would re-enter this branch and kick off a redundant refresh cycle
      // using the token that was just rotated. performRefresh() itself queues
      // concurrent callers behind a single in-flight refresh (see isRefreshing).
      original._retry = true;

      try {
        const newToken = await performRefresh();
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (!error.response) {
      return Promise.reject(new Error('Không có kết nối mạng'));
    }

    return Promise.reject(error);
  },
);

/**
 * Executes a cursor-paginated request without losing the BE envelope metadata.
 * Normal apiClient calls still unwrap `{ success, data }` for backwards compatibility.
 */
export async function getCursorPaged<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<CursorPagedResult<T>> {
  const requestConfig = {
    ...config,
    preserveEnvelope: true,
  } as EnvelopeAwareRequestConfig;

  const response = await apiClient.get<CursorPagedEnvelope<T>>(url, requestConfig);
  const envelope = response.data;

  if (!envelope?.success || !Array.isArray(envelope.data) || !envelope.meta) {
    throw new Error('Phản hồi phân trang từ máy chủ không hợp lệ');
  }

  return {
    data: envelope.data,
    meta: {
      pageSize: envelope.meta.pageSize,
      nextCursor: envelope.meta.nextCursor,
    },
  };
}
