/**
 * Tests LignesSaisiesTable — tableau récap des lignes saisies :
 * indicateurs PNB, déduction du mode, pagination, actions, readOnly.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GrilleLigne } from '@/lib/api/budget-grille';
import { LignesSaisiesTable } from './LignesSaisiesTable';

const MOIS = Array.from(
  { length: 12 },
  (_, i) => `2027-${String(i + 1).padStart(2, '0')}-01`,
);

function cellules(montants: number[], commentaire: string | null = null) {
  return MOIS.map((mois, i) => ({
    mois,
    montant: montants[i] ?? 0,
    modeSaisie: 'MONTANT' as const,
    encoursMoyen: null,
    tie: null,
    commentaire,
    ligneId: montants[i] ? `f-${mois}` : null,
  }));
}

function ligne(
  id: string,
  code: string,
  classe: string,
  montants: number[],
  commentaire: string | null = null,
): GrilleLigne {
  return {
    compte: {
      id,
      codeCompte: code,
      libelle: `Libellé ${code}`,
      classe,
      sens: null,
      estPorteurInterets: false,
    },
    ligneMetier: { id: 'lm1', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
    cellules: cellules(montants, commentaire),
    totalAnnee: montants.reduce((s, v) => s + v, 0),
  };
}

// Ligne produits (classe 7), uniforme → annuel, total 1200.
const ligneA = ligne('a', '701000', '7', Array(12).fill(100), 'Hyp. A');
// Ligne charges (classe 6), saisonnière → mensuel, total 500.
const ligneB = ligne(
  'b',
  '601000',
  '6',
  [500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
);

function renderTable(props: Partial<Parameters<typeof LignesSaisiesTable>[0]> = {}) {
  return render(
    <LignesSaisiesTable
      lignes={[ligneA, ligneB]}
      moisKeys={MOIS}
      page={0}
      limit={20}
      onPageChange={vi.fn()}
      onLimitChange={vi.fn()}
      onModifier={vi.fn()}
      onSupprimer={vi.fn()}
      readOnly={false}
      editingKey={null}
      vueConsolidee={false}
      onToggleVue={vi.fn()}
      {...props}
    />,
  );
}

describe('LignesSaisiesTable', () => {
  it('état vide quand aucune ligne', () => {
    renderTable({ lignes: [] });
    expect(screen.getByTestId('lignes-saisies-vide')).toBeInTheDocument();
  });

  it('affiche une ligne par saisie', () => {
    renderTable();
    expect(screen.getAllByTestId('ligne-saisie-row')).toHaveLength(2);
  });

  it('déduit le mode : uniforme → annuel, saisonnier → mensuel', () => {
    renderTable();
    expect(screen.getByText('annuel')).toBeInTheDocument();
    expect(screen.getByText('mensuel')).toBeInTheDocument();
  });

  it('indicateurs de synthèse : produits, charges, PNB', () => {
    renderTable();
    // 1200 produits (classe 7), 500 charges (classe 6), PNB = 700.
    expect(screen.getByTestId('synthese-produits').textContent).toContain(
      '200',
    );
    expect(screen.getByTestId('synthese-charges').textContent).toContain(
      '500',
    );
    expect(screen.getByTestId('synthese-pnb').textContent).toContain('700');
  });

  it('appelle onModifier et onSupprimer', () => {
    const onModifier = vi.fn();
    const onSupprimer = vi.fn();
    renderTable({ onModifier, onSupprimer });
    fireEvent.click(screen.getAllByTestId('ligne-saisie-modifier')[0]!);
    fireEvent.click(screen.getAllByTestId('ligne-saisie-supprimer')[0]!);
    expect(onModifier).toHaveBeenCalledTimes(1);
    expect(onSupprimer).toHaveBeenCalledTimes(1);
  });

  it('readOnly désactive les actions', () => {
    renderTable({ readOnly: true });
    expect(screen.getAllByTestId('ligne-saisie-modifier')[0]).toBeDisabled();
    expect(screen.getAllByTestId('ligne-saisie-supprimer')[0]).toBeDisabled();
  });

  it('pagination : limit=1 → 2 pages, bouton suivant actif', () => {
    const onPageChange = vi.fn();
    renderTable({ limit: 1, page: 0, onPageChange });
    expect(screen.getAllByTestId('ligne-saisie-row')).toHaveLength(1);
    const next = screen.getByTestId('lignes-saisies-next');
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('colonne « Ligne métier » masquée en filtré, visible en consolidé', () => {
    const { rerender } = renderTable({ vueConsolidee: false });
    expect(screen.queryByText('Ligne métier')).not.toBeInTheDocument();
    rerender(
      <LignesSaisiesTable
        lignes={[ligneA, ligneB]}
        moisKeys={MOIS}
        page={0}
        limit={20}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onModifier={vi.fn()}
        onSupprimer={vi.fn()}
        readOnly={false}
        editingKey={null}
        vueConsolidee
        onToggleVue={vi.fn()}
      />,
    );
    expect(screen.getByText('Ligne métier')).toBeInTheDocument();
  });

  it('le toggle appelle onToggleVue', () => {
    const onToggleVue = vi.fn();
    renderTable({ onToggleVue, vueConsolidee: false });
    fireEvent.click(screen.getByTestId('vue-consolidee'));
    expect(onToggleVue).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('vue-filtre'));
    expect(onToggleVue).toHaveBeenCalledWith(false);
  });

  it('toggle visible même quand le tableau est vide', () => {
    renderTable({ lignes: [] });
    expect(screen.getByTestId('vue-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('lignes-saisies-vide')).toBeInTheDocument();
  });
});
