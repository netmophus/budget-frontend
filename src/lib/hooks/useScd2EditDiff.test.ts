import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useScd2EditDiff } from './useScd2EditDiff';

interface DemoForm extends Record<string, unknown> {
  libelle: string;
  typeStructure: string;
  estActif: boolean;
}

const TODAY = new Date().toISOString().slice(0, 10);
const HIER = '2026-04-30';

const INITIAL: DemoForm = {
  libelle: 'Original',
  typeStructure: 'agence',
  estActif: true,
};

const SCD2_FIELDS = ['libelle', 'typeStructure'] as const;

describe('useScd2EditDiff', () => {
  it('no_op : form === initial → bandeau null + diff vide', () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: INITIAL,
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: HIER,
      }),
    );
    expect(result.current.modeMajPredit).toBe('no_op');
    expect(result.current.bandeau).toBeNull();
    expect(result.current.diff).toEqual({});
    expect(result.current.aDesChangements).toBe(false);
  });

  it('in_place : seul estActif change → bandeau bleu', () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, estActif: false },
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: HIER,
      }),
    );
    expect(result.current.modeMajPredit).toBe('in_place_est_actif');
    expect(result.current.bandeau?.type).toBe('bleu');
    expect(result.current.bandeau?.titre).toMatch(/Mise à jour en place/i);
    expect(result.current.diff).toEqual({ estActif: false });
  });

  it("ecrasement_intra_jour : champ SCD2 + date == today → bandeau info", () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, libelle: 'Renommé' },
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: TODAY,
      }),
    );
    expect(result.current.modeMajPredit).toBe('ecrasement_intra_jour');
    expect(result.current.bandeau?.type).toBe('info');
    expect(result.current.bandeau?.titre).toMatch(/Écrasement intra-jour/i);
    expect(result.current.diff).toEqual({ libelle: 'Renommé' });
  });

  it("nouvelle_version : champ SCD2 + date < today → bandeau jaune", () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, libelle: 'Renommé' },
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: HIER,
      }),
    );
    expect(result.current.modeMajPredit).toBe('nouvelle_version');
    expect(result.current.bandeau?.type).toBe('jaune');
    expect(result.current.bandeau?.titre).toMatch(/SCD2/);
  });

  it("mixte estActif + champ SCD2 → modeMaj = nouvelle_version (le SCD2 prime)", () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, libelle: 'Renommé', estActif: false },
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: HIER,
      }),
    );
    expect(result.current.modeMajPredit).toBe('nouvelle_version');
    // diff inclut bien les 2 champs touchés
    expect(result.current.diff).toEqual({
      libelle: 'Renommé',
      estActif: false,
    });
  });

  it("diff inclut tous les champs SCD2 modifiés", () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, libelle: 'A', typeStructure: 'branche' },
        scd2Fields: [...SCD2_FIELDS],
        dateDebutValiditeInitiale: HIER,
      }),
    );
    expect(result.current.diff).toEqual({
      libelle: 'A',
      typeStructure: 'branche',
    });
  });

  it("sans dateDebutValiditeInitiale : champ SCD2 → nouvelle_version (par défaut)", () => {
    const { result } = renderHook(() =>
      useScd2EditDiff<DemoForm>({
        initial: INITIAL,
        form: { ...INITIAL, libelle: 'Renommé' },
        scd2Fields: [...SCD2_FIELDS],
        // dateDebutValiditeInitiale omis → ne peut pas être today
      }),
    );
    expect(result.current.modeMajPredit).toBe('nouvelle_version');
  });
});
