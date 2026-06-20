/**
 * Tests SaisieBudgetairePage (saisie focalisée compte par compte).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function renderPage() {
  return render(
    <MemoryRouter>
      <SaisieBudgetairePage />
    </MemoryRouter>,
  );
}

// SelecteurContexte fait des fetch référentiels : on le neutralise.
vi.mock('@/components/budget/grille/SelecteurContexte', () => ({
  SelecteurContexte: () => null,
}));

// CompteCombobox → stub : un bouton sélectionne le compte 601100.
vi.mock('@/components/budget/CompteCombobox', () => ({
  CompteCombobox: ({
    onChange,
    onSelectCompte,
  }: {
    onChange: (c: string) => void;
    onSelectCompte?: (c: {
      id: string;
      codeCompte: string;
      libelle: string;
      estCompteCollectif: boolean;
    }) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-compte-select"
      onClick={() => {
        onChange('601100');
        onSelectCompte?.({
          id: 'cpt-601100',
          codeCompte: '601100',
          libelle: 'Achats',
          estCompteCollectif: false,
        });
      }}
    >
      select compte
    </button>
  ),
}));

vi.mock('@/lib/api/budget-grille', () => ({
  getGrilleSaisie: vi.fn(),
  saveGrilleSaisie: vi.fn(),
}));
vi.mock('@/lib/api/versions', () => ({
  getVersionById: vi
    .fn()
    .mockResolvedValue({ id: 'v1', exerciceFiscal: 2027, statut: 'ouvert' }),
}));
vi.mock('@/lib/api/referentiels', () => ({
  listLignesMetier: vi
    .fn()
    .mockResolvedValue({ items: [{ id: 'lm1', estActif: true }] }),
}));
vi.mock('@/lib/api/cr-workflow', () => ({
  getCrStatut: vi.fn().mockResolvedValue({
    versionId: 'v1',
    crId: 'cr1',
    crCode: 'CR_SIEGE',
    statut: 'EN_SAISIE',
    dateSoumission: null,
    dateValidation: null,
    dateReouverture: null,
    fkSaisisseur: null,
    fkValidateur: null,
    motifRejet: null,
    motifReouverture: null,
  }),
  soumettreCr: vi.fn().mockResolvedValue({ statut: 'SOUMIS' }),
}));
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  getGrilleSaisie,
  saveGrilleSaisie,
  type GrilleSaisie,
} from '@/lib/api/budget-grille';
import { getCrStatut, soumettreCr } from '@/lib/api/cr-workflow';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { SaisieBudgetairePage } from './SaisieBudgetairePage';

const mockCrStatut = getCrStatut as unknown as ReturnType<typeof vi.fn>;
const mockSoumettre = soumettreCr as unknown as ReturnType<typeof vi.fn>;

const mockGet = getGrilleSaisie as unknown as ReturnType<typeof vi.fn>;
const mockSave = saveGrilleSaisie as unknown as ReturnType<typeof vi.fn>;

const MOIS = Array.from(
  { length: 12 },
  (_, i) => `2027-${String(i + 1).padStart(2, '0')}-01`,
);

function grilleFixture(): GrilleSaisie {
  return {
    version: { id: 'v1', codeVersion: 'BUDGET_2027', libelle: '', statut: 'ouvert' },
    scenario: { id: 's1', codeScenario: 'CENTRAL', libelle: '', typeScenario: 'central' },
    cr: { id: 'cr1', codeCr: 'CR_SIEGE', libelle: 'Siège', structureRattachee: null },
    exerciceFiscal: 2027,
    moisLabels: MOIS.map((_, i) => `M${i + 1} 2027`),
    comptesFeuillesEligibles: [],
    lignes: [
      {
        compte: {
          id: 'cpt-601100',
          codeCompte: '601100',
          libelle: 'Achats',
          classe: '6',
          sens: 'D',
          estPorteurInterets: false,
        },
        ligneMetier: { id: 'lm1', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
        cellules: MOIS.map((m) => ({
          mois: m,
          montant: 0,
          modeSaisie: null,
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: null,
        })),
        totalAnnee: 0,
      },
    ],
    totauxMensuels: MOIS.map((m) => ({ mois: m, total: 0 })),
    totalAnneeCr: 0,
  };
}

/** Grille avec 1 ligne réellement saisie (601100, 100 / mois, total 1200). */
function grilleAvecSaisie() {
  const g = grilleFixture();
  g.lignes[0]!.cellules = MOIS.map((m) => ({
    mois: m,
    montant: 100,
    modeSaisie: 'MONTANT',
    encoursMoyen: null,
    tie: null,
    commentaire: 'Hyp. 2026',
    ligneId: `f-${m}`,
  }));
  g.lignes[0]!.totalAnnee = 1200;
  return g;
}

