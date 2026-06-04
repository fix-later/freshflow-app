import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { type User } from '../types/common.types';
import { AuthContext } from './authStore';
import { TOKEN_KEY } from '../services/api/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app start
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          // TODO: call GET /auth/me to validate token and get user info
          // For now, just set loading false and let the app show login
        }
      } catch {
        // No stored token — proceed to login
      } finally {
        // Small delay for smooth splash transition
        setTimeout(() => setIsLoading(false), 1200);
      }
    }
    initAuth();
  }, []);

  const signIn = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
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
