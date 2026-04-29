import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listCrs: vi.fn(),
  listStructures: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import {
  listCrs,
  listStructures,
  type CentreResponsabilite,
  type Structure,
} from '@/lib/api/referentiels';
import { CentresResponsabilitePage } from './CentresResponsabilitePage';

const mockListCrs = listCrs as unknown as ReturnType<typeof vi.fn>;
const mockListStructures = listStructures as unknown as ReturnType<typeof vi.fn>;

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
    libelleCourt: null,
    typeCr: 'cdp',
    fkStructure: '1',
    versionCourante: true,
    dateDebutValidite: '2026-04-15',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-04-15T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    structureCourante: {
      id: '1',
      codeStructure: 'DIR_RETAIL',
      libelle: 'Direction Retail',
    },
  },
];

const CR_WITHOUT_STRUCTURE: CentreResponsabilite = {
  ...SAMPLE_CRS[0]!,
  id: '2',
  codeCr: 'CR_ORPHAN',
  libelle: 'CR Sans Structure',
  structureCourante: undefined,
};

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <CentresResponsabilitePage />
    </MemoryRouter>,
  );
}

describe('CentresResponsabilitePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and renders CR with their parent structure libellé', async () => {
    mockListStructures.mockResolvedValue({
      items: SAMPLE_STRUCTURES,
      total: 1,
      page: 1,
      limit: 100,
    });
    mockListCrs.mockResolvedValue({
      items: SAMPLE_CRS,
      total: 1,
      page: 1,
      limit: 200,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('CR_DIR_RETAIL')).toBeInTheDocument();
    });
    expect(screen.getByText('CR Direction Retail')).toBeInTheDocument();
    expect(screen.getByText('CDP')).toBeInTheDocument();
    expect(screen.getByText('Direction Retail')).toBeInTheDocument();
  });

  it('renders "—" when structureCourante is missing', async () => {
    mockListStructures.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    mockListCrs.mockResolvedValue({
      items: [CR_WITHOUT_STRUCTURE],
      total: 1,
      page: 1,
      limit: 200,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('CR_ORPHAN')).toBeInTheDocument();
    });
    // La cellule structure rattachée affiche "—"
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('falls back to a toast when listCrs fails', async () => {
    mockListStructures.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    mockListCrs.mockRejectedValue(new Error('boom'));

    renderWithRouter();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les centres de responsabilité',
      );
    });
  });
});
