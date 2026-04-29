import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listStructures: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import { listStructures, type Structure } from '@/lib/api/referentiels';
import { StructuresPage } from './StructuresPage';

const mockListStructures = listStructures as unknown as ReturnType<typeof vi.fn>;

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

describe('StructuresPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and renders structures (with type badges and country)', async () => {
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

  it('calls listStructures without filters on initial mount', async () => {
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

  it('falls back to a toast on API error', async () => {
    mockListStructures.mockRejectedValue(new Error('boom'));

    render(<StructuresPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les structures',
      );
    });
  });
});
