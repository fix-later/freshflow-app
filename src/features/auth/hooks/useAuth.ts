// TODO: wire up to authApi after API is configured
import { useAuthStore } from '../../../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, signIn, signOut } = useAuthStore();
  return { user, isAuthenticated, signIn, signOut };
}
