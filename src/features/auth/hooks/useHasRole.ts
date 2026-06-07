import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../constants/roles';

/**
 * Hook to check if the current user has one of the allowed roles.
 * @param allowedRoles A single role or an array of roles.
 * @returns boolean indicating if the user has access.
 */
export function useHasRole(allowedRoles: UserRole | UserRole[]): boolean {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return false;

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return rolesArray.includes(user.role);
}