describe('SaisieBudgetairePage', () => {
  beforeEach(() => {
    useBudgetGrilleStore.setState({
      versionId: 'v1',
      scenarioId: 's1',
      crId: 'cr1',
      ligneMetierId: 'lm1',
      codeClasse: '6',
    });
    mockGet.mockResolvedValue(grilleFixture());
    mockSave.mockResolvedValue({
      totalCellules: 12,
      inserees: 12,
      modifiees: 0,
      supprimees: 0,
      ignorees: 0,
      erreurs: [],
      dureeMs: 5,
    });
    localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le message vide tant qu’aucun compte sélectionné', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByTestId('hybride-vide')).toBeInTheDocument();
  });

  it('mode annuel : répartit /12 et enregistre 12 cellules identiques', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    // Sélection du compte via le stub combobox.
    fireEvent.click(screen.getByTestId('mock-compte-select'));
    await waitFor(() =>
      expect(screen.getByTestId('hybride-form')).toBeInTheDocument(),
    );

    // Saisie annuelle 1 200 000 → 100 000 / mois.
    fireEvent.change(screen.getByTestId('hybride-montant-annuel'), {
      target: { value: '1200000' },
    });
    expect(screen.getByTestId('hybride-mois-ro-0').textContent).toContain(
      '100',
    );

    fireEvent.click(screen.getByTestId('hybride-enregistrer'));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const req = mockSave.mock.calls[0][0];
    expect(req.lignes).toHaveLength(1);
    expect(req.lignes[0].compteId).toBe('cpt-601100');
    expect(req.lignes[0].cellules).toHaveLength(12);
    expect(req.lignes[0].cellules.every((c: { montant: number }) => c.montant === 100000)).toBe(true);
  });

  it('justification répliquée sur les 12 cellules', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('mock-compte-select'));
    await waitFor(() =>
      expect(screen.getByTestId('hybride-form')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('hybride-justif'), {
      target: { value: 'Base 2026 + 5%' },
    });
    fireEvent.click(screen.getByTestId('hybride-enregistrer'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const cellules = mockSave.mock.calls[0][0].lignes[0].cellules;
    expect(
      cellules.every((c: { commentaire: string }) => c.commentaire === 'Base 2026 + 5%'),
    ).toBe(true);
  });

  it('liste les lignes déjà saisies dans le tableau récap', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('lignes-saisies')).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('ligne-saisie-row')).toHaveLength(1);
    // Indicateur charges (classe 6) = 1200.
    expect(screen.getByTestId('synthese-charges').textContent).toContain(
      '200',
    );
  });

  it('Modifier : ouvre le mode édition et pré-remplit le montant annuel', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('ligne-saisie-modifier')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('ligne-saisie-modifier'));
    await waitFor(() =>
      expect(screen.getByTestId('hybride-edition-banner')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('hybride-form')).toBeInTheDocument();
    // 12 × 100 = 1200 pré-rempli.
    expect(
      (screen.getByTestId('hybride-montant-annuel') as HTMLInputElement).value,
    ).toBe('1200');
    // Bouton principal en libellé « Mettre à jour ».
    expect(screen.getByTestId('hybride-enregistrer').textContent).toContain(
      'Mettre à jour',
    );
  });

  it('Supprimer : confirme puis POST 12 cellules à 0', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('ligne-saisie-supprimer')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('ligne-saisie-supprimer'));
    // Modale de confirmation → bouton « Supprimer ».
    const confirmer = await screen.findByRole('button', { name: 'Supprimer' });
    fireEvent.click(confirmer);
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const cellules = mockSave.mock.calls[0][0].lignes[0].cellules;
    expect(cellules).toHaveLength(12);
    expect(
      cellules.every((c: { montant: number }) => c.montant === 0),
    ).toBe(true);
  });

  it('Vue consolidée : persiste localStorage et affiche la colonne LM', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('lignes-saisies')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Ligne métier')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vue-consolidee'));
    await waitFor(() =>
      expect(screen.getByText('Ligne métier')).toBeInTheDocument(),
    );
    expect(localStorage.getItem('miznas-saisie-vue-consolidee')).toBe('1');
  });

  it('soumettre : bouton EN_SAISIE → modale → appelle soumettreCr', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('cr-soumettre')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('cr-soumettre'));
    const confirmer = await screen.findByTestId('soumission-confirmer');
    fireEvent.click(confirmer);
    await waitFor(() => expect(mockSoumettre).toHaveBeenCalledTimes(1));
    expect(mockSoumettre).toHaveBeenCalledWith('CR_SIEGE', 'v1', undefined);
  });

  it('« Imprimer ma saisie » : ouvre la vue impression du CR courant', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('saisie-imprimer')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('saisie-imprimer'));
    expect(openSpy).toHaveBeenCalledWith(
      '/budget/comite/cr/CR_SIEGE/impression?versionId=v1',
      '_blank',
      'noopener',
    );
    vi.unstubAllGlobals();
  });

  it('lecture seule quand le CR est SOUMIS (pas de bouton soumettre)', async () => {
    mockGet.mockResolvedValue(grilleAvecSaisie());
    mockCrStatut.mockResolvedValue({
      versionId: 'v1',
      crId: 'cr1',
      crCode: 'CR_SIEGE',
      statut: 'SOUMIS',
      dateSoumission: '2027-06-01',
      dateValidation: null,
      dateReouverture: null,
      fkSaisisseur: null,
      fkValidateur: null,
      motifRejet: null,
      motifReouverture: null,
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('statut-cr-banner')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('cr-soumettre')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByTestId('ligne-saisie-modifier')[0]).toBeDisabled(),
    );
  });
});
