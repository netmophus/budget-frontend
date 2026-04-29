import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listProduits: vi.fn(),
  getProduitHistorique: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import {
  listProduits,
  getProduitHistorique,
  type Produit,
} from '@/lib/api/referentiels';
import { ProduitsPage } from './ProduitsPage';

const mockList = listProduits as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getProduitHistorique as unknown as ReturnType<typeof vi.fn>;

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
});
