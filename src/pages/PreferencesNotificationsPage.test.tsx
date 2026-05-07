/**
 * Tests Vitest PreferencesNotificationsPage (Lot 4.3).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/notifications', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/notifications')>(
      '@/lib/api/notifications',
    );
  return {
    ...actual,
    lireMesPreferences: vi.fn(),
    mettreAJourMesPreferences: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  lireMesPreferences,
  mettreAJourMesPreferences,
} from '@/lib/api/notifications';
import { PreferencesNotificationsPage } from './PreferencesNotificationsPage';

const mockLire = lireMesPreferences as unknown as ReturnType<typeof vi.fn>;
const mockMaj = mettreAJourMesPreferences as unknown as ReturnType<
  typeof vi.fn
>;

describe('PreferencesNotificationsPage', () => {
  beforeEach(() => {
    mockLire.mockResolvedValue({
      notificationsEmailActives: true,
      notificationsEmailTypes: null, // tous types
    });
    mockMaj.mockImplementation(async (p) => p);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le toggle global et les 8 types cochés (NULL = tous)', async () => {
    render(<PreferencesNotificationsPage />);
    await waitFor(() => screen.getByTestId('toggle-global'));
    expect(screen.getByTestId('toggle-global')).toBeChecked();
    // 8 types
    expect(screen.getByTestId('type-BUDGET_SOUMIS')).toBeInTheDocument();
    expect(screen.getByTestId('type-AFFECTATION_CREEE')).toBeInTheDocument();
    // tous cochés (NULL)
    const inputs = [
      'BUDGET_SOUMIS',
      'BUDGET_VALIDE',
      'BUDGET_REJETE',
      'BUDGET_PUBLIE',
      'DELEGATION_CREEE',
      'DELEGATION_EXPIREE',
      'DELEGATION_REVOQUEE',
      'AFFECTATION_CREEE',
    ];
    for (const id of inputs) {
      expect(
        screen.getByTestId(`type-${id}`).querySelector('input'),
      ).toBeChecked();
    }
  });

  it('décocher le toggle global masque la liste des types', async () => {
    render(<PreferencesNotificationsPage />);
    await waitFor(() => screen.getByTestId('toggle-global'));
    fireEvent.click(screen.getByTestId('toggle-global'));
    expect(screen.getByTestId('toggle-global')).not.toBeChecked();
    // Liste masquée
    expect(screen.queryByTestId('type-BUDGET_SOUMIS')).not.toBeInTheDocument();
  });

  it('décocher 1 type matérialise la liste blanche (pas NULL)', async () => {
    render(<PreferencesNotificationsPage />);
    await waitFor(() => screen.getByTestId('toggle-global'));
    fireEvent.click(
      screen.getByTestId('type-BUDGET_REJETE').querySelector('input')!,
    );
    fireEvent.click(screen.getByTestId('btn-save-preferences'));
    await waitFor(() => expect(mockMaj).toHaveBeenCalled());
    const payload = mockMaj.mock.calls[0]![0];
    expect(payload.notificationsEmailActives).toBe(true);
    expect(payload.notificationsEmailTypes).not.toBeNull();
    expect(payload.notificationsEmailTypes).not.toContain('BUDGET_REJETE');
    expect(payload.notificationsEmailTypes.length).toBe(7);
  });

  it("recocher tous = retourne NULL côté API", async () => {
    // Démarre avec liste blanche partielle
    mockLire.mockResolvedValue({
      notificationsEmailActives: true,
      notificationsEmailTypes: [
        'BUDGET_SOUMIS',
        'BUDGET_VALIDE',
        'BUDGET_REJETE',
        'BUDGET_PUBLIE',
        'DELEGATION_CREEE',
        'DELEGATION_EXPIREE',
        'DELEGATION_REVOQUEE',
        // AFFECTATION_CREEE manquant
      ],
    });
    render(<PreferencesNotificationsPage />);
    await waitFor(() => screen.getByTestId('type-AFFECTATION_CREEE'));
    fireEvent.click(
      screen.getByTestId('type-AFFECTATION_CREEE').querySelector('input')!,
    );
    fireEvent.click(screen.getByTestId('btn-save-preferences'));
    await waitFor(() => expect(mockMaj).toHaveBeenCalled());
    const payload = mockMaj.mock.calls[0]![0];
    expect(payload.notificationsEmailTypes).toBeNull();
  });

  it("toggle global enregistre la préférence (notificationsEmailActives=false)", async () => {
    render(<PreferencesNotificationsPage />);
    await waitFor(() => screen.getByTestId('toggle-global'));
    fireEvent.click(screen.getByTestId('toggle-global'));
    fireEvent.click(screen.getByTestId('btn-save-preferences'));
    await waitFor(() => expect(mockMaj).toHaveBeenCalled());
    expect(mockMaj.mock.calls[0]![0].notificationsEmailActives).toBe(false);
  });
});
