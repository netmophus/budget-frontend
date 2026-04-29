import type { ReactNode } from 'react';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { type PermissionMode, useHasPermission } from '@/lib/auth/permissions';

interface PermissionRouteProps {
  permission?: string;
  permissions?: string[];
  mode?: PermissionMode;
  children: ReactNode;
}

export function PermissionRoute({
  permission,
  permissions,
  mode = 'any',
  children,
}: PermissionRouteProps) {
  const codes = permission ? [permission] : permissions ?? [];
  const allowed = useHasPermission(codes, mode);
  if (!allowed) return <ForbiddenPage />;
  return <>{children}</>;
}
