/**
 * Tests unitaires de la primitive d'agrégation compte × ligne métier
 * (partagée DetailCrModal / ImpressionCrPage).
 */
import { describe, expect, it } from 'vitest';

import type { FaitBudget } from '@/lib/api/budget';
import {
  agregerFaitsParCompteLigneMetier,
  construirePivotCr,
  PLACEHOLDER_VIDE,
} from './agregation-cr';

/** Construit un fait minimal (seuls les champs utilisés sont renseignés). */
function fait(
  compteCode: string | null,
  lmCode: string | null,
  montant: number,
  compteLibelle = compteCode ?? '',
  lmLibelle = lmCode ?? '',
): FaitBudget {
  return {
    montantDevise: montant,
    compte: compteCode
      ? { id: compteCode, code: compteCode, libelle: compteLibelle }
      : undefined,
    ligneMetier: lmCode
      ? { id: lmCode, code: lmCode, libelle: lmLibelle }
      : undefined,
  } as unknown as FaitBudget;
}

describe('agregerFaitsParCompteLigneMetier', () => {
  it('agrégation simple : 1 fait → 1 cellule', () => {
    const agg = agregerFaitsParCompteLigneMetier([fait('701', 'LM_PART', 1000)]);
    expect(agg.cellules).toHaveLength(1);
    expect(agg.cellules[0]).toMatchObject({
      compteCode: '701',
      lmCode: 'LM_PART',
      montant: 1000,
    });
    expect(agg.comptes).toEqual([{ code: '701', libelle: '701' }]);
    expect(agg.lignesMetier).toEqual([{ code: 'LM_PART', libelle: 'LM_PART' }]);
  });

  it('sommation multi-fait sur le même couple compte × LM', () => {
    const agg = agregerFaitsParCompteLigneMetier([
      fait('701', 'LM_PART', 1000),
      fait('701', 'LM_PART', 250),
      fait('701', 'LM_PART', -50),
    ]);
    expect(agg.cellules).toHaveLength(1);
    expect(agg.cellules[0]!.montant).toBe(1200);
  });

  it('lignes métier dynamiques : comptes et LM distincts triés', () => {
    const agg = agregerFaitsParCompteLigneMetier([
      fait('702', 'LM_PME', 300),
      fait('701', 'LM_PART', 100),
      fait('701', 'LM_PME', 200),
    ]);
    expect(agg.comptes.map((c) => c.code)).toEqual(['701', '702']);
    expect(agg.lignesMetier.map((l) => l.code)).toEqual(['LM_PART', 'LM_PME']);
    expect(agg.cellules).toHaveLength(3);
  });

  it('compte / LM absent → marqueur « — » (jamais inventé)', () => {
    const agg = agregerFaitsParCompteLigneMetier([fait(null, null, 500)]);
    expect(agg.cellules[0]).toMatchObject({
      compteCode: PLACEHOLDER_VIDE,
      lmCode: PLACEHOLDER_VIDE,
      montant: 500,
    });
  });
});

describe('construirePivotCr', () => {
  it('pivot : colonnes dynamiques + totaux ligne/colonne/général', () => {
    const agg = agregerFaitsParCompteLigneMetier([
      fait('701', 'LM_PART', 100),
      fait('701', 'LM_PME', 200),
      fait('702', 'LM_PME', 300),
    ]);
    const pivot = construirePivotCr(agg);

    expect(pivot.lignesMetier.map((l) => l.code)).toEqual([
      'LM_PART',
      'LM_PME',
    ]);
    // Ligne 701 : 100 + 200 = 300.
    const l701 = pivot.lignes.find((l) => l.compteCode === '701')!;
    expect(l701.montants).toEqual({ LM_PART: 100, LM_PME: 200 });
    expect(l701.totalLigne).toBe(300);
    // Totaux colonnes + général.
    expect(pivot.totauxParLm).toEqual({ LM_PART: 100, LM_PME: 500 });
    expect(pivot.totalGeneral).toBe(600);
  });

  it('cellule absente : la clé LM est omise (le consommateur affiche « — »)', () => {
    const agg = agregerFaitsParCompteLigneMetier([
      fait('701', 'LM_PART', 100),
      fait('702', 'LM_PME', 300),
    ]);
    const pivot = construirePivotCr(agg);
    const l701 = pivot.lignes.find((l) => l.compteCode === '701')!;
    // 701 n'a pas de cellule sur LM_PME → clé absente.
    expect(l701.montants.LM_PME).toBeUndefined();
    expect(l701.totalLigne).toBe(100);
  });
});
