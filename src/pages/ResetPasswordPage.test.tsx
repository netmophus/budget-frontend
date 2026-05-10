/**
 * Tests Vitest ResetPasswordPage (Lot 6.5.A).
 *
 * Couvre :
 *  - sans token dans la query → message d'erreur, pas de form ;
 *  - avec token : rendu form 2 champs + submit ;
 *  - validation policy : mdp < 12 → erreur zod, pas d'appel API ;
 *  - validation policy : sans caractère spécial → erreur ;
 *  - confirmation différente → erreur ;
 *  - succès : appelle resetPassword + navigate /login + toast ;
 *  - erreur API EXPIRED_TOKEN → toast spécifique ;
 *  - erreur API INVALID_TOKEN → toast spécifique.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';

vi.mock('@/lib/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/auth')>(
    '@/lib/api/auth',
  );
  return { ...actual, resetPassword: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

import { resetPassword } from '@/lib/api/auth';
import { toast } from 'sonner';
import { ResetPasswordPage } from './ResetPasswordPage';

const mockReset = resetPassword as unknown as ReturnType<typeof vi.fn>;

function renderPage(token: string | null) {
  const search = token === null ? '' : `?token=${encodeURIComponent(token)}`;
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockReset.mockReset();
    mockNavigate.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('sans token query → message d\'erreur affiché, pas de formulaire', () => {
    renderPage(null);
    expect(screen.getByTestId('rp-token-manquant')).toBeInTheDocument();
    expect(screen.queryByTestId('rp-submit')).not.toBeInTheDocument();
  });

  it('avec token → rend form 2 champs + bouton submit', () => {
    renderPage('uuid-test');
    expect(screen.getByTestId('rp-nouveau')).toBeInTheDocument();
    expect(screen.getByTestId('rp-confirmation')).toBeInTheDocument();
    expect(screen.getByTestId('rp-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('rp-token-manquant')).not.toBeInTheDocument();
  });

  it('policy : mdp < 12 caractères → erreur zod + pas d\'appel API', async () => {
    renderPage('uuid-test');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'Short!1' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'Short!1' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(screen.getByText(/Au moins 12 caractères/i)).toBeInTheDocument(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('policy : pas de caractère spécial → erreur zod', async () => {
    renderPage('uuid-test');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'NoSpecialChar9' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'NoSpecialChar9' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/Au moins 1 caractère spécial/i),
      ).toBeInTheDocument(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('confirmation différente du nouveau mdp → erreur', async () => {
    renderPage('uuid-test');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'OtherPass!2026' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/La confirmation ne correspond pas/i),
      ).toBeInTheDocument(),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('succès : appelle resetPassword + navigate /login + toast', async () => {
    mockReset.mockResolvedValue({
      success: true,
      message: 'Mot de passe changé avec succès.',
    });
    renderPage('mon-token-uuid');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith('mon-token-uuid', 'ResetOk!2026'),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('erreur API EXPIRED_TOKEN → toast spécifique "Le lien a expiré"', async () => {
    const err = new AxiosError('expired');
    err.response = {
      data: {
        message: 'expired',
        errorCode: 'EXPIRED_TOKEN',
        statusCode: 410,
      },
      status: 410,
      statusText: 'Gone',
      headers: {},
      config: {} as never,
    };
    mockReset.mockRejectedValue(err);
    renderPage('mon-token-uuid');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Le lien a expiré'),
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('erreur API INVALID_TOKEN → toast spécifique "Lien invalide"', async () => {
    const err = new AxiosError('invalid');
    err.response = {
      data: {
        message: 'invalid',
        errorCode: 'INVALID_TOKEN',
        statusCode: 400,
      },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    mockReset.mockRejectedValue(err);
    renderPage('mon-token-uuid');
    fireEvent.input(screen.getByTestId('rp-nouveau'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.input(screen.getByTestId('rp-confirmation'), {
      target: { value: 'ResetOk!2026' },
    });
    fireEvent.click(screen.getByTestId('rp-submit'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Lien invalide'),
      ),
    );
  });
});
