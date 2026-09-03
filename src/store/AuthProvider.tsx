import { useCallback, useEffect, useState } from 'react';
import { type User } from '../types/common.types';
import { AuthContext } from './authStore';
import { TOKEN_KEY, registerSignOut } from '../services/api/client';
import {
  authApi,
  userFromToken,
  REFRESH_TOKEN_KEY,
  UnsupportedRoleError,
} from '../features/auth/api/authApi';
import { driverRouteStore } from '../features/delivery/store/driverRouteStore';
import * as SecureStore from 'expo-secure-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Distinct from sessionExpired: shown when the app can't sign the user back
  // in for a reason other than "please log in again" — e.g. a stored token
  // belongs to a role the mobile app doesn't support at all.
  const [authNotice, setAuthNotice] = useState<string | null>(null);

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
      } catch (err) {
        // Stored token is malformed, or (userFromToken throws) belongs to a
        // role this app doesn't support — e.g. an admin/operations_manager
        // token saved before UNSUPPORTED_MOBILE_ROLES covered it. Previously
        // this just fell through to the login screen with the bad token left
        // in SecureStore, so the user got silently bounced back to login on
        // every single app launch with no explanation. Clear it so that
        // can't repeat, and — for the "role not supported" case — say why.
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
        if (err instanceof UnsupportedRoleError) {
          setAuthNotice(err.message);
        }
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
    setAuthNotice(null);
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

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  // Used when a signed-in session turns out to be unusable for a reason only
  // discoverable after sign-in — e.g. AppNavigator finds no mobile stack for
  // the user's role (a role that isn't in UNSUPPORTED_MOBILE_ROLES today but
  // has no case in its role→stack map either). Signs the user out locally
  // and surfaces why, instead of just rendering the login screen with no
  // explanation as if the credentials themselves had failed.
  const forceSignOutWithNotice = useCallback((message: string) => {
    setUser(null);
    setToken(null);
    driverRouteStore.reset();
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    setAuthNotice(message);
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
        authNotice,
        signIn,
        signOut,
        setLoading,
        clearSessionExpired,
        clearAuthNotice,
        forceSignOutWithNotice,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
