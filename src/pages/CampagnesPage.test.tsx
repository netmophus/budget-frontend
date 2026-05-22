/**
 * Tests Vitest CampagnesPage (Lot 8.2.A).
 *
 * Pattern aligné sur VersionsPage.test.tsx : mock des modules API +
 * react-router-dom + sonner + permissions. Rendu via MemoryRouter.
 *
 * 6 cas couvrent : render initial empty, render avec liste + badges,
 * clic ligne → navigate, clic Créer → ouvre modale (et fetch users),
 * permission absente → bouton Créer caché, toast erreur si API down.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/campagnes', () => ({
  listerCampagnes: vi.fn(),
  creerCampagne: vi.fn(),
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

import { listerCampagnes } from '@/lib/api/campagnes';
import { listUsers } from '@/lib/api/users';
import { useHasPermission } from '@/lib/auth/permissions';
import type { Campagne } from '@/types/campagne';

import { CampagnesPage } from './CampagnesPage';

const mockList = listerCampagnes as unknown as ReturnType<typeof vi.fn>;
const mockListUsers = listUsers as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE: Campagne[] = [
  {
    id: 'camp-uuid-1',
    code: 'CAMPAGNE_2026',
    exerciceFiscal: 2026,
    libelle: 'Campagne budgétaire 2026',
    statut: 'EN_COURS',
    modeVisaDefaut: 'PARALLELE',
    fkUserSignataireDefaut: '23',
    dateCreation: '2026-01-15T10:00:00Z',
    dateLancement: '2026-02-01T10:00:00Z',
    dateFin: null,
    utilisateurCreation: 'admin@bsic.ne',
    utilisateurModification: null,
    dateModification: null,
    signataireDefaut: {
      id: '23',
      email: 'dg@bsic.ne',
      nom: 'BARRY',
      prenom: 'Issoufou',
    },
    nombreMembres: 3,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <CampagnesPage />
    </MemoryRouter>,
  );
}

describe('CampagnesPage (Lot 8.2.A)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('render initial vide : empty state + bouton Créer visibles', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucune campagne créée/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-creer-campagne')).toBeInTheDocument();
  });

  it('charge la liste et affiche code/libellé/badge statut/signataire', async () => {
    mockList.mockResolvedValue(SAMPLE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CAMPAGNE_2026')).toBeInTheDocument();
    });
    expect(screen.getByText('Campagne budgétaire 2026')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(
      screen.getByTestId('statut-camp-badge-EN_COURS'),
    ).toBeInTheDocument();
    expect(screen.getByText('Issoufou BARRY')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('clic sur ligne navigue vers /campagnes/:id', async () => {
    mockList.mockResolvedValue(SAMPLE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CAMPAGNE_2026')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('camp-row-camp-uuid-1'));
    expect(navigate).toHaveBeenCalledWith('/campagnes/camp-uuid-1');
  });

  it('clic sur "Créer" ouvre la modale + déclenche fetch des users', async () => {
    mockList.mockResolvedValue([]);
    mockListUsers.mockResolvedValue({
      items: [
        {
          id: '24',
          email: 'dga@bsic.ne',
          nom: 'DIALLO',
          prenom: 'Aissatou',
          estActif: true,
          dateDerniereConnexion: null,
          dateCreation: '2025-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-creer-campagne')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-creer-campagne'));
    expect(
      screen.getByText('Créer une nouvelle campagne budgétaire'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith({
        limit: 100,
        estActif: true,
      });
    });
  });

  it('cache le bouton "Créer" sans permission CAMPAGNE.GERER', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucune campagne créée/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('btn-creer-campagne'),
    ).not.toBeInTheDocument();
  });

  it('toast erreur si listerCampagnes échoue', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les campagnes',
      );
    });
  });
});
