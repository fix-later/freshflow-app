import { apiClient } from '../../../services/api/client';

interface UserProfileDto {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: string;
}

export const profileApi = {
  async getProfile(): Promise<UserProfileDto> {
    const { data } = await apiClient.get<UserProfileDto>('/api/v1/users/me');
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword });
  },
};
