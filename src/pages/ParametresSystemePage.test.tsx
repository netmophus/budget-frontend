import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/realise-config', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/realise-config')
  >('@/lib/api/realise-config');
  return {
    ...actual,
    getModeSaisieRealise: vi.fn(),
    setModeSaisieRealise: vi.fn(),
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

const mockHasPermission = vi.fn(() => true);
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: () => mockHasPermission(),
}));

import {
  getModeSaisieRealise,
  setModeSaisieRealise,
} from '@/lib/api/realise-config';
import { ParametresSystemePage } from './ParametresSystemePage';

const mockGet = getModeSaisieRealise as unknown as ReturnType<typeof vi.fn>;
const mockSet = setModeSaisieRealise as unknown as ReturnType<typeof vi.fn>;

describe('ParametresSystemePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    cleanup();
  });

  it('affiche le mode courant chargé', async () => {
    mockGet.mockResolvedValue('CENTRALISE');
    render(<ParametresSystemePage />);
    await waitFor(() =>
      expect(screen.getByTestId('param-mode-current')).toHaveTextContent(
        /Centralisé/,
      ),
    );
  });

  it('CONFIGURATION.GERER absent → lecture seule (pas de select ni bouton)', async () => {
    mockHasPermission.mockReturnValue(false);
    mockGet.mockResolvedValue('CENTRALISE');
    render(<ParametresSystemePage />);
    await waitFor(() =>
      expect(screen.getByTestId('param-mode-current')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('param-mode-select')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('btn-enregistrer-mode'),
    ).not.toBeInTheDocument();
  });

  it('Enregistrer désactivé tant qu’aucun changement', async () => {
    mockGet.mockResolvedValue('CENTRALISE');
    render(<ParametresSystemePage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-enregistrer-mode')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('btn-enregistrer-mode')).toBeDisabled();
  });

  it('change CENTRALISE → DECENTRALISE avec confirmation explicite', async () => {
    mockGet.mockResolvedValue('CENTRALISE');
    mockSet.mockResolvedValue('DECENTRALISE');
    render(<ParametresSystemePage />);
    await waitFor(() =>
      expect(screen.getByTestId('param-mode-select')).toBeInTheDocument(),
    );

    // Ouvre le Select Radix et choisit le mode décentralisé.
    fireEvent.click(screen.getByTestId('param-mode-select'));
    const option = await screen.findByText('Décentralisé — saisie par CR');
    fireEvent.click(option);

    // Enregistrer → étape de confirmation (action structurante).
    fireEvent.click(screen.getByTestId('btn-enregistrer-mode'));
    expect(screen.getByTestId('param-mode-confirm')).toBeInTheDocument();

    // Confirmer → appel API + toast succès.
    fireEvent.click(screen.getByTestId('btn-confirmer-mode'));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith('DECENTRALISE'),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it('Annuler ferme la confirmation sans appeler l’API', async () => {
    mockGet.mockResolvedValue('CENTRALISE');
    render(<ParametresSystemePage />);
    await waitFor(() =>
      expect(screen.getByTestId('param-mode-select')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('param-mode-select'));
    fireEvent.click(await screen.findByText('Mixte — saisie ET import'));
    fireEvent.click(screen.getByTestId('btn-enregistrer-mode'));
    fireEvent.click(screen.getByTestId('btn-annuler-mode'));
    expect(screen.queryByTestId('param-mode-confirm')).not.toBeInTheDocument();
    expect(mockSet).not.toHaveBeenCalled();
  });
});
