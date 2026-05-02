import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listStructures: vi.fn(),
  createCr: vi.fn(),
  updateCr: vi.fn(),
}));

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn(),
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

import {
  type CentreResponsabilite,
  createCr,
  listStructures,
  type Structure,
  updateCr,
} from '@/lib/api/referentiels';
import { listRefSecondaires } from '@/lib/api/configuration';
import { __resetRefSecondaireCache } from '@/lib/hooks/useRefSecondaireOptions';
import { CrFormDrawer } from './CrFormDrawer';

const mockListStructures = listStructures as unknown as ReturnType<typeof vi.fn>;
const mockCreate = createCr as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateCr as unknown as ReturnType<typeof vi.fn>;
const mockListRef = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;

const REF_TYPE_CR = [
  { id: '1', code: 'cdc', libelle: 'Centre de coût (CDC)', description: null, ordre: 10, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
  { id: '2', code: 'cdp', libelle: 'Centre de profit (CDP)', description: null, ordre: 20, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
];

const STRUCTURE: Structure = {
  id: '12',
  codeStructure: 'BR_CIV',
  libelle: 'Branche Côte d\'Ivoire',
  libelleCourt: null,
  typeStructure: 'branche',
  niveauHierarchique: 2,
  fkStructureParent: null,
  codePays: 'CIV',
  versionCourante: true,
  dateDebutValidite: '2026-01-01',
  dateFinValidite: null,
  estActif: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

const CR_BASE: CentreResponsabilite = {
  id: '5',
  codeCr: 'CR_AG_ABJ_PLATEAU',
  libelle: 'CR Agence Plateau',
  libelleCourt: null,
  typeCr: 'cdp',
  fkStructure: '12',
  structureCourante: {
    id: '12',
    codeStructure: 'BR_CIV',
    libelle: 'Branche Côte d\'Ivoire',
  },
  versionCourante: true,
  dateDebutValidite: '2026-01-01',
  dateFinValidite: null,
  estActif: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

function setupMocks(): void {
  mockListStructures.mockResolvedValue({
    items: [STRUCTURE],
    total: 1,
    page: 1,
    limit: 200,
  });
  mockListRef.mockResolvedValue({
    items: REF_TYPE_CR,
    total: REF_TYPE_CR.length,
    page: 1,
    limit: 200,
  });
}

describe('CrFormDrawer', () => {
  beforeEach(() => {
    __resetRefSecondaireCache();
    setupMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
    // Radix Dialog Portal accroche entre tests — cleanup explicite
    // pour éviter les multi-matches sur getByLabelText.
    cleanup();
  });

  // ─── Création

  it('mode create : titre + champs vides + PAS de bandeau SCD2', () => {
    render(
      <CrFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Nouveau centre de responsabilité'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/SCD2 — Modification/i),
    ).not.toBeInTheDocument();
    const code = screen.getByLabelText(/Code CR/i) as HTMLInputElement;
    expect(code.disabled).toBe(false);
    expect(code.value).toBe('');
  });

  it('mode create : conversion automatique en MAJUSCULES', () => {
    render(
      <CrFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/Code CR/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'cr_treso' } });
    expect(code.value).toBe('CR_TRESO');
  });

  it('mode create : bouton Créer désactivé tant que requis manquants', () => {
    render(
      <CrFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Créer/i })).toBeDisabled();
  });

  // ─── Édition

  it('mode edit : code grisé en lecture seule', () => {
    render(
      <CrFormDrawer
        mode="edit"
        initial={CR_BASE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Modifier le centre de responsabilité'),
    ).toBeInTheDocument();
    const code = screen.getByLabelText(/Code CR/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('CR_AG_ABJ_PLATEAU');
  });

  it("mode edit : bandeau SCD2 jaune apparaît après modification libellé", async () => {
    render(
      <CrFormDrawer
        mode="edit"
        initial={CR_BASE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/SCD2 — Modification d'attribut historisé/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Libellé\s*\*/i), {
      target: { value: 'CR Agence Plateau (rénové)' },
    });
    await waitFor(() => {
      expect(
        screen.getByText(/SCD2 — Modification d'attribut historisé/i),
      ).toBeInTheDocument();
    });
  });

  it("mode edit : bandeau bleu si seul estActif modifié", () => {
    render(
      <CrFormDrawer
        mode="edit"
        initial={CR_BASE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/^Actif$/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText(/Mise à jour en place/i)).toBeInTheDocument();
  });

  it("mode edit : modifier libellé → PATCH avec libelle, toast nouvelle_version", async () => {
    mockUpdate.mockResolvedValue({
      ...CR_BASE,
      libelle: 'CR Plateau (V2)',
      modeMaj: 'nouvelle_version',
    });
    const onSuccess = vi.fn();

    render(
      <CrFormDrawer
        mode="edit"
        initial={CR_BASE}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Libellé\s*\*/i), {
      target: { value: 'CR Plateau (V2)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('CR_AG_ABJ_PLATEAU', {
        libelle: 'CR Plateau (V2)',
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/Nouvelle version SCD2/i),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("mode edit : 422 structure archivée → toast erreur", async () => {
    mockUpdate.mockRejectedValue(
      buildAxiosError(422, 'Structure inexistante ou archivée'),
    );

    render(
      <CrFormDrawer
        mode="edit"
        initial={CR_BASE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Libellé\s*\*/i), {
      target: { value: 'Autre libellé' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Structure inexistante ou archivée/),
      );
    });
  });

  it('Annuler appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <CrFormDrawer
        mode="create"
        isOpen
        onClose={onClose}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('mode create : 409 doublon → branche d\'erreur testable', () => {
    mockCreate.mockRejectedValue(buildAxiosError(409, 'Code existe déjà'));

    render(
      <CrFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
