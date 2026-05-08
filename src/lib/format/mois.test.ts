/**
 * Tests Vitest helper formaterMois (Lot 5-fix-ui).
 */
import { describe, expect, it } from 'vitest';

import { formaterMois } from './mois';

describe('formaterMois', () => {
  it('formate un mois standard YYYY-MM', () => {
    expect(formaterMois('2027-03')).toBe('Mars 2027');
  });

  it('formate Décembre (mois 12)', () => {
    expect(formaterMois('2027-12')).toBe('Décembre 2027');
  });

  it('formate Janvier (mois 01)', () => {
    expect(formaterMois('2026-01')).toBe('Janvier 2026');
  });

  it('rejette un mois > 12', () => {
    expect(formaterMois('2027-13')).toBe('—');
  });

  it('rejette une chaîne vide', () => {
    expect(formaterMois('')).toBe('—');
  });

  it('rejette null', () => {
    expect(formaterMois(null)).toBe('—');
  });

  it('rejette undefined', () => {
    expect(formaterMois(undefined)).toBe('—');
  });

  it('rejette un format non YYYY-MM', () => {
    expect(formaterMois('abc')).toBe('—');
    expect(formaterMois('2027/03')).toBe('—');
    expect(formaterMois('Wed Mar')).toBe('—');
    expect(formaterMois('2027-3')).toBe('—');
  });
});
