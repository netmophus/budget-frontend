/**
 * Tests Vitest RealiseSaisiePage (Lot 5.1.B). Vérifient les
 * conditions d'affichage des actions (RBAC) et l'état empty.
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listCrs: vi.fn(),
  listDevises: vi.fn(),
}));
vi.mock('@/lib/api/realise', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/realise')>(
    '@/lib/api/realise',
  );
  return {
    ...actual,
    getGrilleRealise: vi.fn(),
  };
});
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: { items: [] } }) },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockHasPermission = vi.fn();
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (perm: string) => mockHasPermission(perm),
}));

// Stubs pour les sous-dialogues (testés à part)
vi.mock(
  '@/components/realise/CreerModifierLigneRealiseDialog',
  () => ({
    CreerModifierLigneRealiseDialog: () => null,
  }),
);
vi.mock(
  '@/components/realise/HistoriqueLigneRealiseDialog',
  () => ({
    HistoriqueLigneRealiseDialog: () => null,
  }),
);
vi.mock('@/components/realise/RealiseImportDialog', () => ({
  RealiseImportDialog: () => null,
}));
vi.mock('@/components/realise/ValiderLignesRealiseDialog', () => ({
  ValiderLignesRealiseDialog: () => null,
}));

import { useRealiseStore } from '@/lib/stores/realise-store';
import { listCrs, listDevises } from '@/lib/api/referentiels';
import { getGrilleRealise } from '@/lib/api/realise';
import { RealiseSaisiePage } from './RealiseSaisiePage';

const mockListCrs = listCrs as unknown as ReturnType<typeof vi.fn>;
const mockListDevises = listDevises as unknown as ReturnType<typeof vi.fn>;
const mockGetGrille = getGrilleRealise as unknown as ReturnType<typeof vi.fn>;

describe('RealiseSaisiePage', () => {
  beforeEach(() => {
    mockListCrs.mockResolvedValue({
      items: [{ id: '10', codeCr: 'CR_BANDABARI', libelle: 'Bandabari' }],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockListDevises.mockResolvedValue({
      items: [{ id: '50', codeIso: 'XOF', libelle: 'F CFA' }],
      total: 1,
      page: 1,
      limit: 200,
    });
    mockGetGrille.mockResolvedValue([]);
    // Reset store
    useRealiseStore.setState({
      crId: null,
      moisDebut: '2027-01',
      moisFin: '2027-03',
      fkDeviseDefaut: null,
      lignes: [],
      selection: new Set(),
      filtreCodeCompte: '',
      filtreStatut: 'TOUS',
      filtreSource: 'TOUS',
      loading: false,
      error: null,
    });
    mockHasPermission.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le sélecteur de contexte au mount', async () => {
    mockHasPermission.mockReturnValue(true);
    render(<RealiseSaisiePage />);
    await waitFor(() => expect(mockListCrs).toHaveBeenCalled());
    expect(screen.getByTestId('selecteur-contexte')).toBeInTheDocument();
    expect(screen.getByTestId('r-cr')).toBeInTheDocument();
    expect(screen.getByTestId('r-mois-debut')).toBeInTheDocument();
    expect(screen.getByTestId('r-mois-fin')).toBeInTheDocument();
  });

  it("affiche bouton Importer si REALISE.IMPORTER, masqué sinon", async () => {
    mockHasPermission.mockImplementation((perm: string) => perm === 'REALISE.IMPORTER');
    render(<RealiseSaisiePage />);
    await waitFor(() => expect(mockListCrs).toHaveBeenCalled());
    expect(screen.getByTestId('btn-importer')).toBeInTheDocument();
    // Pas de SAISIR ni VALIDER
    expect(screen.queryByTestId('btn-nouvelle-ligne')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-valider-selection')).not.toBeInTheDocument();
  });

  it("masque tous les boutons d'action pour un user en lecture seule (LECTEUR/AUDITEUR)", async () => {
    mockHasPermission.mockReturnValue(false);
    render(<RealiseSaisiePage />);
    await waitFor(() => expect(mockListCrs).toHaveBeenCalled());
    expect(screen.queryByTestId('btn-importer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-nouvelle-ligne')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-valider-selection')).not.toBeInTheDocument();
  });

  it('affiche bouton Valider sélection si REALISE.VALIDER', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm === 'REALISE.VALIDER');
    render(<RealiseSaisiePage />);
    await waitFor(() => expect(mockListCrs).toHaveBeenCalled());
    expect(screen.getByTestId('btn-valider-selection')).toBeInTheDocument();
  });

  it("affiche l'empty state quand aucun CR sélectionné", async () => {
    mockHasPermission.mockReturnValue(true);
    render(<RealiseSaisiePage />);
    await waitFor(() =>
      expect(screen.getByTestId('empty-no-cr')).toBeInTheDocument(),
    );
  });
});
