import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api/budget-grille', () => ({
  getGrilleSaisie: vi.fn(),
  saveGrilleSaisie: vi.fn(),
}));
vi.mock('@/lib/api/scenarios', () => ({
  listScenarios: vi.fn(),
}));
vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn(),
}));
vi.mock('@/lib/api/referentiels', () => ({
  listCrs: vi.fn(),
  listLignesMetier: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string, _o?: unknown) => toastError(m),
    info: (m: string) => toastInfo(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import {
  getGrilleSaisie,
  saveGrilleSaisie,
  type GrilleSaisie,
} from '@/lib/api/budget-grille';
import { listScenarios } from '@/lib/api/scenarios';
import { listVersions } from '@/lib/api/versions';
import { listCrs, listLignesMetier } from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { SaisieBudgetairePage } from './SaisieBudgetairePage';

const mockGetGrille = getGrilleSaisie as unknown as ReturnType<typeof vi.fn>;
const mockSaveGrille = saveGrilleSaisie as unknown as ReturnType<typeof vi.fn>;
const mockListVersions = listVersions as unknown as ReturnType<typeof vi.fn>;
const mockListScenarios = listScenarios as unknown as ReturnType<typeof vi.fn>;
const mockListCrs = listCrs as unknown as ReturnType<typeof vi.fn>;
const mockListLignesMetier = listLignesMetier as unknown as ReturnType<typeof vi.fn>;

const LIGNE_METIER_RETAIL = {
  id: '20',
  codeLigneMetier: 'RETAIL',
  libelle: 'Banque de détail',
  fkLigneMetierParent: null,
  niveau: 1,
  versionCourante: true,
  dateDebutValidite: '2026-01-01',
  dateFinValidite: null,
  estActif: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const VERSION_OUVERT = {
  id: '1',
  codeVersion: 'BUDGET_2027',
  libelle: 'Budget 2027',
  typeVersion: 'budget_initial',
  exerciceFiscal: 2027,
  statut: 'ouvert',
  dateGel: null,
  utilisateurGel: null,
  commentaire: null,
  dateCreation: '2027-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};
const VERSION_GELE = { ...VERSION_OUVERT, id: '2', codeVersion: 'BUDGET_2026', exerciceFiscal: 2026, statut: 'gele' };

const SCENARIO_MEDIAN = {
  id: '10',
  codeScenario: 'MEDIAN_2027',
  libelle: 'Médian 2027',
  typeScenario: 'central',
  statut: 'actif',
  commentaire: null,
  exerciceFiscal: 2027,
  dateCreation: '2027-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

const CR_AG = {
  id: '100',
  codeCr: 'CR_AG_ABJ_PLATEAU',
  libelle: 'CR Agence Plateau',
  libelleCourt: null,
  typeCr: 'cdc',
  fkStructure: '1',
  versionCourante: true,
  dateDebutValidite: '2026-01-01',
  dateFinValidite: null,
  estActif: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

const GRILLE_OUVERT: GrilleSaisie = {
  version: { id: '1', codeVersion: 'BUDGET_2027', libelle: 'Budget 2027', statut: 'ouvert' },
  scenario: { id: '10', codeScenario: 'MEDIAN_2027', libelle: 'Médian', typeScenario: 'central' },
  cr: {
    id: '100',
    codeCr: 'CR_AG_ABJ_PLATEAU',
    libelle: 'CR Agence Plateau',
    structureRattachee: { codeStructure: 'AG_ABJ', libelle: 'Agence Plateau' },
  },
  exerciceFiscal: 2027,
  moisLabels: ['Janvier 2027'],
  comptesFeuillesEligibles: [],
  lignes: [
    {
      compte: {
        id: '500',
        codeCompte: '611100',
        libelle: 'Salaires',
        classe: '6',
        sens: 'D',
        estPorteurInterets: false,
      },
      ligneMetier: { id: '20', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
      cellules: [
        {
          mois: '2027-01-01',
          montant: 10_000_000,
          modeSaisie: 'MONTANT',
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: 'L1',
        },
      ],
      totalAnnee: 10_000_000,
    },
  ],
  totauxMensuels: [{ mois: '2027-01-01', total: 10_000_000 }],
  totalAnneeCr: 10_000_000,
};

function configureMocks(opts?: { versions?: typeof VERSION_OUVERT[]; grille?: GrilleSaisie }) {
  mockListVersions.mockResolvedValue({
    items: opts?.versions ?? [VERSION_OUVERT],
    total: 1,
    page: 1,
    limit: 200,
  });
  mockListScenarios.mockResolvedValue({
    items: [SCENARIO_MEDIAN],
    total: 1,
    page: 1,
    limit: 200,
  });
  mockListCrs.mockResolvedValue({
    items: [CR_AG],
    total: 1,
    page: 1,
    limit: 200,
  });
  mockListLignesMetier.mockResolvedValue({
    items: [LIGNE_METIER_RETAIL],
    total: 1,
    page: 1,
    limit: 200,
  });
  mockGetGrille.mockResolvedValue(opts?.grille ?? GRILLE_OUVERT);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SaisieBudgetairePage />
    </MemoryRouter>,
  );
}

describe('SaisieBudgetairePage', () => {
  beforeEach(() => {
    useBudgetGrilleStore.getState().reset();
    mockHasPermission.mockReturnValue(true);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('charge le contexte par défaut + affiche la grille', async () => {
    configureMocks();
    renderPage();
    await waitFor(() => {
      expect(mockGetGrille).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('611100')).toBeInTheDocument();
    });
    // Badge statut Brouillon affiché
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('LECTEUR (BUDGET.SAISIR=false) : bouton Enregistrer désactivé', async () => {
    mockHasPermission.mockImplementation((p: string) => p !== 'BUDGET.SAISIR');
    configureMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('611100')).toBeInTheDocument();
    });
    const saveBtn = screen.getByRole('button', {
      name: /Enregistrer/i,
    }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("version statut='gele' : badge cadenas + grille en lecture seule", async () => {
    // Pré-régler le store avec la version gele directement (sinon
    // l'auto-sélection du SelecteurContexte cherche une 'ouvert' et
    // n'en trouve pas).
    useBudgetGrilleStore.getState().setVersionId('2');
    useBudgetGrilleStore.getState().setScenarioId('10');
    useBudgetGrilleStore.getState().setCrId('100');
    useBudgetGrilleStore.getState().setLigneMetierId('20');
    configureMocks({
      versions: [VERSION_GELE],
      grille: {
        ...GRILLE_OUVERT,
        version: { ...GRILLE_OUVERT.version, statut: 'gele' },
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Publié')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Cette version est verrouillée/i),
    ).toBeInTheDocument();
  });

  it('aucune version disponible → message clair', async () => {
    configureMocks({ versions: [] });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucune version disponible/i),
      ).toBeInTheDocument();
    });
  });

  it('aucun CR dans périmètre → message clair', async () => {
    mockListVersions.mockResolvedValue({
      items: [VERSION_OUVERT],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListScenarios.mockResolvedValue({
      items: [SCENARIO_MEDIAN],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListCrs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    });
    mockListLignesMetier.mockResolvedValue({
      items: [LIGNE_METIER_RETAIL],
      total: 1,
      page: 1,
      limit: 200,
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucun centre de responsabilité dans votre périmètre/i),
      ).toBeInTheDocument();
    });
  });

  it('Bouton Calculer indicateurs ouvre le panneau', async () => {
    configureMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('611100')).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Calculer indicateurs/i }),
    );
    await waitFor(() => {
      expect(screen.getByText('📊 Indicateurs avancés')).toBeInTheDocument();
    });
  });

  // ─── Lot 3.4-bis : from-scratch

  it('aucune ligne_metier active → message clair dans le sélecteur', async () => {
    mockListVersions.mockResolvedValue({
      items: [VERSION_OUVERT],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListScenarios.mockResolvedValue({
      items: [SCENARIO_MEDIAN],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListCrs.mockResolvedValue({
      items: [CR_AG],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListLignesMetier.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucune ligne métier active/i),
      ).toBeInTheDocument();
    });
  });

  it("auto-sélection ligne_metier au mount (Lot 3.4-bis)", async () => {
    configureMocks();
    renderPage();
    await waitFor(() => {
      // Le store doit être hydraté avec la ligne_metier auto-sélectionnée
      expect(useBudgetGrilleStore.getState().ligneMetierId).toBe('20');
    });
  });

  it('Bouton Annuler les modifs initialement désactivé (pas de modifs)', async () => {
    configureMocks();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('611100')).toBeInTheDocument();
    });
    const annulerBtn = screen.getByRole('button', {
      name: /Annuler les modifs/i,
    }) as HTMLButtonElement;
    expect(annulerBtn.disabled).toBe(true);
  });
});
