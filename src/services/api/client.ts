import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../config/env';

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

interface RefreshResponse {
  success: boolean;
  data: { accessToken: string; refreshToken: string; expiresIn: number };
}

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

    if (error.response?.status === 401 && !original._retry) {
      // Never retry the refresh endpoint — prevents infinite loop
      if (original.url?.includes('/auth/refresh')) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        _onSignOut?.();
        return Promise.reject(error);
      }

      // Queue concurrent requests until the current refresh resolves
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) =>
          failedQueue.push({ resolve, reject }),
        ).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('no_refresh_token');

        // Plain axios — bypasses apiClient interceptors to avoid re-triggering this handler
        const { data: res } = await axios.post<RefreshResponse>(
          `${ENV.API_URL}/api/v1/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const newToken = res.data.accessToken;
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, res.data.refreshToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        original.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        _onSignOut?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
