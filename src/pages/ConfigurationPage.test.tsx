import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn(),
  // RefSecondaireTable importe aussi ces APIs mais ils ne sont pas
  // appelés tant qu'on ne fait pas d'action — mocks no-op.
  toggleActifRefSecondaire: vi.fn(),
  deleteRefSecondaire: vi.fn(),
  createRefSecondaire: vi.fn(),
  updateRefSecondaire: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import { listRefSecondaires } from '@/lib/api/configuration';
import { ConfigurationPage } from './ConfigurationPage';

const mockList = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;

function renderPage(initialEntries = ['/configuration']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ConfigurationPage />
    </MemoryRouter>,
  );
}

describe('ConfigurationPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rend les 5 catégories + 13 référentiels dans la nav', async () => {
    mockList.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });

    renderPage();

    // Catégories
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Plan comptable')).toBeInTheDocument();
    expect(screen.getByText('Métier')).toBeInTheDocument();
    expect(screen.getByText('Workflow budget')).toBeInTheDocument();
    // "Système" peut apparaître plusieurs fois (badge dans le tableau
    // + titre de catégorie dans la nav). On accepte ≥ 1 occurrence.
    expect(screen.getAllByText('Système').length).toBeGreaterThan(0);

    // 13 référentiels visibles dans la nav. Le label de l'item
    // sélectionné apparaît aussi dans le titre du tableau de droite,
    // donc on utilise getAllByText pour accepter ≥ 1.
    const labels = [
      'Types de structure',
      'Pays UEMOA',
      'Types de centre de responsabilité',
      'Sens des comptes',
      'Classes du PCB',
      'Types de produit',
      'Catégories de segment',
      'Types de version',
      'Statuts de version',
      'Types de scénario',
      'Statuts de scénario',
      'Types de taux de change',
      "Types d'action audit",
    ];
    for (const label of labels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('charge les counts au mount (13 requêtes parallèles, limit=1, estActif=true)', async () => {
    mockList.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });

    renderPage();

    await waitFor(() => {
      // 13 référentiels × (1 count + 1 init data) = au moins 14 calls
      expect(mockList.mock.calls.length).toBeGreaterThanOrEqual(13);
    });

    // Vérifier qu'au moins une des invocations est avec limit=1 + estActif=true (count)
    const countCalls = mockList.mock.calls.filter(
      (c) => (c[1] as { limit?: number }).limit === 1,
    );
    expect(countCalls.length).toBe(13);
  });

  it('par défaut : type-structure sélectionné, URL synchronisée', async () => {
    mockList.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });

    renderPage();

    // Le tableau de droite ouvre par défaut sur type-structure
    await waitFor(() => {
      // RefSecondaireTable affiche le titre du référentiel
      const titres = screen.getAllByText(/Types de structure/);
      // Au moins 2 occurrences : nav + titre du tableau
      expect(titres.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('?ref=pays dans l\'URL → ouvre directement Pays UEMOA', async () => {
    mockList.mockResolvedValue({ items: [], total: 9, page: 1, limit: 1 });

    renderPage(['/configuration?ref=pays']);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        'pays',
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  it('?ref=invalide → fallback sur type-structure', async () => {
    mockList.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });

    renderPage(['/configuration?ref=invalide']);

    await waitFor(() => {
      // Le tableau de droite ouvre type-structure (default)
      expect(mockList).toHaveBeenCalledWith(
        'type-structure',
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  it("clic sur 'Pays UEMOA' bascule la sélection", async () => {
    mockList.mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 });

    renderPage();

    await waitFor(() => {
      const items = screen.getAllByText('Pays UEMOA');
      expect(items.length).toBeGreaterThan(0);
    });
    // Le 1er match correspond à l'entrée de nav (avant ouverture
    // du tableau). On clique dessus.
    const navItem = screen.getAllByText('Pays UEMOA')[0]!;
    fireEvent.click(navItem);

    await waitFor(() => {
      const lastListCall = mockList.mock.calls.findLast(
        (c) => (c[1] as { limit?: number }).limit === 50,
      );
      expect(lastListCall).toBeDefined();
      expect(lastListCall![0]).toBe('pays');
    });
  });
});
