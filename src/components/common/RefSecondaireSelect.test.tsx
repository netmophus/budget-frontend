import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/configuration', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/configuration')>(
    '@/lib/api/configuration',
  );
  return { ...actual, listRefSecondaires: vi.fn() };
});

import { listRefSecondaires } from '@/lib/api/configuration';
import { __resetRefSecondaireCache } from '@/lib/hooks/useRefSecondaireOptions';
import { RefSecondaireSelect } from './RefSecondaireSelect';

const mockList = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;

const REF = [
  {
    id: '1',
    code: 'credit',
    libelle: 'Crédit',
    description: null,
    ordre: 10,
    estActif: true,
    estSysteme: true,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    code: 'depot',
    libelle: 'Dépôt',
    description: null,
    ordre: 20,
    estActif: true,
    estSysteme: true,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
];

describe('RefSecondaireSelect', () => {
  beforeEach(() => {
    __resetRefSecondaireCache();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('appelle listRefSecondaires avec le bon refKey + estActif=true au mount', async () => {
    mockList.mockResolvedValue({ items: REF, total: 2, page: 1, limit: 200 });

    render(
      <RefSecondaireSelect
        refKey="type-produit"
        value=""
        onValueChange={() => undefined}
        labelChamp="types de produit"
      />,
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith('type-produit', {
        estActif: true,
        limit: 200,
      });
    });
  });

  it('valeur courante active : pas de message warning', async () => {
    mockList.mockResolvedValue({ items: REF, total: 2, page: 1, limit: 200 });

    render(
      <RefSecondaireSelect
        refKey="type-produit"
        value="credit"
        onValueChange={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    expect(screen.queryByText(/désactivée dans Configuration/i)).not.toBeInTheDocument();
  });

  it('valeur courante désactivée : warning jaune visible et valeur prepend', async () => {
    // 'autre' n'est pas dans les options actives
    mockList.mockResolvedValue({ items: REF, total: 2, page: 1, limit: 200 });

    render(
      <RefSecondaireSelect
        refKey="type-produit"
        value="autre"
        onValueChange={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/'autre' a été désactivée dans Configuration/i),
      ).toBeInTheDocument();
    });
  });

  it("erreur API + options vides : message rouge + select disabled", async () => {
    mockList.mockRejectedValue(new Error('boom'));

    render(
      <RefSecondaireSelect
        refKey="type-produit"
        value=""
        onValueChange={() => undefined}
        labelChamp="types de produit"
      />,
    );

    await waitFor(() => {
      // Le message inclut un <code> au milieu — recherche partielle
      expect(
        screen.getByText(/Impossible de charger/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/types de produit/i)).toBeInTheDocument();
  });

  it("respect prop showWarningIfDisabled=false : pas de message même si valeur désactivée", async () => {
    mockList.mockResolvedValue({ items: REF, total: 2, page: 1, limit: 200 });

    render(
      <RefSecondaireSelect
        refKey="type-produit"
        value="autre"
        onValueChange={() => undefined}
        showWarningIfDisabled={false}
      />,
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    expect(screen.queryByText(/désactivée dans Configuration/i)).not.toBeInTheDocument();
  });
});
