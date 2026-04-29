import { useAuthStore } from './auth-store';

export type PermissionMode = 'any' | 'all';

export function hasPermission(
  permissions: string[],
  mode: PermissionMode = 'any',
): boolean {
  const possessed = new Set(
    useAuthStore.getState().permissions.map((p) => p.code_permission),
  );
  if (permissions.length === 0) return true;
  return mode === 'all'
    ? permissions.every((p) => possessed.has(p))
    : permissions.some((p) => possessed.has(p));
}

export function hasAnyPermission(codes: string[]): boolean {
  return hasPermission(codes, 'any');
}

export function hasAllPermissions(codes: string[]): boolean {
  return hasPermission(codes, 'all');
}

export function useHasPermission(
  codes: string | string[],
  mode: PermissionMode = 'any',
): boolean {
  const list = typeof codes === 'string' ? [codes] : codes;
  const permissions = useAuthStore((s) => s.permissions);
  const possessed = new Set(permissions.map((p) => p.code_permission));
  if (list.length === 0) return true;
  return mode === 'all'
    ? list.every((p) => possessed.has(p))
    : list.some((p) => possessed.has(p));
}
