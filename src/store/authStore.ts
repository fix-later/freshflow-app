// Temporary React Context implementation — migrate to Zustand after: npm install zustand
import { createContext, useContext } from 'react';
import { type User } from '../types/common.types';

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearSessionExpired: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const AuthContext = createContext<AuthStore | null>(null);

export function useAuthStore(): AuthStore {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be inside AuthProvider');
  return ctx;
}
