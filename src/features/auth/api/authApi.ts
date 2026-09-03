import * as SecureStore from 'expo-secure-store';
import type { User } from '../../../types/common.types';
import type { UserRole } from '../../../constants/roles';
import { apiClient, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../../services/api/client';
import { decodeJwtPayload } from '../../../utils/jwt';

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
  // BE's RestaurantStatus enum has no JsonStringEnumConverter registered, so it
  // serializes as its numeric ordinal (Pending=0, Active=1, Suspended=2), not a
  // string — see RestaurantStatus.cs / Program.cs. Null for non-restaurant roles.
  approvalStatus: 0 | 1 | 2 | null;
}

export type ApprovalStatus = 'pending' | 'active' | 'suspended' | null;

const APPROVAL_STATUS_MAP: Record<0 | 1 | 2, ApprovalStatus> = {
  0: 'pending',
  1: 'active',
  2: 'suspended',
};

function mapApprovalStatus(value: LoginResponse['approvalStatus']): ApprovalStatus {
  return value === null ? null : APPROVAL_STATUS_MAP[value];
}

// Map BE role names (lowercase) → FE UserRole constants (UPPERCASE)
const ROLE_MAP: Record<string, UserRole> = {
  restaurant:   'RESTAURANT',
  market_agent: 'MARKET_AGENT',
  hub_staff:    'HUB_STAFF',
  driver:       'DRIVER',
};

// BE roles (see seed 20260606152229_AddRolesTable.cs) that have no mobile app
// stack at all. Previously "admin" silently fell back to the RESTAURANT stack,
// which then broke on every restaurant-only endpoint (404s) instead of telling
// the user plainly that this account can't be used here. "operations_manager"
// had the same problem in a quieter form: ROLE_MAP used to alias it to
// MARKET_AGENT, so an ops manager was silently handed the market agent's
// screens (price entry, assigned markets) instead of an error — there is no
// operations-manager-specific mobile stack, so block it the same way as admin
// rather than pretend it's a market agent.
const UNSUPPORTED_MOBILE_ROLES = new Set(['admin', 'operations_manager']);

export class UnsupportedRoleError extends Error {
  constructor(public readonly role: string) {
    super(`Vai trò "${role}" chưa được hỗ trợ trên ứng dụng di động.`);
    this.name = 'UnsupportedRoleError';
  }
}

// Map JWT claims → User (handles both modern short-form and legacy .NET SOAP claims)
export function userFromToken(token: string): User {
  const c = decodeJwtPayload(token);
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
  const normalizedRole = rawRole.toLowerCase();
  if (UNSUPPORTED_MOBILE_ROLES.has(normalizedRole)) {
    throw new UnsupportedRoleError(rawRole);
  }
  // Normalize: BE sends lowercase ("restaurant"), FE expects uppercase ("RESTAURANT")
  const role: UserRole = ROLE_MAP[normalizedRole] ?? (rawRole.toUpperCase() as UserRole);
  return { id, email, name, role };
}

export const authApi = {
  async login(
    identifier: string,
    password: string,
  ): Promise<{ user: User; accessToken: string; approvalStatus: ApprovalStatus }> {
    const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      identifier,
      password,
    });
    // Resolve the role before persisting anything — throws for roles this app
    // doesn't support (see UNSUPPORTED_MOBILE_ROLES), so no token ever gets
    // stored for a session the app can't actually navigate into.
    const user = userFromToken(data.accessToken);
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    return { user, accessToken: data.accessToken, approvalStatus: mapApprovalStatus(data.approvalStatus) };
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/api/v1/auth/logout', { refreshToken }).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async forgotPassword(identifier: string): Promise<void> {
    await apiClient.post('/api/v1/auth/forgot-password', { identifier });
  },

  async resetPassword(identifier: string, code: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/v1/auth/reset-password', { identifier, code, newPassword });
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

  /**
   * `invoiceLegalName`/`invoiceAddress` map 1:1 to `RegisterRestaurantCommand`'s
   * `InvoiceLegalName`/`InvoiceAddress` (both optional, but `NotEmpty()` when sent —
   * see `RegisterRestaurantCommandValidator`). They are distinct from a restaurant's
   * operating `address` (set later via `RestaurantProfileScreen`) — the command has
   * no generic `Address` field at registration time.
   */
  async register(
    email: string,
    password: string,
    restaurantName: string,
    phone: string,
    taxCode?: string,
    invoiceAddress?: string,
    invoiceLegalName?: string,
  ): Promise<void> {
    await apiClient.post('/api/v1/auth/register', {
      email,
      password,
      restaurantName,
      phone,
      ...(taxCode ? { taxCode } : {}),
      ...(invoiceAddress ? { invoiceAddress } : {}),
      ...(invoiceLegalName ? { invoiceLegalName } : {}),
    });
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
