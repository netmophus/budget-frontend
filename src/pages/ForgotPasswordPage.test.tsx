/**
 * Tests Vitest ForgotPasswordPage (Lot 6.5.A + Lot 7.3 V8 refonte).
 *
 * Couvre :
 *  - rendu initial (form, champ email, bouton submit) ;
 *  - rendu PublicLayout V5 : zone identité MIZNAS visible,
 *    icône Key dans cercle ambre, lien retour vers /login ;
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

  it('rend le PublicLayout V5 (zone identité MIZNAS visible)', () => {
    renderPage();
    expect(screen.getByTestId('public-layout')).toBeInTheDocument();
    expect(screen.getByTestId('public-layout-identite')).toBeInTheDocument();
    expect(screen.getByTestId('public-layout-wordmark').textContent).toBe(
      'MIZNAS',
    );
  });

  it('rend l\'icône Key dans un cercle ambre (signature visuelle)', () => {
    renderPage();
    const circle = screen.getByTestId('forgot-key-circle');
    expect(circle).toBeInTheDocument();
    expect(circle.className).toContain('rounded-full');
    expect(circle.className).toContain('bg-(--miznas-ambre)/10');
  });

  it('le bouton submit porte le libellé « Envoyer le lien » + icône Send', () => {
    renderPage();
    const submit = screen.getByTestId('fp-submit');
    expect(submit.textContent).toContain('Envoyer le lien');
    // Icône Lucide Send rendue dans le bouton
    expect(submit.querySelector('svg')).not.toBeNull();
  });

  it('le lien retour pointe vers /login (avec icône ArrowLeft)', () => {
    renderPage();
    const lien = screen.getByRole('link', { name: /retour à la connexion/i });
    expect(lien).toHaveAttribute('href', '/login');
    expect(lien.querySelector('svg')).not.toBeNull();
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
