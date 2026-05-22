/**
 * Tests Vitest CampagneDetailPage (Lot 8.2.A Palier 2).
 *
 * Pattern aligné sur CampagnesPage.test.tsx (Palier 1). Spécificité :
 * on utilise le vrai router via `<Routes>` pour que `useParams()`
 * retourne réellement `{ id: 'camp-1' }` — plus propre que mocker
 * `useParams` (qui déconnecterait du test).
 *
 * 7 cas couvrent :
 *  1. Render initial : header + 2 onglets + cartouche infos
 *  2. Onglet Comité actif par défaut + bouton "Ajouter membre"
 *  3. Statut EN_COURS : "Ajouter membre" + "Lancer" tous masqués
 *  4. PARAMETRAGE + comité vide : "Lancer" disabled
 *  5. PARAMETRAGE + ≥1 oblig : click "Lancer" → ConfirmDialog →
 *     click confirmer → API + toast.success
 *  6. Clic "Ajouter membre" → modale ouvre + fetch users
 *  7. Toast erreur si chargement campagne échoue
 */
// Lot 6.7.2 — render wrap avec <TooltipProvider> (cf. test-utils.tsx).
// Indispensable ici car CampagneDetailPage utilise <Tooltip> pour le
// bouton "Lancer" désactivé. Sans ce helper, Radix throw "Tooltip
// must be used within TooltipProvider" au mount.
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/campagnes', () => ({
  detailCampagne: vi.fn(),
  lancerCampagne: vi.fn(),
  ajouterMembreCampagne: vi.fn(),
}));

vi.mock('@/lib/api/users', () => ({
  listUsers: vi.fn(),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import {
  type CampagneDetail,
  detailCampagne,
  lancerCampagne,
} from '@/lib/api/campagnes';
import { listUsers } from '@/lib/api/users';
import { useHasPermission } from '@/lib/auth/permissions';
import type { ComiteMembre } from '@/types/campagne';

import { CampagneDetailPage } from './CampagneDetailPage';

const mockDetail = detailCampagne as unknown as ReturnType<typeof vi.fn>;
const mockLancer = lancerCampagne as unknown as ReturnType<typeof vi.fn>;
const mockListUsers = listUsers as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const MEMBRE_OBLIG: ComiteMembre = {
  id: 'mem-1',
  fkCampagne: 'camp-1',
  fkUser: '24',
  ordre: 1,
  estObligatoire: true,
  libelleFonction: 'DGA Opérations',
  dateCreation: '2026-12-02T10:00:00Z',
  user: {
    id: '24',
    email: 'dga@bsic.ne',
    nom: 'DIALLO',
    prenom: 'Aissatou',
  },
};

const CAMP_PARAM_VIDE: CampagneDetail = {
  id: 'camp-1',
  code: 'CAMPAGNE_2027',
  exerciceFiscal: 2027,
  libelle: 'Campagne budgétaire 2027',
  statut: 'PARAMETRAGE',
  modeVisaDefaut: 'PARALLELE',
  fkUserSignataireDefaut: '23',
  dateCreation: '2026-12-01T10:00:00Z',
  dateLancement: null,
  dateFin: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
  dateModification: null,
  signataireDefaut: {
    id: '23',
    email: 'dg@bsic.ne',
    nom: 'BARRY',
    prenom: 'Issoufou',
  },
  nombreMembres: 0,
  comiteMembres: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/campagnes/camp-1']}>
      <Routes>
        <Route
          path="/campagnes/:id"
          element={<CampagneDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CampagneDetailPage (Lot 8.2.A)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('charge la campagne et affiche header + 2 onglets + cartouche', async () => {
    mockDetail.mockResolvedValue(CAMP_PARAM_VIDE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CAMPAGNE_2027')).toBeInTheDocument();
    });
    expect(screen.getByText(/Exercice 2027/)).toBeInTheDocument();
    expect(
      screen.getByTestId('statut-camp-badge-PARAMETRAGE'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tab-comite')).toBeInTheDocument();
    expect(screen.getByTestId('tab-documents')).toBeInTheDocument();
    expect(
      screen.getByText(/Issoufou BARRY \(dg@bsic.ne\)/),
    ).toBeInTheDocument();
  });

  it('onglet Comité actif par défaut + bouton "Ajouter membre" visible si PARAMETRAGE+canGerer', async () => {
    mockDetail.mockResolvedValue(CAMP_PARAM_VIDE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('comite-table')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-ajouter-membre')).toBeInTheDocument();
    // Empty state coherent
    expect(
      screen.getByText(/Aucun membre dans le Comité/),
    ).toBeInTheDocument();
  });

  it('statut EN_COURS : "Ajouter membre" ET "Lancer" tous deux masqués', async () => {
    mockDetail.mockResolvedValue({
      ...CAMP_PARAM_VIDE,
      statut: 'EN_COURS',
      comiteMembres: [MEMBRE_OBLIG],
      nombreMembres: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CAMPAGNE_2027')).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('btn-ajouter-membre'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('btn-lancer-campagne'),
    ).not.toBeInTheDocument();
  });

  it('PARAMETRAGE + comité vide : "Lancer" présent mais disabled', async () => {
    mockDetail.mockResolvedValue(CAMP_PARAM_VIDE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-lancer-campagne')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-lancer-campagne')).toBeDisabled();
  });

  it('PARAMETRAGE + ≥1 membre obligatoire : click "Lancer" ouvre ConfirmDialog ; confirmer appelle API + toast', async () => {
    mockDetail.mockResolvedValue({
      ...CAMP_PARAM_VIDE,
      comiteMembres: [MEMBRE_OBLIG],
      nombreMembres: 1,
    });
    mockLancer.mockResolvedValue({
      ...CAMP_PARAM_VIDE,
      statut: 'EN_COURS',
      comiteMembres: [MEMBRE_OBLIG],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-lancer-campagne')).toBeInTheDocument();
    });
    const btnPage = screen.getByTestId('btn-lancer-campagne');
    expect(btnPage).not.toBeDisabled();
    fireEvent.click(btnPage);
    // ConfirmDialog s'ouvre → vérifie son titre
    await waitFor(() => {
      expect(
        screen.getByText(/Lancer la campagne CAMPAGNE_2027 \?/),
      ).toBeInTheDocument();
    });
    // Radix Dialog applique aria-hidden au reste du DOM → le bouton
    // de la page peut devenir invisible pour getAllByRole. On clique
    // donc le DERNIER bouton matching, garanti d'être dans le dialog.
    const btns = screen.getAllByRole('button', {
      name: /Lancer la campagne/i,
    });
    fireEvent.click(btns[btns.length - 1]);
    await waitFor(() => {
      expect(mockLancer).toHaveBeenCalledWith('camp-1');
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('CAMPAGNE_2027'),
      );
    });
  });

  it('click "Ajouter membre" ouvre la modale + déclenche fetch users', async () => {
    mockDetail.mockResolvedValue(CAMP_PARAM_VIDE);
    mockListUsers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-ajouter-membre')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-ajouter-membre'));
    expect(
      screen.getByText('Ajouter un membre au Comité'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith({
        limit: 100,
        estActif: true,
      });
    });
  });

  it('toast erreur si chargement campagne échoue', async () => {
    mockDetail.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger la campagne',
      );
    });
  });
});
