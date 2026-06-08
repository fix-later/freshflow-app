import { useCallback, useEffect, useState } from 'react';
import { type User } from '../types/common.types';
import { AuthContext } from './authStore';
import { TOKEN_KEY, registerSignOut } from '../services/api/client';
import { authApi, userFromToken, REFRESH_TOKEN_KEY } from '../features/auth/api/authApi';
import * as SecureStore from 'expo-secure-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Give the axios interceptor a way to trigger sign-out when refresh fails
  useEffect(() => {
    registerSignOut(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  // Restore session from stored tokens on app start
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          // Parse user info from the JWT — no extra network call needed
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
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
    setUser(null);
    setToken(null);
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
