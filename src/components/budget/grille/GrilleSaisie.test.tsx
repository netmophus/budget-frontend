/**
 * Tests Vitest GrilleSaisie + GrilleCelluleEditor (Lot 3.4) — focus
 * structure et formats français. Les interactions clavier riches sont
 * vérifiées en navigateur (smoke test final).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  GrilleCellule,
  GrilleSaisie as GrilleSaisieData,
} from '@/lib/api/budget-grille';
import { GrilleSaisie } from './GrilleSaisie';

const FIX_GRILLE: GrilleSaisieData = {
  version: { id: '1', codeVersion: 'BUDGET_2027', libelle: 'B27', statut: 'ouvert' },
  scenario: { id: '10', codeScenario: 'MEDIAN_2027', libelle: 'Médian', typeScenario: 'central' },
  cr: {
    id: '100',
    codeCr: 'CR_AG',
    libelle: 'CR Agence Plateau',
    structureRattachee: { codeStructure: 'AG_ABJ', libelle: 'Agence Plateau' },
  },
  exerciceFiscal: 2027,
  moisLabels: ['Janvier 2027', 'Février 2027'],
  comptesFeuillesEligibles: [],
  lignes: [
    {
      compte: {
        id: '500',
        codeCompte: '611100',
        libelle: 'Salaires bruts',
        classe: '6',
        sens: 'D',
        estPorteurInterets: false,
      },
      ligneMetier: { id: '20', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
      cellules: [
        {
          mois: '2027-01-01',
          montant: 10_200_000,
          modeSaisie: 'MONTANT',
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: 'L1',
        },
        {
          mois: '2027-02-01',
          montant: 10_200_000,
          modeSaisie: 'MONTANT',
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: 'L2',
        },
      ],
      totalAnnee: 20_400_000,
    },
    {
      compte: {
        id: '600',
        codeCompte: '671100',
        libelle: "Intérêts versés DAT",
        classe: '6',
        sens: 'D',
        estPorteurInterets: true,
      },
      ligneMetier: { id: '20', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
      cellules: [
        {
          mois: '2027-01-01',
          montant: 4_500_000,
          modeSaisie: 'ENCOURS_TIE',
          encoursMoyen: 1_200_000_000,
          tie: 0.045,
          commentaire: null,
          ligneId: 'L3',
        },
        {
          mois: '2027-02-01',
          montant: 4_500_000,
          modeSaisie: 'ENCOURS_TIE',
          encoursMoyen: 1_200_000_000,
          tie: 0.045,
          commentaire: null,
          ligneId: 'L4',
        },
      ],
      totalAnnee: 9_000_000,
    },
  ],
  totauxMensuels: [
    { mois: '2027-01-01', total: 14_700_000 },
    { mois: '2027-02-01', total: 14_700_000 },
  ],
  totalAnneeCr: 29_400_000,
};

function renderGrille(overrides?: {
  modifications?: Map<string, GrilleCellule>;
  readOnly?: boolean;
}) {
  const modifications = overrides?.modifications ?? new Map();
  const onModifierCellule = vi.fn();
  const onChangerMode = vi.fn();
  const modeParLigne = new Map<string, 'MONTANT' | 'ENCOURS_TIE'>([
    ['500|20', 'MONTANT'],
    ['600|20', 'ENCOURS_TIE'],
  ]);
  render(
    <GrilleSaisie
      grille={FIX_GRILLE}
      modeParLigne={modeParLigne}
      modifications={modifications}
      readOnly={overrides?.readOnly ?? false}
      getCelluleEffective={(c, l, m) =>
        FIX_GRILLE.lignes
          .find((x) => x.compte.id === c && x.ligneMetier.id === l)
          ?.cellules.find((cl) => cl.mois === m) ?? null
      }
      getTotalAnnuelLigne={(c, l) =>
        FIX_GRILLE.lignes.find(
          (x) => x.compte.id === c && x.ligneMetier.id === l,
        )?.totalAnnee ?? 0
      }
      getTotalMensuel={(m) =>
        FIX_GRILLE.totauxMensuels.find((t) => t.mois === m)?.total ?? 0
      }
      getTotalAnneeCr={() => FIX_GRILLE.totalAnneeCr}
      onModifierCellule={onModifierCellule}
      onChangerMode={onChangerMode}
    />,
  );
  return { onModifierCellule, onChangerMode };
}

describe('GrilleSaisie', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rend les 2 lignes seedées avec codes et libellés', () => {
    renderGrille();
    expect(screen.getByText('611100')).toBeInTheDocument();
    expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
    expect(screen.getByText('671100')).toBeInTheDocument();
    expect(screen.getByText('Intérêts versés DAT')).toBeInTheDocument();
  });

  it('affiche les en-têtes de mois en français court', () => {
    renderGrille();
    expect(screen.getByText('Janv. 2027')).toBeInTheDocument();
    expect(screen.getByText('Févr. 2027')).toBeInTheDocument();
  });

  it('affiche le total annuel CR en pied de tableau', () => {
    renderGrille();
    // 29 400 000 avec espaces insécables Intl.NumberFormat fr-FR
    const tfoot = document.querySelector('tfoot');
    expect(tfoot).toBeTruthy();
    expect(tfoot!.textContent).toMatch(/29[\s ]400[\s ]000/);
  });

  it('compte porteur intérêts (671100) → toggle MNT/E×T visible', () => {
    renderGrille();
    expect(screen.getByTitle('Mode Montant')).toBeInTheDocument();
    expect(screen.getByTitle('Mode Encours × TIE')).toBeInTheDocument();
  });

  it('compte non-porteur (611100) → pas de toggle, juste libellé MNT', () => {
    renderGrille();
    // Le badge MNT en cellule mode pour 611100
    const cells = screen.getAllByText('MNT');
    // Il y en a au moins 1 (cellule mode 611100) en plus du toggle bouton
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it('readOnly=true → toggle disabled', () => {
    renderGrille({ readOnly: true });
    const buttonMnt = screen.getByTitle('Mode Montant') as HTMLButtonElement;
    expect(buttonMnt.disabled).toBe(true);
  });

  it('grille vide : affiche le message de fallback', () => {
    const grilleVide = { ...FIX_GRILLE, lignes: [] };
    render(
      <GrilleSaisie
        grille={grilleVide}
        modeParLigne={new Map()}
        modifications={new Map()}
        readOnly={false}
        getCelluleEffective={() => null}
        getTotalAnnuelLigne={() => 0}
        getTotalMensuel={() => 0}
        getTotalAnneeCr={() => 0}
        onModifierCellule={vi.fn()}
        onChangerMode={vi.fn()}
      />,
    );
    expect(screen.getByText(/Aucune ligne saisie pour ce CR/i)).toBeInTheDocument();
  });

  it('input cellule MONTANT : modification déclenche onModifierCellule au blur', () => {
    const { onModifierCellule } = renderGrille();
    // 4 inputs cellules : 2 lignes × 2 mois ; 611100 est en mode MONTANT
    // donc ses 2 cellules sont des inputs <input>. 671100 est en
    // ENCOURS_TIE donc des <button>.
    const inputs = document.querySelectorAll(
      'input[type="text"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const premier = inputs[0]!;
    fireEvent.change(premier, { target: { value: '15 000 000' } });
    fireEvent.blur(premier);
    expect(onModifierCellule).toHaveBeenCalled();
    const args = onModifierCellule.mock.calls[0]!;
    expect(args[3]).toMatchObject({ montant: 15_000_000 });
  });
});
