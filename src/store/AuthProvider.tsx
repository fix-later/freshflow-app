import { useState } from 'react';
import { type User } from '../types/common.types';
import { AuthContext } from './authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signIn = (u: User, t: string) => {
    setUser(u);
    setToken(t);
  };

  const signOut = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
