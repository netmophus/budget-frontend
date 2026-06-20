/** Tests ImpressionPerimetrePage (palier 7.2 / 7.4). */
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
    sel({ user: { prenom: 'Ibrahima', nom: 'Mahamadou' } }),
}));

import { PermissionRoute } from '@/routes/PermissionRoute';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { useHasPermission } from '@/lib/auth/permissions';
import { ImpressionPerimetrePage } from './ImpressionPerimetrePage';

const mockStatuts = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockLignes = getLignesCrComite as unknown as ReturnType<typeof vi.fn>;
const mockPerm = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const VUE = {
  totalAttendus: 1,
  nbValides: 1,
  nbSoumis: 0,
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
          path="/budget/validations/impression"
          element={<ImpressionPerimetrePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ImpressionPerimetrePage', () => {
  beforeEach(() => {
    mockPerm.mockReturnValue(true);
    mockStatuts.mockResolvedValue(VUE);
    mockLignes.mockResolvedValue(LIGNES);
  });
  afterEach(() => vi.clearAllMocks());

  it('loading : affiche « Génération du document… »', () => {
    renderAt('/budget/validations/impression?versionId=2');
    expect(screen.getByText(/Génération du document/)).toBeInTheDocument();
  });

  it('paramètre manquant : versionId absent → message', async () => {
    renderAt('/budget/validations/impression');
    expect(await screen.findByText(/Paramètre manquant/)).toBeInTheDocument();
  });

  it('erreur réseau → message d’erreur', async () => {
    mockStatuts.mockRejectedValue(new Error('boom'));
    renderAt('/budget/validations/impression?versionId=2');
    expect(
      await screen.findByText(/Impossible de charger le document/),
    ).toBeInTheDocument();
  });

  it('nominal : titre périmètre + filtrage monPerimetre + 1 bloc CR', async () => {
    renderAt('/budget/validations/impression?versionId=2');
    expect(
      await screen.findByText(/Périmètre de validation — Ibrahima Mahamadou/),
    ).toBeInTheDocument();
    // Filtrage périmètre (2e argument true).
    expect(mockStatuts).toHaveBeenCalledWith('2', true);
    // Le détail du CR (compte) est rendu.
    expect(screen.getByText('701000')).toBeInTheDocument();
  });

  it('permission insuffisante (route gardée) → 403', () => {
    mockPerm.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/budget/validations/impression?versionId=2']}>
        <Routes>
          <Route
            path="/budget/validations/impression"
            element={
              <PermissionRoute permission="BUDGET.VALIDER">
                <ImpressionPerimetrePage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/403 — Accès refusé/)).toBeInTheDocument();
  });
});
