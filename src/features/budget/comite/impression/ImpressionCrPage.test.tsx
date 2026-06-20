/** Tests ImpressionCrPage (palier 7.1 / 7.4). */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/versions', () => ({
  getVersionById: vi
    .fn()
    .mockResolvedValue({ codeVersion: 'BUDGET_2027_V1', libelle: 'Budget 2027' }),
}));
vi.mock('@/lib/api/cr-workflow', () => ({
  getStatutsCrsVersion: vi.fn(),
  getLignesCrComite: vi.fn(),
}));
vi.mock('@/lib/api/budget', () => ({ listFaitsBudget: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({ useHasPermission: vi.fn(() => true) }));
vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { prenom: 'Halima', nom: 'Ousmane' } }),
}));

import { PermissionRoute } from '@/routes/PermissionRoute';
import { listFaitsBudget } from '@/lib/api/budget';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { useHasPermission } from '@/lib/auth/permissions';
import { ImpressionCrPage } from './ImpressionCrPage';

const mockStatuts = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockLignes = getLignesCrComite as unknown as ReturnType<typeof vi.fn>;
const mockFaits = listFaitsBudget as unknown as ReturnType<typeof vi.fn>;
const mockPerm = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const VUE = {
  crs: [
    {
      crId: 'cr1',
      crCode: 'CR_AG_SIEGE',
      libelle: 'Agence Siège',
      statut: 'VALIDE',
      saisisseurEmail: 'a@bsic.ne',
      validateurEmail: 'v@bsic.ne',
      dateSoumission: '2027-06-01',
      dateValidation: '2027-06-02',
      pnb: 600,
    },
  ],
};
const LIGNES = [
  {
    montantDevise: 1000,
    compte: { code: '701000', libelle: 'Produits' },
    ligneMetier: { code: 'LM_PART', libelle: 'Particuliers' },
  },
];

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/budget/comite/cr/:crCode/impression"
          element={<ImpressionCrPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ImpressionCrPage', () => {
  beforeEach(() => {
    mockPerm.mockReturnValue(true);
    mockStatuts.mockResolvedValue(VUE);
    mockLignes.mockResolvedValue(LIGNES);
    mockFaits.mockResolvedValue({ items: LIGNES });
  });
  afterEach(() => vi.clearAllMocks());

  it('loading : affiche « Génération du document… »', () => {
    renderAt('/budget/comite/cr/CR_AG_SIEGE/impression?versionId=2');
    expect(screen.getByText(/Génération du document/)).toBeInTheDocument();
  });

  it('paramètres manquants : versionId absent → message', async () => {
    renderAt('/budget/comite/cr/CR_AG_SIEGE/impression');
    expect(await screen.findByText(/Paramètres manquants/)).toBeInTheDocument();
  });

  it('erreur réseau → message d’erreur', async () => {
    mockStatuts.mockRejectedValue(new Error('boom'));
    renderAt('/budget/comite/cr/CR_AG_SIEGE/impression?versionId=2');
    expect(
      await screen.findByText(/Impossible de charger le document/),
    ).toBeInTheDocument();
  });

  it('nominal (validateur) : rendu + lignes via endpoint Comité', async () => {
    renderAt('/budget/comite/cr/CR_AG_SIEGE/impression?versionId=2');
    expect(
      await screen.findByText('Détail du Centre de Responsabilité'),
    ).toBeInTheDocument();
    expect(screen.getByText(/CR_AG_SIEGE/)).toBeInTheDocument();
    expect(screen.getByText('701000')).toBeInTheDocument();
    expect(mockLignes).toHaveBeenCalledWith('2', 'CR_AG_SIEGE');
    expect(mockFaits).not.toHaveBeenCalled();
  });

  it('saisisseur (sans BUDGET.VALIDER) : lignes via /faits/budget (périmètre)', async () => {
    mockPerm.mockReturnValue(false);
    renderAt('/budget/comite/cr/CR_AG_SIEGE/impression?versionId=2');
    await screen.findByText('Détail du Centre de Responsabilité');
    expect(mockFaits).toHaveBeenCalledWith({
      fkVersion: '2',
      fkCentre: 'cr1',
      limit: 200,
    });
    expect(mockLignes).not.toHaveBeenCalled();
  });

  it('permission insuffisante (route gardée) → 403', () => {
    mockPerm.mockReturnValue(false);
    render(
      <MemoryRouter
        initialEntries={['/budget/comite/cr/CR_AG_SIEGE/impression?versionId=2']}
      >
        <Routes>
          <Route
            path="/budget/comite/cr/:crCode/impression"
            element={
              <PermissionRoute permission="BUDGET.LIRE">
                <ImpressionCrPage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/403 — Accès refusé/)).toBeInTheDocument();
  });
});
