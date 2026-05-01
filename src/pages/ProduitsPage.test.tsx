import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

vi.mock('@/lib/api/referentiels', () => ({
  listProduits: vi.fn(),
  getProduitHistorique: vi.fn(),
  createProduit: vi.fn(),
  updateProduit: vi.fn(),
  deleteProduit: vi.fn(),
}));

// Lot 2.5C : la page consomme useRefSecondaireOptions pour le filtre
// type. Mock no-op pour éviter les fetch axios en jsdom.
vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 200,
  }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (msg: string) => toastError(msg),
    success: (m: string) => toastSuccess(m),
    info: (m: string) => toastInfo(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import {
  deleteProduit,
  listProduits,
  getProduitHistorique,
  type Produit,
} from '@/lib/api/referentiels';
import { ProduitsPage } from './ProduitsPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listProduits as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getProduitHistorique as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteProduit as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Produit[] = [
  {
    id: '1',
    codeProduit: 'CREDIT_GRP',
    libelle: 'Crédits',
    typeProduit: 'credit',
    fkProduitParent: null,
    niveau: 1,
    estPorteurInterets: false,
    versionCourante: true,
    dateDebutValidite: '2026-04-15',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-04-15T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    codeProduit: 'CREDIT_DECOUVERT',
    libelle: 'Découverts',
    typeProduit: 'credit',
    fkProduitParent: '1',
    parentCourant: { id: '1', codeProduit: 'CREDIT_TRESORERIE', libelle: 'Crédits trésorerie' },
    niveau: 3,
    estPorteurInterets: true,
    versionCourante: true,
    dateDebutValidite: '2026-04-15',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-04-15T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
];

describe('ProduitsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders produits with type badges', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(screen.getByText('Crédits')).toBeInTheDocument();
    });
    expect(screen.getByText('Découverts')).toBeInTheDocument();
    // Au moins 2 badges 'Crédit' (type) — colonne typeProduit
    expect(screen.getAllByText('Crédit').length).toBeGreaterThanOrEqual(2);
  });

  it('toggle "porteurs intérêts" passes estPorteurInterets=true', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<ProduitsPage />);

    const toggle = await screen.findByLabelText(
      /porteurs d'intérêts uniquement/i,
    );
    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = mockList.mock.calls as Array<[Record<string, unknown>]>;
      const last = calls[calls.length - 1]![0];
      expect(last.estPorteurInterets).toBe(true);
    });
  });

  it('clicking a row opens the detail drawer', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(screen.getByText('Découverts')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Découverts'));

    await waitFor(() => {
      expect(screen.getByText('Produit CREDIT_DECOUVERT')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Voir le parent : CREDIT_TRESORERIE/),
    ).toBeInTheDocument();
  });

  it('drawer history button calls getProduitHistorique', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockHistory.mockResolvedValue([SAMPLE[0]]);

    render(<ProduitsPage />);
    await waitFor(() => {
      expect(screen.getByText('Crédits')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Crédits'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('CREDIT_GRP');
    });
  });

  it('shows toast on API error', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les produits',
      );
    });
  });

  // ─── Lot 2.5C : CRUD actions

  it('bouton "Nouveau produit" visible pour admin', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouveau produit/i }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : pas de bouton "Nouveau produit"', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(screen.getByText('CREDIT_GRP')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouveau produit/i }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : boutons Modifier + Désactiver visibles', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ProduitsPage />);

    await waitFor(() => {
      expect(screen.getByText('CREDIT_GRP')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CREDIT_GRP'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
  });

  it('Désactiver 409 enfants → toast erreur', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockDelete.mockRejectedValue(
      buildAxiosError(409, '2 enfants courants — désactivez-les d\'abord'),
    );

    render(<ProduitsPage />);
    await waitFor(() => {
      expect(screen.getByText('CREDIT_GRP')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CREDIT_GRP'));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver le produit CREDIT_GRP/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/2 enfants courants|enfants/i),
      );
    });
  });
});
