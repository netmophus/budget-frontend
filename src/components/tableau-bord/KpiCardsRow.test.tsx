/**
 * Tests Vitest KpiCardsRow — refonte « compte de résultat » (PR1) :
 * 2 lignes (PNB/CE Budget vs Réalisé + compteurs alertes), état erreur.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { type KpiEcarts, type TotauxEcarts } from '@/lib/api/tableau-bord';
import { KpiCardsRow } from './KpiCardsRow';

const KPI_OK: KpiEcarts = {
  nbEcartsTotal: 17,
  nbEcartsCritique: 4,
  nbEcartsAttention: 6,
  nbLignesManquantes: 2,
  nbSansBudget: 3,
  ecartTotalAbs: 12_345_678,
  ecartTotalDefavorable: 9_000_000,
  ecartTotalFavorable: 3_345_678,
};

const TOTAUX_OK: TotauxEcarts = {
  produits: { budget: 5_000_000, realise: 4_800_000, ecart: -200_000, tauxExecution: 96 },
  charges: { budget: 3_000_000, realise: 3_200_000, ecart: 200_000, tauxExecution: 106.7 },
  solde: { budget: 2_000_000, realise: 1_600_000, ecart: -400_000, tauxExecution: 80 },
  pnb: { budget: 5_000_000, realise: 4_800_000, ecart: -200_000, tauxExecution: 96 },
  coefExploitationBudget: 60,
  coefExploitationRealise: 66.7,
};

describe('KpiCardsRow', () => {
  afterEach(() => cleanup());

  it('mode normal : PNB / CE + compteurs affichés', () => {
    render(<KpiCardsRow kpi={KPI_OK} totaux={TOTAUX_OK} />);
    expect(screen.getByTestId('kpi-pnb-budget').textContent).toMatch(
      /5.000.000/,
    );
    expect(screen.getByTestId('kpi-pnb-realise').textContent).toMatch(
      /4.800.000/,
    );
    expect(screen.getByTestId('kpi-ce-budget').textContent).toContain('60');
    expect(screen.getByTestId('kpi-ce-realise').textContent).toContain('66');
    expect(screen.getByTestId('kpi-total').textContent).toBe('17');
    expect(screen.getByTestId('kpi-critique').textContent).toBe('4');
    expect(screen.getByTestId('kpi-attention').textContent).toBe('6');
    expect(screen.getByTestId('kpi-sans-budget').textContent).toBe('3');
  });

  it("mode erreur : affiche '—' partout", () => {
    render(<KpiCardsRow kpi={KPI_OK} totaux={TOTAUX_OK} erreur={true} />);
    expect(screen.getByTestId('kpi-pnb-budget').textContent).toBe('—');
    expect(screen.getByTestId('kpi-pnb-realise').textContent).toBe('—');
    expect(screen.getByTestId('kpi-ce-budget').textContent).toBe('—');
    expect(screen.getByTestId('kpi-total').textContent).toBe('—');
    expect(screen.getByTestId('kpi-sans-budget').textContent).toBe('—');
  });

  it('CE null → affiche « — »', () => {
    render(
      <KpiCardsRow
        kpi={KPI_OK}
        totaux={{
          ...TOTAUX_OK,
          coefExploitationBudget: null,
          coefExploitationRealise: null,
        }}
      />,
    );
    expect(screen.getByTestId('kpi-ce-budget').textContent).toBe('—');
    expect(screen.getByTestId('kpi-ce-realise').textContent).toBe('—');
  });
});
