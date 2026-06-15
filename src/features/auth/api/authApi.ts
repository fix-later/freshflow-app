import * as SecureStore from 'expo-secure-store';
import type { User } from '../../../types/common.types';
import type { UserRole } from '../../../constants/roles';
import { apiClient, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../../services/api/client';

export { REFRESH_TOKEN_KEY };

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
  approvalStatus: 'pending' | 'active' | 'suspended' | null;
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

// Map BE role names (lowercase) → FE UserRole constants (UPPERCASE)
const ROLE_MAP: Record<string, UserRole> = {
  restaurant:         'RESTAURANT',
  market_agent:       'MARKET_AGENT',
  hub_staff:          'HUB_STAFF',
  driver:             'DRIVER',
  admin:              'RESTAURANT', // fallback — admin không có app stack riêng
  operations_manager: 'MARKET_AGENT',
};

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
  const rawRole =
    (c['role'] as string) ??
    (c['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string) ??
    '';
  // Normalize: BE sends lowercase ("restaurant"), FE expects uppercase ("RESTAURANT")
  const role: UserRole = ROLE_MAP[rawRole.toLowerCase()] ?? (rawRole.toUpperCase() as UserRole);
  return { id, email, name, role };
}

export interface RegisterRestaurantPayload {
  email: string;
  password: string;
  restaurantName: string;
  phone?: string;
}

export interface RegisterRestaurantResponse {
  userId: string;
  restaurantId: string;
  email: string;
  restaurantName: string;
  isApproved: boolean;
}

export const authApi = {
  async registerRestaurant(payload: RegisterRestaurantPayload): Promise<RegisterRestaurantResponse> {
    const { data } = await apiClient.post<RegisterRestaurantResponse>(
      '/api/v1/auth/register',
      payload,
    );
    return data;
  },

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

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/v1/auth/reset-password', { token, newPassword });
  },

  async requestVerification(identifier: string): Promise<void> {
    await apiClient.post('/api/v1/auth/verify/request', {
      identifier,
      channel: 'EMAIL',
    });
  },

  async verifyEmail(identifier: string, code: string): Promise<void> {
    await apiClient.post('/api/v1/auth/verify', {
      identifier,
      channel: 'EMAIL',
      code,
    });
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
