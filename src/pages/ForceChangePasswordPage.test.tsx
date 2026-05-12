/**
 * Tests Vitest ForceChangePasswordPage (Lot 6.4.C.2).
 *
 * Couvre :
 *  - rendu initial avec les 3 champs et bouton submit ;
 *  - validation policy mdp côté zod (min 12, complexité) ;
 *  - branche "doitChangerMdp" → message "temporaire" ;
 *  - branche "mdpExpire" → message "expiré" ;
 *  - submit succès : appelle changerMdp et redirige vers /dashboard ;
 *  - submit erreur : toast.error sans crash ni redirection ;
 *  - garde anti-arrivée intempestive : redirige /dashboard si flags vides.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/auth-store';
import { ForceChangePasswordPage } from './ForceChangePasswordPage';

function setStore(partial: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(partial);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ForceChangePasswordPage />
    </MemoryRouter>,
  );
}

describe('ForceChangePasswordPage', () => {
  beforeEach(() => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: true,
      mdpExpireProchainement: false,
      user: { id: '1', email: 'foo@bar.io', nom: 'X', prenom: 'Y' },
      changerMdp: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('rend les 3 champs et le bouton submit', () => {
    renderPage();
    expect(screen.getByTestId('page-change-mdp')).toBeInTheDocument();
    expect(screen.getByTestId('cm-ancien')).toBeInTheDocument();
    expect(screen.getByTestId('cm-nouveau')).toBeInTheDocument();
    expect(screen.getByTestId('cm-confirmation')).toBeInTheDocument();
    expect(screen.getByTestId('cm-submit')).toBeInTheDocument();
  });

  it('affiche le motif "temporaire" quand doitChangerMdp est posé', () => {
    setStore({ doitChangerMdp: true, mdpExpire: false });
    renderPage();
    expect(screen.getByTestId('page-change-mdp')).toHaveTextContent(
      /temporaire/i,
    );
  });

  it('affiche le motif "expiré" quand mdpExpire est posé', () => {
    setStore({ doitChangerMdp: false, mdpExpire: true });
    renderPage();
    expect(screen.getByTestId('page-change-mdp')).toHaveTextContent(/expiré/i);
  });

  it('valide la policy : refuse mdp < 12 caractères', async () => {
    const changerMdp = vi.fn();
    setStore({ changerMdp });
    renderPage();
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: 'OldPass!2025' },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: 'Short!1' },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: 'Short!1' },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(screen.getByText(/Au moins 12 caractères/i)).toBeInTheDocument(),
    );
    expect(changerMdp).not.toHaveBeenCalled();
  });

  it('valide la policy : refuse mdp sans caractère spécial', async () => {
    const changerMdp = vi.fn();
    setStore({ changerMdp });
    renderPage();
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: 'OldPass!2025' },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: 'NoSpecialChar9' },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: 'NoSpecialChar9' },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/Au moins 1 caractère spécial/i),
      ).toBeInTheDocument(),
    );
    expect(changerMdp).not.toHaveBeenCalled();
  });

  it('refuse confirmation différente du nouveau mdp', async () => {
    const changerMdp = vi.fn();
    setStore({ changerMdp });
    renderPage();
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: 'OldPass!2025' },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: 'NewPass!9999' },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/La confirmation ne correspond pas/i),
      ).toBeInTheDocument(),
    );
    expect(changerMdp).not.toHaveBeenCalled();
  });

  it('refuse nouveau mdp identique à l\'ancien', async () => {
    const changerMdp = vi.fn();
    setStore({ changerMdp });
    renderPage();
    const same = 'SamePass!2026';
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: same },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: same },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: same },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(
        screen.getByText(/différent de l'ancien/i),
      ).toBeInTheDocument(),
    );
    expect(changerMdp).not.toHaveBeenCalled();
  });

  it('submit succès : appelle changerMdp puis navigate /dashboard', async () => {
    const changerMdp = vi.fn().mockResolvedValue(undefined);
    setStore({ changerMdp });
    renderPage();
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: 'OldPass!2025' },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(changerMdp).toHaveBeenCalledWith('OldPass!2025', 'NewPass!2026'),
    );
    expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié.');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it("submit erreur API : affiche toast.error sans rediriger", async () => {
    const axiosErr = new AxiosError('boom');
    axiosErr.response = {
      data: { message: 'Ancien mdp invalide', statusCode: 401 },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
    };
    const changerMdp = vi.fn().mockRejectedValue(axiosErr);
    setStore({ changerMdp });
    renderPage();
    fireEvent.input(screen.getByTestId('cm-ancien'), {
      target: { value: 'OldPass!2025' },
    });
    fireEvent.input(screen.getByTestId('cm-nouveau'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.input(screen.getByTestId('cm-confirmation'), {
      target: { value: 'NewPass!2026' },
    });
    fireEvent.click(screen.getByTestId('cm-submit'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Ancien mdp invalide'),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rend rien (<Navigate> vers /dashboard) si arrivée intempestive (aucun flag)', () => {
    // Lot 6.4.C.2 — la garde anti-arrivée intempestive utilise
    // `<Navigate to="/dashboard" replace />` (pattern déclaratif
    // React Router) au lieu de `navigate('/dashboard')` impératif.
    // Le composant <Navigate> consomme directement le contexte
    // router, sans passer par useNavigate() — donc `mockNavigate`
    // n'est plus invoqué. On asserte sur le DOM rendu : le
    // formulaire n'est PAS monté.
    setStore({
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: false,
    });
    renderPage();
    expect(screen.queryByTestId('page-change-mdp')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cm-submit')).not.toBeInTheDocument();
  });

  // ─── Lot 6.7.1 — extension cas J-7 (mdpExpireProchainement) ──────

  it('accès autorisé si mdpExpireProchainement=true (cas J-7 pur)', () => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: true,
    });
    renderPage();
    expect(screen.getByTestId('page-change-mdp')).toBeInTheDocument();
    expect(screen.getByTestId('cm-submit')).toBeInTheDocument();
  });

  it('affiche le motif "expire dans moins de 7 jours" en cas J-7 pur', () => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: true,
    });
    renderPage();
    expect(screen.getByTestId('page-change-mdp')).toHaveTextContent(
      /expire dans moins de 7 jours/i,
    );
  });

  it('bouton "Plus tard" VISIBLE en cas J-7 pur', () => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: true,
    });
    renderPage();
    expect(screen.getByTestId('cm-plus-tard')).toBeInTheDocument();
  });

  it('bouton "Plus tard" CACHÉ si mdpExpire=true (sécurité : pas de contournement)', () => {
    setStore({
      mdpExpire: true,
      doitChangerMdp: false,
      mdpExpireProchainement: false,
    });
    renderPage();
    expect(screen.queryByTestId('cm-plus-tard')).not.toBeInTheDocument();
  });

  it('bouton "Plus tard" CACHÉ si doitChangerMdp=true (sécurité : pas de contournement)', () => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: true,
      mdpExpireProchainement: false,
    });
    renderPage();
    expect(screen.queryByTestId('cm-plus-tard')).not.toBeInTheDocument();
  });

  it('clic sur "Plus tard" → navigate vers /dashboard', () => {
    setStore({
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: true,
    });
    renderPage();
    fireEvent.click(screen.getByTestId('cm-plus-tard'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
