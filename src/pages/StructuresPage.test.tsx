import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listStructures: vi.fn(),
  getStructureHistorique: vi.fn(),
  createStructure: vi.fn(),
  updateStructure: vi.fn(),
  deleteStructure: vi.fn(),
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
  listStructures,
  type Structure,
  deleteStructure,
} from '@/lib/api/referentiels';
import { StructuresPage } from './StructuresPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockListStructures = listStructures as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteStructure as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Structure[] = [
  {
    id: '1',
    codeStructure: 'SOC_BANK_UEMOA',
    libelle: 'Banque Pilote UEMOA',
    libelleCourt: 'BPU',
    typeStructure: 'entite_juridique',
    niveauHierarchique: 1,
    fkStructureParent: null,
    codePays: null,
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
    codeStructure: 'BR_CIV',
    libelle: "Branche Côte d'Ivoire",
    libelleCourt: null,
    typeStructure: 'branche',
    niveauHierarchique: 2,
    fkStructureParent: '1',
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

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(
    message,
    String(status),
    undefined,
    undefined,
    {
      status,
      data: { statusCode: status, message },
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() } as never,
    },
  );
}

describe('StructuresPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('rend les structures avec badges type et pays', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);

    await waitFor(() => {
      expect(screen.getByText('SOC_BANK_UEMOA')).toBeInTheDocument();
    });
    expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    expect(screen.getByText('Entité juridique')).toBeInTheDocument();
    expect(screen.getByText('Branche')).toBeInTheDocument();
    expect(screen.getByText("Côte d'Ivoire")).toBeInTheDocument();
  });

  it('appelle listStructures sans filtres au mount', async () => {
    mockListStructures.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);

    await waitFor(() => {
      expect(mockListStructures).toHaveBeenCalledWith(
        expect.objectContaining({
          codePays: undefined,
          typeStructure: undefined,
          search: undefined,
        }),
      );
    });
  });

  it('toast erreur si l’API échoue', async () => {
    mockListStructures.mockRejectedValue(new Error('boom'));

    render(<StructuresPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les structures',
      );
    });
  });

  it('bouton "Nouvelle structure" visible pour admin (REFERENTIEL.GERER)', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouvelle structure/i }),
      ).toBeInTheDocument();
    });
  });

  it('bouton "Nouvelle structure" CACHÉ pour LECTEUR (sans REFERENTIEL.GERER)', async () => {
    mockHasPermission.mockReturnValue(false);
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);

    await waitFor(() => {
      expect(screen.getByText('SOC_BANK_UEMOA')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouvelle structure/i }),
    ).not.toBeInTheDocument();
  });

  it('clic sur une ligne ouvre le drawer détail', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);

    await waitFor(() => {
      expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Branche Côte d'Ivoire"));

    await waitFor(() => {
      expect(screen.getByText('Structure BR_CIV')).toBeInTheDocument();
    });
    // Les boutons d'action sont visibles pour admin sur structure active
    expect(
      screen.getByRole('button', { name: /Modifier/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
  });

  it('LECTEUR : drawer détail SANS boutons Modifier/Désactiver', async () => {
    mockHasPermission.mockReturnValue(false);
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);
    await waitFor(() => {
      expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Branche Côte d'Ivoire"));

    await waitFor(() => {
      expect(screen.getByText('Structure BR_CIV')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Modifier/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Désactiver/i }),
    ).not.toBeInTheDocument();
  });

  it('clic Désactiver ouvre la modale de confirmation', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });

    render(<StructuresPage />);
    await waitFor(() => {
      expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Branche Côte d'Ivoire"));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver la structure BR_CIV/i),
      ).toBeInTheDocument();
    });
    // Avertissement métier sur les saisies budget
    expect(
      screen.getByText(/saisies budget déjà effectuées/i),
    ).toBeInTheDocument();
  });

  it('confirmation Désactiver appelle deleteStructure → toast succès', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });
    mockDelete.mockResolvedValue(undefined);

    render(<StructuresPage />);
    await waitFor(() => {
      expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Branche Côte d'Ivoire"));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    // 2 boutons "Désactiver" maintenant (drawer + modale)
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver la structure BR_CIV/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('BR_CIV');
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/BR_CIV.*désactivée/i),
      );
    });
  });

  it('Désactiver échoue 409 (CR enfants) → toast erreur backend', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 200,
    });
    mockDelete.mockRejectedValue(
      buildAxiosError(
        409,
        'Impossible de désactiver : 3 centres de responsabilité sont rattachés.',
      ),
    );

    render(<StructuresPage />);
    await waitFor(() => {
      expect(screen.getByText("Branche Côte d'Ivoire")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Branche Côte d'Ivoire"));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver la structure BR_CIV/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/3 centres de responsabilité/i),
      );
    });
  });
});
