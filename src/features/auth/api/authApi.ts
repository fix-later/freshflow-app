import * as SecureStore from 'expo-secure-store';
import type { User } from '../../../types/common.types';
import type { UserRole } from '../../../constants/roles';
import { apiClient, TOKEN_KEY } from '../../../services/api/client';

export const REFRESH_TOKEN_KEY = 'ff_refresh_token';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

function parseJwt(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

// Map JWT claims → User (handles both modern short-form and legacy .NET SOAP claims)
export function userFromToken(token: string): User {
  const c = parseJwt(token);
  const id =
    (c['sub'] as string) ??
    (c['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ??
    '';
  const email =
    (c['email'] as string) ??
    (c['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ??
    '';
  const name = (c['name'] as string) ?? (c['unique_name'] as string) ?? email;
  const role =
    (c['role'] as UserRole) ??
    (c['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as UserRole);
  return { id, email, name, role };
}

export const authApi = {
  async login(identifier: string, password: string): Promise<{ user: User; accessToken: string }> {
    const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      identifier,
      password,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    return { user: userFromToken(data.accessToken), accessToken: data.accessToken };
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/api/v1/auth/logout', { refreshToken }).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async forgotPassword(identifier: string): Promise<void> {
    await apiClient.post('/api/v1/auth/forgot-password', { identifier });
  },

  async register(
    email: string,
    password: string,
    restaurantName: string,
    phone: string,
  ): Promise<void> {
    await apiClient.post('/api/v1/auth/register', { email, password, restaurantName, phone });
  },

  async refreshAccessToken(): Promise<{ user: User; accessToken: string } | null> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken });
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    if (data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    return { user: userFromToken(data.accessToken), accessToken: data.accessToken };
  },
};
