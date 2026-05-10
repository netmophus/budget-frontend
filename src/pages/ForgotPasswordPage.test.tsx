/**
 * Tests Vitest ForgotPasswordPage (Lot 6.5.A).
 *
 * Couvre :
 *  - rendu initial (form, champ email, bouton submit) ;
 *  - validation : email invalide → erreur zod, pas d'appel API ;
 *  - succès : POST /auth/forgot-password appelé, message de
 *    confirmation affiché (même message pour connu/inconnu côté
 *    backend, on respecte le contrat anti-énumération) ;
 *  - erreur API : toast.error sans crash.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';

vi.mock('@/lib/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/auth')>(
    '@/lib/api/auth',
  );
  return { ...actual, forgotPassword: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));

import { forgotPassword } from '@/lib/api/auth';
import { toast } from 'sonner';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const mockForgot = forgotPassword as unknown as ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('rend le formulaire avec champ email + bouton submit', () => {
    renderPage();
    expect(screen.getByTestId('page-forgot-password')).toBeInTheDocument();
    expect(screen.getByTestId('fp-email')).toBeInTheDocument();
    expect(screen.getByTestId('fp-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('forgot-confirmation')).not.toBeInTheDocument();
  });

  it("validation zod : email invalide → l'API n'est pas appelée + DOM reste sur le form", async () => {
    renderPage();
    fireEvent.change(screen.getByTestId('fp-email'), {
      target: { value: 'pas-un-email' },
    });
    fireEvent.click(screen.getByTestId('fp-submit'));
    // Laisser le temps au handleSubmit + validation zod de tourner.
    await new Promise((r) => setTimeout(r, 50));
    // Contrat critique : aucune requête API n'est partie pour un email
    // invalide. Le DOM reste sur le formulaire (pas de transition vers
    // la confirmation).
    expect(mockForgot).not.toHaveBeenCalled();
    expect(screen.queryByTestId('forgot-confirmation')).not.toBeInTheDocument();
    expect(screen.getByTestId('fp-submit')).toBeInTheDocument();
  });

  it('succès : appelle forgotPassword + affiche confirmation + toast', async () => {
    mockForgot.mockResolvedValue({
      success: true,
      message: "Si l'email existe, un lien de réinitialisation a été envoyé.",
    });
    renderPage();
    fireEvent.input(screen.getByTestId('fp-email'), {
      target: { value: 'jean@miznas.local' },
    });
    fireEvent.click(screen.getByTestId('fp-submit'));
    await waitFor(() =>
      expect(mockForgot).toHaveBeenCalledWith('jean@miznas.local'),
    );
    expect(toast.success).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('forgot-confirmation')).toBeInTheDocument(),
    );
    // Le formulaire est masqué (state envoye=true).
    expect(screen.queryByTestId('fp-submit')).not.toBeInTheDocument();
  });

  it('erreur API : toast.error sans transition vers la confirmation', async () => {
    const err = new AxiosError('boom');
    err.response = {
      data: { message: 'Trop de demandes', statusCode: 429 },
      status: 429,
      statusText: 'Too Many Requests',
      headers: {},
      config: {} as never,
    };
    mockForgot.mockRejectedValue(err);
    renderPage();
    fireEvent.input(screen.getByTestId('fp-email'), {
      target: { value: 'jean@miznas.local' },
    });
    fireEvent.click(screen.getByTestId('fp-submit'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Trop de demandes'),
    );
    expect(screen.queryByTestId('forgot-confirmation')).not.toBeInTheDocument();
  });
});
