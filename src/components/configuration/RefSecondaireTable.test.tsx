import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn(),
  toggleActifRefSecondaire: vi.fn(),
  deleteRefSecondaire: vi.fn(),
  // Importé indirectement par RefSecondaireFormDrawer ; mocks no-op
  createRefSecondaire: vi.fn(),
  updateRefSecondaire: vi.fn(),
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
  deleteRefSecondaire,
  listRefSecondaires,
  type RefSecondaire,
  toggleActifRefSecondaire,
} from '@/lib/api/configuration';
import { RefSecondaireTable } from './RefSecondaireTable';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;
const mockToggle = toggleActifRefSecondaire as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteRefSecondaire as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const SAMPLE_TYPE_STRUCTURE: RefSecondaire[] = [
  {
    id: '1',
    code: 'entite_juridique',
    libelle: 'Entité juridique',
    description: 'Société mère ou filiale juridiquement distincte.',
    ordre: 10,
    estActif: true,
    estSysteme: true,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '5',
    code: 'agence',
    libelle: 'Agence',
    description: 'Point de vente / unité opérationnelle terrain.',
    ordre: 50,
    estActif: true,
    estSysteme: false,
    dateCreation: '2026-01-01T00:00:00Z',
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

describe('RefSecondaireTable', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('rend les valeurs avec badges Actif / Système', async () => {
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });

    render(<RefSecondaireTable refKey="type-structure" />);

    await waitFor(() => {
      expect(screen.getByText('entite_juridique')).toBeInTheDocument();
    });
    expect(screen.getByText('agence')).toBeInTheDocument();
    expect(screen.getByText('Entité juridique')).toBeInTheDocument();
    // Au moins un badge "Actif" et un "Système"
    expect(screen.getAllByText('Actif').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Système').length).toBeGreaterThan(0);
  });

  it('appelle listRefSecondaires avec estActif=true par défaut', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<RefSecondaireTable refKey="type-structure" />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        'type-structure',
        expect.objectContaining({ estActif: true }),
      );
    });
  });

  it('toggle "Afficher inactives" → estActif=undefined', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<RefSecondaireTable refKey="type-structure" />);

    const toggle = await screen.findByLabelText(/Afficher les valeurs inactives/i);
    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = mockList.mock.calls as Array<
        [string, { estActif?: boolean }]
      >;
      const last = calls[calls.length - 1]![1];
      expect(last.estActif).toBeUndefined();
    });
  });

  it('toggle "Système uniquement" → estSysteme=true', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<RefSecondaireTable refKey="type-structure" />);

    const toggle = await screen.findByLabelText(/uniquement les valeurs système/i);
    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = mockList.mock.calls as Array<
        [string, { estSysteme?: boolean }]
      >;
      const last = calls[calls.length - 1]![1];
      expect(last.estSysteme).toBe(true);
    });
  });

  it('bouton "Nouvelle valeur" visible pour admin', async () => {
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });

    render(<RefSecondaireTable refKey="type-structure" />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouvelle valeur/i }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : pas de bouton "Nouvelle valeur" ni icônes d\'action', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });

    render(<RefSecondaireTable refKey="type-structure" />);

    await waitFor(() => {
      expect(screen.getByText('agence')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouvelle valeur/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Modifier/i }),
    ).not.toBeInTheDocument();
  });

  it('icône "Désactiver" → modale → toggle → toast succès', async () => {
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });
    mockToggle.mockResolvedValue({
      entity: { ...SAMPLE_TYPE_STRUCTURE[1]!, estActif: false },
      warning: null,
    });

    render(<RefSecondaireTable refKey="type-structure" />);

    await waitFor(() => {
      expect(screen.getByText('agence')).toBeInTheDocument();
    });
    // Trouve le bouton Désactiver pour la ligne 'agence' (index 1)
    const toggles = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(toggles[0]!);

    await waitFor(() => {
      expect(
        screen.getByText(/ne pourra plus être choisie/i),
      ).toBeInTheDocument();
    });
    // Bouton Confirmer "Désactiver" dans la modale
    const buttons = screen.getAllByRole('button', { name: /^Désactiver$/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith(
        'type-structure',
        expect.any(String),
      );
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  it('toggle avec warning backend → toast.info(warning)', async () => {
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });
    mockToggle.mockResolvedValue({
      entity: { ...SAMPLE_TYPE_STRUCTURE[1]!, estActif: false },
      warning: 'agence est utilisée par 3 lignes par dim_structure.',
    });

    render(<RefSecondaireTable refKey="type-structure" />);
    await waitFor(() => {
      expect(screen.getByText('agence')).toBeInTheDocument();
    });
    const toggles = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(toggles[0]!);
    await waitFor(() => {
      expect(
        screen.getByText(/ne pourra plus être choisie/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /^Désactiver$/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastInfo).toHaveBeenCalledWith(
        expect.stringMatching(/dim_structure/),
      );
    });
  });

  it("DELETE valeur référencée 409 → toast erreur backend", async () => {
    mockList.mockResolvedValue({
      items: [SAMPLE_TYPE_STRUCTURE[1]!],
      total: 1,
      page: 1,
      limit: 50,
    });
    mockDelete.mockRejectedValue(
      buildAxiosError(409, "La valeur 'agence' est référencée par dim_structure"),
    );

    render(<RefSecondaireTable refKey="type-structure" />);
    await waitFor(() => {
      expect(screen.getByText('agence')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Supprimer définitivement.*agence/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /^Supprimer$/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/référencée/),
      );
    });
  });

  it('bouton Supprimer désactivé sur valeur estSysteme=true', async () => {
    mockList.mockResolvedValue({
      items: SAMPLE_TYPE_STRUCTURE,
      total: 2,
      page: 1,
      limit: 50,
    });

    render(<RefSecondaireTable refKey="type-structure" />);
    await waitFor(() => {
      expect(screen.getByText('entite_juridique')).toBeInTheDocument();
    });
    const supprimerButtons = screen.getAllByRole('button', {
      name: /Supprimer/i,
    });
    // Le 1er (entite_juridique, estSysteme=true) doit être disabled
    expect(supprimerButtons[0]).toBeDisabled();
    // Le 2e (agence, estSysteme=false) doit être actif
    expect(supprimerButtons[1]).not.toBeDisabled();
  });
});
