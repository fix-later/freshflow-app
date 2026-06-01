import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '../constants';

export const storage = {
  async getAccessToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setAccessToken(token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getRefreshToken() {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getUser() {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async setUser(user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async clearAll() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
