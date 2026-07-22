import { useCallback, useEffect, useState } from 'react';
import { type User } from '../types/common.types';
import { AuthContext } from './authStore';
import { TOKEN_KEY, registerSignOut } from '../services/api/client';
import { authApi, userFromToken, REFRESH_TOKEN_KEY } from '../features/auth/api/authApi';
import { driverRouteStore } from '../features/delivery/store/driverRouteStore';
import * as SecureStore from 'expo-secure-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Give the axios interceptor a way to trigger sign-out + session-expired flag
  useEffect(() => {
    registerSignOut(() => {
      setUser(null);
      setToken(null);
      setSessionExpired(true);
      // Module-level feature stores (e.g. driverRouteStore) survive across sign-in/out —
      // clear them here so a stale driver's route/stops can't leak into the next session.
      driverRouteStore.reset();
    });
  }, []);

  // Restore session from stored tokens on app start
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          const restoredUser = userFromToken(storedToken);
          setUser(restoredUser);
          setToken(storedToken);
        }
      } catch {
        // Token missing or malformed — fall through to login
      } finally {
        setTimeout(() => setIsLoading(false), 1200);
      }
    }
    initAuth();
  }, []);

  const signIn = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
    setUser(null);
    setToken(null);
    driverRouteStore.reset();
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        signIn,
        signOut,
        setLoading,
        clearSessionExpired,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
