import { apiClient } from '../../../services/api/client';

export interface UserProfileDto {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
}

export const profileApi = {
  async getProfile(): Promise<UserProfileDto> {
    const { data } = await apiClient.get<UserProfileDto>('/api/v1/profile/me');
    return data;
  },

  async updateProfile(
    fullName: string,
    phone: string,
    avatarUrl?: string,
  ): Promise<UserProfileDto> {
    const { data } = await apiClient.put<UserProfileDto>('/api/v1/profile/me', {
      fullName,
      phone,
      avatarUrl,
    });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword });
  },
};
