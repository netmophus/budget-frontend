/**
 * Tests EcartsDonutNiveaux (Lot 8.5.C). Teste la fonction pure
 * `compterParNiveau` + la légende custom (compteurs et %).
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsDonutNiveaux } from './EcartsDonutNiveaux';
import { compterParNiveau } from './EcartsDonutNiveaux.utils';

function ligne(over: Partial<LigneEcart> = {}): LigneEcart {
  return {
    codeCr: 'CR_DARH',
    libelleCr: 'Dir. Admin',
    codeCompte: '641000',
    libelleCompte: 'Salaires',
    classeCompte: '6',
    natureCompte: 'CHARGE',
    codeLigneMetier: 'CHANGE',
    mois: '2026-05',
    libelleMois: 'Mai 2026',
    montantBudget: 100,
    montantRealise: 100,
    ecart: 0,
    ecartAbs: 0,
    ecartPct: 0,
    niveauAlerte: 'NORMAL',
    sensEcart: 'NEUTRE',
    ...over,
  };
}

describe('EcartsDonutNiveaux', () => {
  afterEach(() => cleanup());

  it('compterParNiveau : compte les 4 niveaux + pct arrondi à 0.1%', () => {
    const lignes: LigneEcart[] = [
      ligne({ niveauAlerte: 'CRITIQUE' }),
      ligne({ niveauAlerte: 'CRITIQUE' }),
      ligne({ niveauAlerte: 'ATTENTION' }),
      ligne({ niveauAlerte: 'NORMAL' }),
      ligne({ niveauAlerte: 'NORMAL' }),
      ligne({ niveauAlerte: 'NORMAL' }),
      ligne({ niveauAlerte: 'MANQUANT' }),
      ligne({ niveauAlerte: 'MANQUANT' }),
      ligne({ niveauAlerte: 'MANQUANT' }),
      ligne({ niveauAlerte: 'MANQUANT' }),
    ];
    const r = compterParNiveau(lignes);
    expect(r).toHaveLength(4);
    const critique = r.find((p) => p.niveau === 'CRITIQUE')!;
    expect(critique.count).toBe(2);
    expect(critique.pct).toBe(20);
    const attention = r.find((p) => p.niveau === 'ATTENTION')!;
    expect(attention.count).toBe(1);
    expect(attention.pct).toBe(10);
    const normal = r.find((p) => p.niveau === 'NORMAL')!;
    expect(normal.count).toBe(3);
    expect(normal.pct).toBe(30);
    const manquant = r.find((p) => p.niveau === 'MANQUANT')!;
    expect(manquant.count).toBe(4);
    expect(manquant.pct).toBe(40);
  });

  it('compterParNiveau : 0 ligne → 4 segments à count=0 et pct=0', () => {
    const r = compterParNiveau([]);
    expect(r).toHaveLength(4);
    for (const p of r) {
      expect(p.count).toBe(0);
      expect(p.pct).toBe(0);
    }
  });

  it('affiche la légende avec les 4 niveaux et le total', () => {
    const lignes: LigneEcart[] = [
      ligne({ niveauAlerte: 'CRITIQUE' }),
      ligne({ niveauAlerte: 'ATTENTION' }),
      ligne({ niveauAlerte: 'NORMAL' }),
    ];
    render(<EcartsDonutNiveaux lignes={lignes} />);
    const legende = screen.getByTestId('graph-donut-legende');
    expect(within(legende).getByText('Critique')).toBeInTheDocument();
    expect(within(legende).getByText('Attention')).toBeInTheDocument();
    expect(within(legende).getByText('Normal')).toBeInTheDocument();
    expect(within(legende).getByText('Manquant')).toBeInTheDocument();
    expect(within(legende).getByText('Total')).toBeInTheDocument();
    expect(within(legende).getByText('3')).toBeInTheDocument();
  });

  it('affiche l\'état vide quand 0 ligne (pas de donut)', () => {
    render(<EcartsDonutNiveaux lignes={[]} />);
    expect(screen.getByTestId('graph-donut-vide')).toHaveTextContent(
      'Aucune ligne à représenter',
    );
  });
});
