import { type ReactNode } from 'react';
import { type PermissionMode, useHasPermission } from '@/lib/auth/permissions';

interface CanPropsSingle {
  permission: string;
  permissions?: never;
  mode?: never;
  children: ReactNode;
  fallback?: ReactNode;
}

interface CanPropsMulti {
  permission?: never;
  permissions: string[];
  mode?: PermissionMode;
  children: ReactNode;
  fallback?: ReactNode;
}

type CanProps = CanPropsSingle | CanPropsMulti;

export function Can(props: CanProps) {
  const codes =
    'permission' in props && props.permission
      ? [props.permission]
      : props.permissions ?? [];
  const mode: PermissionMode = 'mode' in props && props.mode ? props.mode : 'any';
  const allowed = useHasPermission(codes, mode);

  if (!allowed) return <>{props.fallback ?? null}</>;
  return <>{props.children}</>;
}
