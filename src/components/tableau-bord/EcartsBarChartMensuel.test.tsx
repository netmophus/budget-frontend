/**
 * Tests EcartsBarChartMensuel (Lot 8.5.C). Pas de snapshot SVG : on
 * teste la fonction pure `aggregerParMois` + le rendu DOM
 * (légende custom, état vide). Recharts n'a pas besoin d'être monté
 * pour valider la logique d'agrégation.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsBarChartMensuel } from './EcartsBarChartMensuel';
import { aggregerParMois } from './EcartsBarChartMensuel.utils';

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
    montantRealise: 110,
    ecart: 10,
    ecartAbs: 10,
    ecartPct: 10,
    tauxExecution: 110,
    niveauAlerte: 'CRITIQUE',
    sensEcart: 'DEFAVORABLE',
    ...over,
  };
}

describe('EcartsBarChartMensuel', () => {
  afterEach(() => cleanup());

  it('aggregerParMois : somme budget + réalisé par mois, tri chronologique YYYY-MM', () => {
    const lignes: LigneEcart[] = [
      ligne({ mois: '2026-06', libelleMois: 'Juin 2026', montantBudget: 50, montantRealise: 60 }),
      ligne({ mois: '2026-01', libelleMois: 'Janvier 2026', montantBudget: 30, montantRealise: 20 }),
      ligne({ mois: '2026-01', libelleMois: 'Janvier 2026', montantBudget: 70, montantRealise: 80 }),
      ligne({ mois: '2026-06', libelleMois: 'Juin 2026', montantBudget: 25, montantRealise: null }),
    ];
    const agg = aggregerParMois(lignes);
    expect(agg).toHaveLength(2);
    // Tri chronologique : janvier avant juin (pas alphabétique)
    expect(agg[0]?.mois).toBe('2026-01');
    expect(agg[0]?.budget).toBe(100);
    expect(agg[0]?.realise).toBe(100);
    expect(agg[1]?.mois).toBe('2026-06');
    expect(agg[1]?.budget).toBe(75);
    // null réalisé compté comme 0 (et non NaN)
    expect(agg[1]?.realise).toBe(60);
  });

  it('rend la légende custom Budget / Réalisé en bas du chart', () => {
    render(<EcartsBarChartMensuel lignes={[ligne()]} />);
    expect(screen.getByTestId('graph-barres-mensuelles')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Réalisé')).toBeInTheDocument();
  });

  it('affiche l\'état vide quand 0 ligne (pas de chart)', () => {
    render(<EcartsBarChartMensuel lignes={[]} />);
    expect(screen.getByTestId('graph-barres-vide')).toHaveTextContent(
      'Aucune ligne à représenter',
    );
  });
});
