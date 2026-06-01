import apiClient from './apiClient';
import { storage } from '../utils/storage';

export const authService = {
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data.data;
    await storage.setAccessToken(accessToken);
    await storage.setRefreshToken(refreshToken);
    await storage.setUser(user);
    return user;
  },

  async logout() {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (_) {
      // ignore errors on logout
    } finally {
      await storage.clearAll();
    }
  },

  async getMe() {
    return await storage.getUser();
  },
};
