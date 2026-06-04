// Temporary React Context implementation — migrate to Zustand after: npm install zustand
import { createContext, useContext } from 'react';
import { type User } from '../types/common.types';

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  setLoading: (loading: boolean) => void;
}

export const AuthContext = createContext<AuthStore | null>(null);

export function useAuthStore(): AuthStore {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be inside AuthProvider');
  return ctx;
}
