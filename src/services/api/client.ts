import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../../config/env';

// Key lưu token trong SecureStore
export const TOKEN_KEY = 'ff_auth_token';

// ─── Axios Instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
// Tự động gắn Bearer token vào mọi request

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ──────────────────────────────────────────────────────
// Xử lý lỗi tập trung — feature không cần tự handle 401, network error

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token hết hạn: xoá token, app sẽ redirect về Login
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      // TODO: gọi signOut() từ authStore sau khi migrate sang Zustand
    }

    if (!error.response) {
      // Không có response = mất mạng hoặc server không phản hồi
      return Promise.reject(new Error('Không có kết nối mạng'));
    }

    return Promise.reject(error);
  },
);
