import { create } from 'zustand';
import { authService } from '../services/authService';
import { signalRService } from '../services/signalRService';
import { storage } from '../utils/storage';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Restore session on app start
  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await storage.getUser();
      const token = await storage.getAccessToken();
      if (user && token) {
        set({ user, isAuthenticated: true });
      }
    } catch (_) {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const user = await authService.login(email, password);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await signalRService.disconnectAll();
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  // Called by apiClient interceptor on token expiry
  forceLogout: async () => {
    await signalRService.disconnectAll();
    await storage.clearAll();
    set({ user: null, isAuthenticated: false });
  },
}));
