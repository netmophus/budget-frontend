/** Tests ImpressionComitePage (palier 7.3 / 7.4). */
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
vi.mock('@/lib/auth/permissions', () => ({ useHasPermission: vi.fn(() => true) }));
vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { prenom: 'Souleymane', nom: 'Diori' } }),
}));

import { PermissionRoute } from '@/routes/PermissionRoute';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { useHasPermission } from '@/lib/auth/permissions';
import { ImpressionComitePage } from './ImpressionComitePage';

const mockStatuts = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockLignes = getLignesCrComite as unknown as ReturnType<typeof vi.fn>;
const mockPerm = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const VUE = {
  totalAttendus: 2,
  nbValides: 1,
  nbSoumis: 1,
  nbEnSaisie: 0,
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
      pnb: 1_600_000_000,
    },
    {
      crId: 'cr2',
      crCode: 'CR_B',
      libelle: 'CR B',
      statut: 'SOUMIS',
      saisisseurEmail: 'b@bsic.ne',
      validateurEmail: null,
      dateSoumission: '2027-06-03',
      dateValidation: null,
      pnb: 0,
    },
  ],
};
const LIGNES = [
  {
    montantDevise: 1_600_000_000,
    compte: { code: '701000', libelle: 'Produits' },
    ligneMetier: { code: 'LM_PART', libelle: 'Particuliers' },
  },
];

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/budget/comite/impression"
          element={<ImpressionComitePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ImpressionComitePage', () => {
  beforeEach(() => {
    mockPerm.mockReturnValue(true);
    mockStatuts.mockResolvedValue(VUE);
    mockLignes.mockResolvedValue(LIGNES);
  });
  afterEach(() => vi.clearAllMocks());

  it('loading : affiche « Génération du document… »', () => {
    renderAt('/budget/comite/impression?versionId=2');
    expect(screen.getByText(/Génération du document/)).toBeInTheDocument();
  });

  it('paramètre manquant : versionId absent → message', async () => {
    renderAt('/budget/comite/impression');
    expect(await screen.findByText(/Paramètre manquant/)).toBeInTheDocument();
  });

  it('erreur réseau → message d’erreur', async () => {
    mockStatuts.mockRejectedValue(new Error('boom'));
    renderAt('/budget/comite/impression?versionId=2');
    expect(
      await screen.findByText(/Impossible de charger le document/),
    ).toBeInTheDocument();
  });

  it('nominal : consolidé D2 (sans monPerimetre) + seul le CR validé détaillé', async () => {
    renderAt('/budget/comite/impression?versionId=2');
    expect(
      await screen.findByText(/Budget consolidé — BUDGET_2027_V1/),
    ).toBeInTheDocument();
    expect(screen.getByText('Vue Comité Budget — Arbitrage')).toBeInTheDocument();
    expect(screen.getByTestId('impression-consolide')).toBeInTheDocument();
    // Vue globale : appel SANS monPerimetre (1 seul argument).
    expect(mockStatuts).toHaveBeenCalledWith('2');
    // Détail uniquement du CR VALIDE (CR_AG_SIEGE), pas du SOUMIS (CR_B).
    expect(mockLignes).toHaveBeenCalledTimes(1);
    expect(mockLignes).toHaveBeenCalledWith('2', 'CR_AG_SIEGE');
  });

  it('permission insuffisante (route gardée) → 403', () => {
    mockPerm.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/budget/comite/impression?versionId=2']}>
        <Routes>
          <Route
            path="/budget/comite/impression"
            element={
              <PermissionRoute permission="BUDGET.VALIDER">
                <ImpressionComitePage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/403 — Accès refusé/)).toBeInTheDocument();
  });
});
