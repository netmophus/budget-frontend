/**
 * Tests Vitest KpiCardsRow (Lot 5-fix-ui) — affichage en état
 * normal vs état erreur ("—" au lieu de chiffres).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { type KpiEcarts } from '@/lib/api/tableau-bord';
import { KpiCardsRow } from './KpiCardsRow';

const KPI_OK: KpiEcarts = {
  nbEcartsTotal: 17,
  nbEcartsCritique: 4,
  nbEcartsAttention: 6,
  nbLignesManquantes: 2,
  ecartTotalAbs: 12_345_678,
  ecartTotalDefavorable: 9_000_000,
  ecartTotalFavorable: 3_345_678,
};

describe('KpiCardsRow', () => {
  afterEach(() => cleanup());

  it('mode normal : affiche les chiffres formatés FR', () => {
    render(<KpiCardsRow kpi={KPI_OK} />);
    expect(screen.getByTestId('kpi-total').textContent).toBe('17');
    expect(screen.getByTestId('kpi-critique').textContent).toBe('4');
    expect(screen.getByTestId('kpi-attention').textContent).toBe('6');
    expect(screen.getByTestId('kpi-total-abs').textContent).toMatch(
      /12.345.678/,
    );
  });

  it("mode erreur : affiche '—' à la place des chiffres", () => {
    render(<KpiCardsRow kpi={KPI_OK} erreur={true} />);
    expect(screen.getByTestId('kpi-total').textContent).toBe('—');
    expect(screen.getByTestId('kpi-critique').textContent).toBe('—');
    expect(screen.getByTestId('kpi-attention').textContent).toBe('—');
    expect(screen.getByTestId('kpi-total-abs').textContent).toBe('—');
    // Vérifie aussi que les montants défavorable/favorable passent en —
    const all = document.body.textContent ?? '';
    expect(all).toContain('défavorable :');
    expect(all).not.toContain('12.345.678');
    expect(all).not.toContain('9.000.000');
  });

  it("erreur=false explicite équivaut au mode normal", () => {
    render(<KpiCardsRow kpi={KPI_OK} erreur={false} />);
    expect(screen.getByTestId('kpi-total').textContent).toBe('17');
  });
});
