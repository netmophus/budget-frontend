import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/scenarios', () => ({
  listScenarios: vi.fn(),
  createScenario: vi.fn(),
  updateScenario: vi.fn(),
  archiverScenario: vi.fn(),
}));

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
  archiverScenario,
  listScenarios,
  type Scenario,
} from '@/lib/api/scenarios';
import { ScenariosPage } from './ScenariosPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listScenarios as unknown as ReturnType<typeof vi.fn>;
const mockArchive = archiverScenario as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Scenario[] = [
  {
    id: '1',
    codeScenario: 'CENTRAL',
    libelle: 'Scénario central',
    typeScenario: 'central',
    statut: 'actif',
    commentaire: 'Hypothèses macro de référence',
    exerciceFiscal: null,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    codeScenario: 'ALTERNATIF_HAUT',
    libelle: 'Scénario optimiste',
    typeScenario: 'optimiste',
    statut: 'actif',
    commentaire: null,
    exerciceFiscal: null,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '3',
    codeScenario: 'MEDIAN_2027',
    libelle: 'Scénario médian 2027',
    typeScenario: 'central',
    statut: 'actif',
    commentaire: 'Auto-créé Q9',
    exerciceFiscal: 2027,
    dateCreation: '2026-05-01T00:00:00Z',
    utilisateurCreation: 'admin@miznas.local',
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

describe('ScenariosPage', () => {
  beforeEach(() => {
    mockHasPermission.mockReturnValue(true);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders 3 scénarios avec libellés UI 'Médian'/'Optimiste'", async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    render(<ScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('CENTRAL')).toBeInTheDocument();
    });
    // 'central' (DB) → 'Médian' (UI). Apparaît 2 fois (CENTRAL + MEDIAN_2027).
    const medianBadges = screen.getAllByText('Médian');
    expect(medianBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Optimiste')).toBeInTheDocument();
  });

  it('admin : bouton "Nouveau scénario" visible', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    render(<ScenariosPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouveau scénario/i }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : pas de bouton "Nouveau scénario"', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    render(<ScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('CENTRAL')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouveau scénario/i }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : Modifier + Archiver visibles sur scénario actif', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    render(<ScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('Scénario central')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Scénario central'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Archiver/i }),
    ).toBeInTheDocument();
  });

  it('initial mount appelle listScenarios sans filtres', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<ScenariosPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50,
          typeScenario: undefined,
          statut: undefined,
        }),
      );
    });
  });

  it("toggle 'Actifs uniquement' filtre statut='actif'", async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    render(<ScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('CENTRAL')).toBeInTheDocument();
    });
    const toggle = screen.getByLabelText(
      /Actifs uniquement/i,
    ) as HTMLInputElement;
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'actif' }),
      );
    });
  });

  it('Archiver succès nominal → toast OK', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    mockArchive.mockResolvedValue({ ...SAMPLE[0], statut: 'archive' });

    render(<ScenariosPage />);
    await waitFor(() => {
      expect(screen.getByText('CENTRAL')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Scénario central'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Archiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Archiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Archiver le scénario CENTRAL/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Archiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/CENTRAL.*archivé/i),
      );
    });
    expect(mockArchive).toHaveBeenCalledWith('1');
  });

  it('Archiver 409 → toast erreur', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 3, page: 1, limit: 50 });
    mockArchive.mockRejectedValue(buildAxiosError(409, 'Déjà archivé'));

    render(<ScenariosPage />);
    await waitFor(() => {
      expect(screen.getByText('CENTRAL')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Scénario central'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Archiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Archiver/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Archiver le scénario CENTRAL/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Archiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Déjà archivé/),
      );
    });
  });
});
