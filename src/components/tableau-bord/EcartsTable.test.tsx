/**
 * Tests Vitest EcartsTable (Lot 5.2.C). Couvre empty state,
 * rendu d'une ligne (badges + montants), changement de tri
 * cliquable.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { type LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsTable } from './EcartsTable';

function makeLigne(over: Partial<LigneEcart> = {}): LigneEcart {
  return {
    codeCr: 'CR_BANDABARI',
    libelleCr: 'Agence Bandabari',
    codeCompte: '6111',
    libelleCompte: 'Charges fournitures',
    classeCompte: '6',
    natureCompte: 'CHARGE',
    codeLigneMetier: 'EXPLOITATION',
    mois: '2026-03',
    libelleMois: 'mars 2026',
    montantBudget: 1_000_000,
    montantRealise: 1_200_000,
    ecart: 200_000,
    ecartAbs: 200_000,
    ecartPct: 20,
    niveauAlerte: 'CRITIQUE',
    sensEcart: 'DEFAVORABLE',
    ...over,
  };
}

describe('EcartsTable', () => {
  afterEach(() => cleanup());

  it('affiche empty state quand aucune ligne', () => {
    render(<EcartsTable lignes={[]} />);
    expect(screen.getByTestId('empty-ecarts')).toBeInTheDocument();
    expect(screen.getByTestId('empty-ecarts').textContent).toContain(
      'Aucune ligne disponible',
    );
  });

  it('rend une ligne avec ses montants formatés et badge nature', () => {
    render(<EcartsTable lignes={[makeLigne()]} />);
    const row = screen.getByTestId('ligne-CR_BANDABARI-6111-2026-03');
    expect(row).toBeInTheDocument();
    expect(row.textContent).toContain('CR_BANDABARI');
    expect(row.textContent).toContain('6111');
    expect(row.textContent).toContain('CHARGE');
    expect(row.textContent).toMatch(/1.000.000/);
    expect(row.textContent).toMatch(/1.200.000/);
    expect(row.textContent).toContain('+20.0%');
    expect(row.textContent).toContain('Critique');
  });

  it('affiche tiret pour montant réalisé null (MANQUANT)', () => {
    const l = makeLigne({
      montantRealise: null,
      ecart: null,
      ecartAbs: null,
      ecartPct: null,
      niveauAlerte: 'MANQUANT',
      sensEcart: null,
    });
    render(<EcartsTable lignes={[l]} />);
    const row = screen.getByTestId('ligne-CR_BANDABARI-6111-2026-03');
    expect(row.textContent).toContain('Manquant');
    // 3 cellules à '—' (réalisé, écart, %)
    expect(row.textContent?.match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('toggle direction de tri au clic sur le même header', () => {
    const l1 = makeLigne({
      codeCompte: '6111',
      ecart: 200_000,
      ecartAbs: 200_000,
    });
    const l2 = makeLigne({
      codeCompte: '6112',
      ecart: 500_000,
      ecartAbs: 500_000,
      mois: '2026-04',
    });
    render(<EcartsTable lignes={[l1, l2]} />);

    // Active la colonne ecart (DESC par défaut au switch) → 6112 en premier
    fireEvent.click(screen.getByTestId('th-ecart'));
    const rowsDesc = screen.getAllByRole('row').slice(1);
    expect(rowsDesc[0]?.textContent).toContain('6112');

    // Re-clic sur ecart → toggle ASC → 6111 en premier
    fireEvent.click(screen.getByTestId('th-ecart'));
    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(rowsAsc[0]?.textContent).toContain('6111');
  });

  it('change de colonne de tri sur clic sur header différent', () => {
    const l1 = makeLigne({ codeCompte: '6111' });
    const l2 = makeLigne({ codeCompte: '6112', mois: '2026-04' });
    render(<EcartsTable lignes={[l1, l2]} />);
    fireEvent.click(screen.getByTestId('th-codeCompte'));
    // tri activé sur codeCompte (DESC par défaut au switch)
    expect(screen.getByTestId('th-codeCompte').textContent).toMatch(/▼/);
  });
});
