/**
 * Tests Vitest ReforecastGrille (Lot 5.3.B).
 */
import { cleanup, screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/reforecast', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reforecast')>(
    '@/lib/api/reforecast',
  );
  return {
    ...actual,
    getReforecastComparaison: vi.fn(),
  };
});
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type ComparaisonResponse,
  type Reforecast,
  getReforecastComparaison,
} from '@/lib/api/reforecast';
import { ReforecastGrille } from './ReforecastGrille';

const mockGetCmp = getReforecastComparaison as unknown as ReturnType<
  typeof vi.fn
>;

function makeRf(over: Partial<Reforecast> = {}): Reforecast {
  return {
    id: '42',
    codeVersion: 'CODE',
    libelle: 'Reforecast T1 2027',
    exerciceFiscal: 2027,
    statut: 'ouvert',
    statutPublication: 'ACTIVE',
    fkVersionSource: '10',
    fkScenarioSource: '20',
    trimestreConsolide: 1,
    anneeConsolide: 2027,
    methodeExtrapolation: 'BUDGET_INITIAL',
    dateObsolescence: null,
    fkVersionRemplacante: null,
    libelleVersionSource: 'Budget initial',
    libelleScenarioSource: 'Optimiste',
    dateCreation: '2027-04-01T00:00:00Z',
    utilisateurCreation: 'admin',
    commentaire: null,
    ...over,
  };
}

const COMPARAISON_OK: ComparaisonResponse = {
  lignes: [
    {
      fkCentre: '1',
      codeCr: 'CR_A',
      fkCompte: '10',
      codeCompte: '611',
      fkLigneMetier: '100',
      codeLigneMetier: 'RETAIL',
      fkTemps: 't1',
      mois: 1,
      annee: 2027,
      origine: 'REALISE',
      montantSource: 1000,
      montantReforecast: 800,
      ecart: -200,
    },
    {
      fkCentre: '1',
      codeCr: 'CR_A',
      fkCompte: '10',
      codeCompte: '611',
      fkLigneMetier: '100',
      codeLigneMetier: 'RETAIL',
      fkTemps: 't4',
      mois: 4,
      annee: 2027,
      origine: 'EXTRAPOLATION',
      montantSource: 1000,
      montantReforecast: 1000,
      ecart: 0,
    },
  ],
  totalSource: 2000,
  totalReforecast: 1800,
  totalEcart: -200,
};

function renderG(rf: Reforecast) {
  return render(
    <MemoryRouter>
      <ReforecastGrille reforecast={rf} />
    </MemoryRouter>,
  );
}

describe('ReforecastGrille', () => {
  beforeEach(() => {
    mockGetCmp.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche les badges Origine REALISE et EXTRAPOLATION', async () => {
    mockGetCmp.mockResolvedValue(COMPARAISON_OK);
    renderG(makeRf());
    await waitFor(() =>
      expect(screen.getByTestId('rf-grille-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('badge-origine-REALISE')).toBeInTheDocument();
    expect(
      screen.getByTestId('badge-origine-EXTRAPOLATION'),
    ).toBeInTheDocument();
  });

  it('en mode Brouillon + ACTIVE : affiche le bouton "Éditer ce reforecast"', async () => {
    mockGetCmp.mockResolvedValue(COMPARAISON_OK);
    renderG(makeRf({ statut: 'ouvert', statutPublication: 'ACTIVE' }));
    await waitFor(() =>
      expect(screen.getByTestId('rf-grille-edit-link')).toBeInTheDocument(),
    );
    // Lot 6.7.3 — texte du bouton renommé pour découvrabilité
    expect(screen.getByTestId('rf-grille-edit-link')).toHaveTextContent(
      'Éditer ce reforecast',
    );
    // Pas de bandeau lecture-seule
    expect(screen.queryByTestId('rf-grille-readonly')).not.toBeInTheDocument();
  });

  it('en mode OBSOLETE : grille en lecture seule, pas de bouton édition', async () => {
    mockGetCmp.mockResolvedValue(COMPARAISON_OK);
    renderG(makeRf({ statutPublication: 'OBSOLETE' }));
    await waitFor(() =>
      expect(screen.getByTestId('rf-grille-readonly')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('rf-grille-edit-link')).not.toBeInTheDocument();
  });

  it("en mode statut=valide : grille en lecture seule (édition impossible)", async () => {
    mockGetCmp.mockResolvedValue(COMPARAISON_OK);
    renderG(makeRf({ statut: 'valide' }));
    await waitFor(() =>
      expect(screen.getByTestId('rf-grille-readonly')).toBeInTheDocument(),
    );
  });
});
