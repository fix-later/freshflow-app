import React from 'react';
import { useHasRole } from '../hooks/useHasRole';
import { UserRole } from '../../../constants/roles';

interface RoleGateProps {
  /**
   * The role or list of roles that are allowed to see the children.
   */
  allowedRoles: UserRole | UserRole[];
  /**
   * The content to render if the user has the required role.
   */
  children: React.ReactNode;
  /**
   * An optional fallback component to render if the user does not have the required role.
   * Defaults to null.
   */
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that conditionally renders its children
 * based on whether the current user has one of the allowed roles.
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const hasAccess = useHasRole(allowedRoles);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
