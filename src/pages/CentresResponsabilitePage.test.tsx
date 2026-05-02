import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listCrs: vi.fn(),
  listStructures: vi.fn(),
  getCrHistorique: vi.fn(),
  createCr: vi.fn(),
  updateCr: vi.fn(),
  deleteCr: vi.fn(),
}));

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
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
    info: (m: string) => toastInfo(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import {
  type CentreResponsabilite,
  deleteCr,
  getCrHistorique,
  listCrs,
  listStructures,
  type Structure,
} from '@/lib/api/referentiels';
import { CentresResponsabilitePage } from './CentresResponsabilitePage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockListCrs = listCrs as unknown as ReturnType<typeof vi.fn>;
const mockListStructures = listStructures as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getCrHistorique as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteCr as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE_STRUCTURES: Structure[] = [
  {
    id: '1',
    codeStructure: 'DIR_RETAIL',
    libelle: 'Direction Retail',
    libelleCourt: null,
    typeStructure: 'direction',
    niveauHierarchique: 3,
    fkStructureParent: null,
    codePays: 'CIV',
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

const SAMPLE_CRS: CentreResponsabilite[] = [
  {
    id: '1',
    codeCr: 'CR_DIR_RETAIL',
    libelle: 'CR Direction Retail',
    libelleCourt: 'CR Retail',
    typeCr: 'cdp',
    fkStructure: '1',
    structureCourante: {
      id: '1',
      codeStructure: 'DIR_RETAIL',
      libelle: 'Direction Retail',
    },
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
    codeCr: 'CR_BR_CIV_FONCTIONS',
    libelle: 'CR Fonctions support',
    libelleCourt: null,
    typeCr: 'cdc',
    fkStructure: '1',
    structureCourante: {
      id: '1',
      codeStructure: 'BR_CIV',
      libelle: 'Branche Côte d\'Ivoire',
    },
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

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CentresResponsabilitePage />
    </MemoryRouter>,
  );
}

describe('CentresResponsabilitePage', () => {
  beforeEach(() => {
    mockHasPermission.mockReturnValue(true);
    mockListStructures.mockResolvedValue({
      items: SAMPLE_STRUCTURES,
      total: 1,
      page: 1,
      limit: 100,
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders CRs avec libellé court + structure rattachée', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    expect(screen.getByText(/CR Retail/)).toBeInTheDocument();
    expect(screen.getByText('Direction Retail')).toBeInTheDocument();
  });

  it('initial mount calls listCrs sans filtres typeCr/codeStructure', async () => {
    mockListCrs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(mockListCrs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 200,
          codeStructure: undefined,
          typeCr: undefined,
        }),
      );
    });
  });

  it('clicking a row opens DetailDrawer + lien navigation', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CR Direction Retail'));

    await waitFor(() => {
      expect(screen.getByText('CR CR_DIR_RETAIL')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Voir la structure : DIR_RETAIL/ }),
    ).toBeInTheDocument();
  });

  it('drawer history button calls getCrHistorique', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    mockHistory.mockResolvedValue([SAMPLE_CRS[0]]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CR Direction Retail'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('CR_DIR_RETAIL');
    });
  });

  it('shows toast on API error', async () => {
    mockListCrs.mockRejectedValue(new Error('boom'));
    renderPage();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les centres de responsabilité',
      );
    });
  });

  // ─── Lot 2.5F : CRUD actions

  it('admin : bouton "Nouveau centre de responsabilité" visible', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Nouveau centre de responsabilité/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : bouton Nouveau absent', async () => {
    mockHasPermission.mockReturnValue(false);
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', {
        name: /Nouveau centre de responsabilité/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : Modifier + Désactiver visibles sur CR actif', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CR Direction Retail'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
  });

  it('Désactiver 409 → toast erreur', async () => {
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 2,
      page: 1,
      limit: 200,
    });
    mockDelete.mockRejectedValue(
      buildAxiosError(409, 'CR référencé par des saisies courantes'),
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CR Direction Retail'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver le CR CR_DIR_RETAIL/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/référencé par des saisies/),
      );
    });
  });
});
