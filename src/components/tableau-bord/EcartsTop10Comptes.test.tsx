/**
 * Tests EcartsTop10Comptes (Lot 8.5.C). Teste la fonction pure
 * `selectionnerTopN` (filtrage null, tri décroissant, slice N) + le
 * rendu du conteneur.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsTop10Comptes } from './EcartsTop10Comptes';
import { selectionnerTopN } from './EcartsTop10Comptes.utils';

function ligne(over: Partial<LigneEcart> = {}): LigneEcart {
  return {
    codeCr: 'CR_DARH',
    libelleCr: 'Dir. Admin',
    codeCompte: '641000',
    libelleCompte: 'Salaires conformes au budget',
    classeCompte: '6',
    natureCompte: 'CHARGE',
    codeLigneMetier: 'CHANGE',
    mois: '2026-05',
    libelleMois: 'Mai 2026',
    montantBudget: 100,
    montantRealise: 110,
    ecart: 10,
    ecartAbs: 10,
    ecartPct: 10,
    tauxExecution: 110,
    niveauAlerte: 'ATTENTION',
    sensEcart: 'DEFAVORABLE',
    ...over,
  };
}

describe('EcartsTop10Comptes', () => {
  afterEach(() => cleanup());

  it('selectionnerTopN : filtre les ecartAbs null + trie décroissant + slice N', () => {
    const lignes: LigneEcart[] = [
      ligne({ codeCompte: '622100', ecartAbs: null, montantRealise: null, niveauAlerte: 'MANQUANT' }),
      ligne({ codeCompte: '702930', ecartAbs: 50_000_000, niveauAlerte: 'CRITIQUE' }),
      ligne({ codeCompte: '641000', ecartAbs: 3_000_000 }),
      ligne({ codeCompte: '623200', ecartAbs: 15_000_000 }),
      ligne({ codeCompte: '707210', ecartAbs: 100_000 }),
    ];
    const top = selectionnerTopN(lignes, 3);
    expect(top).toHaveLength(3);
    expect(top[0]?.codeCompte).toBe('702930');
    expect(top[1]?.codeCompte).toBe('623200');
    expect(top[2]?.codeCompte).toBe('641000');
    // MANQUANT (ecartAbs=null) bien filtré
    expect(top.find((p) => p.codeCompte === '622100')).toBeUndefined();
  });

  it('selectionnerTopN : label contient codeCompte + libelle tronqué + libelleMois', () => {
    const lignes: LigneEcart[] = [
      ligne({
        codeCompte: '641000',
        libelleCompte: 'Très long libellé de compte qui sera tronqué',
        libelleMois: 'Mai 2026',
        ecartAbs: 1000,
      }),
    ];
    const top = selectionnerTopN(lignes, 10);
    expect(top[0]?.label).toMatch(/^641000/);
    expect(top[0]?.label).toMatch(/Mai 2026/);
    // Tronqué (max 18 chars + …)
    expect(top[0]?.label).toContain('…');
  });

  it('affiche l\'état vide (sur + sous) quand aucune performance rankable', () => {
    const lignes: LigneEcart[] = [
      ligne({ ecartAbs: null, montantRealise: null, niveauAlerte: 'MANQUANT' }),
    ];
    render(<EcartsTop10Comptes lignes={lignes} />);
    expect(screen.getByTestId('graph-top10-sur-vide')).toHaveTextContent(
      'Aucune ligne à représenter',
    );
    expect(screen.getByTestId('graph-top10-sous-vide')).toBeInTheDocument();
  });

  it('sépare sur-performances (favorables) et sous-performances (défavorables)', () => {
    const lignes: LigneEcart[] = [
      ligne({ codeCompte: '701', sensEcart: 'FAVORABLE', ecartAbs: 9_000 }),
      ligne({ codeCompte: '601', sensEcart: 'DEFAVORABLE', ecartAbs: 8_000 }),
    ];
    render(<EcartsTop10Comptes lignes={lignes} />);
    expect(screen.getByTestId('graph-top10-sur')).toBeInTheDocument();
    expect(screen.getByTestId('graph-top10-sous')).toBeInTheDocument();
    // Aucun des deux n'est en état vide (1 ligne par sens).
    expect(screen.queryByTestId('graph-top10-sur-vide')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('graph-top10-sous-vide'),
    ).not.toBeInTheDocument();
  });
});
