/**
 * Tests LoginPage (Lot 7.3) — comblement du trou de couverture
 * identifié lors du diagnostic (les 3 autres pages publiques ont
 * leurs tests depuis le Lot 6.5).
 *
 * Couvre :
 *  - Rendu PublicLayout + wordmark MIZNAS + champs + bouton + lien
 *  - Validation Zod : email invalide, mdp < 8 chars
 *  - aria-invalid + aria-describedby sur erreurs Zod
 *  - Submit succès → appelle login() puis navigate(from)
 *  - Submit 401 → bandeau inline persistant ("Identifiants invalides")
 *  - Submit erreur réseau → toast.error (volatile)
 *  - État isLoading → bouton disabled + libellé "Connexion..."
 *  - Utilisateur déjà authentifié → <Navigate to=/dashboard replace />
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();
let mockIsAuth = false;
let mockIsLoading = false;

vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: <T,>(
    selector: (s: {
      login: typeof mockLogin;
      isLoading: boolean;
    }) => T,
  ): T =>
    selector({
      login: mockLogin,
      isLoading: mockIsLoading,
    }),
  useIsAuthenticated: () => mockIsAuth,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

import { toast } from 'sonner';

import { LoginPage } from './LoginPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={<div data-testid="dashboard-stub">Dashboard</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function buildAxiosError(
  status: number,
  body: { message?: string; errorCode?: string } | null,
): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    status,
    statusText: 'Mock',
    data: body,
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosError['response'];
  err.config = { headers: new AxiosHeaders() } as AxiosError['config'];
  return err;
}

describe('LoginPage (Lot 7.3)', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
    mockIsAuth = false;
    mockIsLoading = false;
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => cleanup());

  it('rend le wordmark MIZNAS et la zone identité PublicLayout', () => {
    renderPage();
    expect(screen.getByTestId('public-layout-wordmark').textContent).toBe(
      'MIZNAS',
    );
    expect(screen.getByTestId('public-layout')).toBeInTheDocument();
    expect(screen.getByTestId('public-layout-identite')).toBeInTheDocument();
  });

  it('rend les 2 inputs (email, mot de passe), le bouton et le lien forgot', () => {
    renderPage();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /se connecter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('login-lien-forgot-password'),
    ).toBeInTheDocument();
  });

  it('rend les icônes Mail et Lock dans les inputs', () => {
    renderPage();
    expect(screen.getByTestId('login-icon-email')).toBeInTheDocument();
    expect(screen.getByTestId('login-icon-password')).toBeInTheDocument();
  });

  it('rend le cercle ambre contenant l\'icône cadenas en haut du formulaire', () => {
    renderPage();
    const circle = screen.getByTestId('login-lock-circle');
    expect(circle).toBeInTheDocument();
    expect(circle.className).toContain('rounded-full');
    expect(circle.className).toContain('bg-(--miznas-ambre)/10');
  });

  it('bouton œil : type=password par défaut + aria-label "Afficher"', () => {
    renderPage();
    const motDePasse = screen.getByLabelText('Mot de passe');
    expect(motDePasse).toHaveAttribute('type', 'password');
    const toggle = screen.getByTestId('login-toggle-password-visibility');
    expect(toggle).toHaveAttribute('aria-label', 'Afficher le mot de passe');
  });

  it('bouton œil : clic → type=text + aria-label "Masquer"', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = screen.getByTestId('login-toggle-password-visibility');

    await user.click(toggle);

    const motDePasse = screen.getByLabelText('Mot de passe');
    expect(motDePasse).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-label', 'Masquer le mot de passe');

    // 2e clic → revient à password.
    await user.click(toggle);
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute(
      'type',
      'password',
    );
    expect(toggle).toHaveAttribute('aria-label', 'Afficher le mot de passe');
  });

  it('Zod : email invalide → erreur affichée + aria-invalid + aria-describedby', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Email'), 'pas-un-email');
    await user.type(
      screen.getByLabelText('Mot de passe'),
      'motdepassevalide',
    );
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    const emailInput = screen.getByLabelText('Email');
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Email invalide')).toBeInTheDocument();
    // login() ne doit PAS avoir été appelé (validation bloque le submit).
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('Zod : mot de passe < 8 caractères → erreur affichée + aria-invalid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Email'), 'admin@miznas.local');
    await user.type(screen.getByLabelText('Mot de passe'), 'court');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    const mdpInput = screen.getByLabelText('Mot de passe');
    await waitFor(() => {
      expect(mdpInput).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getByText('8 caractères minimum')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submit avec credentials valides → appelle login() puis navigate("/dashboard")', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'admin@miznas.local');
    await user.type(
      screen.getByLabelText('Mot de passe'),
      'motdepassevalide',
    );
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'admin@miznas.local',
        'motdepassevalide',
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('submit avec 401 → bandeau inline persistant "Identifiants invalides" (pas toast)', async () => {
    mockLogin.mockRejectedValueOnce(
      buildAxiosError(401, {
        message: 'Bad credentials',
        errorCode: 'INVALID_CREDENTIALS',
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'admin@miznas.local');
    await user.type(
      screen.getByLabelText('Mot de passe'),
      'mauvaismotdepasse',
    );
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    const bandeau = await screen.findByTestId('login-error-bandeau');
    expect(bandeau.textContent).toContain('Identifiants invalides');
    expect(bandeau).toHaveAttribute('role', 'alert');
    // Toast volatile NON utilisé pour les erreurs auth critiques.
    expect(toast.error).not.toHaveBeenCalled();
    // Pas de navigate après échec.
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('submit avec erreur réseau (500) → toast.error volatile (pas de bandeau)', async () => {
    mockLogin.mockRejectedValueOnce(
      buildAxiosError(500, { message: 'Service indisponible' }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'admin@miznas.local');
    await user.type(
      screen.getByLabelText('Mot de passe'),
      'motdepassevalide',
    );
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Service indisponible');
    });
    expect(screen.queryByTestId('login-error-bandeau')).not.toBeInTheDocument();
  });

  it('isLoading=true → bouton disabled + libellé "Connexion..."', () => {
    mockIsLoading = true;
    renderPage();
    const btn = screen.getByRole('button', { name: /connexion/i });
    expect(btn).toBeDisabled();
    expect(btn.textContent).toBe('Connexion...');
  });

  it('utilisateur déjà authentifié → <Navigate to=/dashboard replace />', () => {
    mockIsAuth = true;
    renderPage();
    // <Navigate /> est déclaratif : la route /dashboard du MemoryRouter
    // est rendue dès le 1er render — pas d'effet imperatif.
    expect(screen.getByTestId('dashboard-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('miznas-wordmark')).not.toBeInTheDocument();
  });
});
