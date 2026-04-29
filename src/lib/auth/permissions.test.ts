import { beforeEach, describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';
import { useAuthStore } from './auth-store';

describe('hasPermission', () => {
  beforeEach(() => {
    useAuthStore.setState({
      permissions: [
        {
          code_permission: 'USER.LIRE',
          module: 'USER',
          perimetre_type: 'global',
          perimetre_id: null,
        },
        {
          code_permission: 'AUDIT.LIRE',
          module: 'AUDIT',
          perimetre_type: 'global',
          perimetre_id: null,
        },
      ],
    });
  });

  it("mode 'any': returns true if at least one matches", () => {
    expect(hasPermission(['USER.LIRE', 'USER.GERER'], 'any')).toBe(true);
  });

  it("mode 'all': returns false if any is missing", () => {
    expect(hasPermission(['USER.LIRE', 'USER.GERER'], 'all')).toBe(false);
  });

  it("mode 'all': returns true if all are held", () => {
    expect(hasPermission(['USER.LIRE', 'AUDIT.LIRE'], 'all')).toBe(true);
  });

  it('returns true on empty list (no requirement)', () => {
    expect(hasPermission([])).toBe(true);
  });
});
