/**
 * Tests EcartsBarChartDimension (PR2) — agrégation par dimension
 * (CR / ligne métier) + rendu du conteneur / état vide.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsBarChartCR } from './EcartsBarChartCR';
import {
  aggregerParCR,
  aggregerParLigneMetier,
} from './EcartsBarChartDimension.utils';

function ligne(over: Partial<LigneEcart> = {}): LigneEcart {
  return {
    codeCr: 'CR_A',
    libelleCr: 'CR A',
    codeCompte: '601',
    libelleCompte: 'Charge',
    classeCompte: '6',
    natureCompte: 'CHARGE',
    codeLigneMetier: 'RETAIL',
    mois: '2026-03',
    libelleMois: 'mars 2026',
    montantBudget: 100,
    montantRealise: 120,
    ecart: 20,
    ecartAbs: 20,
    ecartPct: 20,
    tauxExecution: 120,
    niveauAlerte: 'CRITIQUE',
    sensEcart: 'DEFAVORABLE',
    ...over,
  };
}

describe('aggregerParCR / aggregerParLigneMetier', () => {
  it('agrège budget/réalisé par CR et trie par écart absolu décroissant', () => {
    const lignes = [
      ligne({ codeCr: 'CR_A', montantBudget: 100, montantRealise: 110 }), // écart 10
      ligne({ codeCr: 'CR_A', montantBudget: 200, montantRealise: 200 }), // écart 0
      ligne({ codeCr: 'CR_B', montantBudget: 100, montantRealise: 400 }), // écart 300
    ];
    const r = aggregerParCR(lignes);
    expect(r).toHaveLength(2);
    // CR_B (écart 300) avant CR_A (écart 10).
    expect(r[0]!.cle).toBe('CR_B');
    expect(r[0]!.ecartAbs).toBe(300);
    // CR_A agrégé : budget 300, réalisé 310 → taux 103.3
    expect(r[1]!.cle).toBe('CR_A');
    expect(r[1]!.budget).toBe(300);
    expect(r[1]!.realise).toBe(310);
  });

  it('budget nul → tauxExecution null', () => {
    const r = aggregerParCR([
      ligne({ codeCr: 'CR_X', montantBudget: 0, montantRealise: 50 }),
    ]);
    expect(r[0]!.tauxExecution).toBeNull();
  });

  it('agrège par ligne métier', () => {
    const lignes = [
      ligne({ codeLigneMetier: 'RETAIL', montantBudget: 100, montantRealise: 100 }),
      ligne({ codeLigneMetier: 'CORP', montantBudget: 100, montantRealise: 250 }),
    ];
    const r = aggregerParLigneMetier(lignes);
    expect(r[0]!.cle).toBe('CORP'); // plus gros écart
  });

  it('top 10 : tronque au-delà de 10 dimensions', () => {
    const lignes = Array.from({ length: 15 }, (_, i) =>
      ligne({
        codeCr: `CR_${i}`,
        montantBudget: 100,
        montantRealise: 100 + i * 10,
      }),
    );
    expect(aggregerParCR(lignes)).toHaveLength(10);
  });
});

describe('EcartsBarChartCR (rendu)', () => {
  afterEach(() => cleanup());

  it('rend le conteneur', () => {
    render(<EcartsBarChartCR lignes={[ligne()]} onSelectCr={vi.fn()} />);
    expect(screen.getByTestId('graph-barres-cr')).toBeInTheDocument();
  });

  it('état vide si aucune ligne', () => {
    render(<EcartsBarChartCR lignes={[]} onSelectCr={vi.fn()} />);
    expect(screen.getByTestId('graph-barres-cr-vide')).toBeInTheDocument();
  });
});
