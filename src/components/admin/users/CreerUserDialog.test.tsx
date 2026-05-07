/**
 * Tests Vitest CreerUserDialog (Lot Administration ADMIN.A).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/roles', () => ({ listRoles: vi.fn() }));
vi.mock('@/lib/api/users', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/users')>('@/lib/api/users');
  return { ...actual, creerUser: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { listRoles } from '@/lib/api/roles';
import { creerUser } from '@/lib/api/users';
import { CreerUserDialog } from './CreerUserDialog';

const mockListRoles = listRoles as unknown as ReturnType<typeof vi.fn>;
const mockCreerUser = creerUser as unknown as ReturnType<typeof vi.fn>;

describe('CreerUserDialog', () => {
  beforeEach(() => {
    mockListRoles.mockResolvedValue([
      { id: '1', codeRole: 'ADMIN', libelle: 'Admin', estActif: true },
      { id: '2', codeRole: 'SAISISSEUR', libelle: 'Saisisseur', estActif: true },
      { id: '3', codeRole: 'VALIDATEUR', libelle: 'Validateur', estActif: true },
    ]);
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  function renderDialog() {
    render(
      <CreerUserDialog
        isOpen={true}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
  }

  it('le bouton Créer est désactivé tant que les champs ne sont pas valides', async () => {
    renderDialog();
    await waitFor(() => screen.getByTestId('cu-role-ADMIN'));
    expect(screen.getByTestId('btn-creer-user')).toBeDisabled();
  });

  it('email invalide → bouton reste désactivé', async () => {
    renderDialog();
    await waitFor(() => screen.getByTestId('cu-role-ADMIN'));
    fireEvent.change(screen.getByTestId('cu-email'), { target: { value: 'pas-un-email' } });
    fireEvent.change(screen.getByTestId('cu-prenom'), { target: { value: 'Aïcha' } });
    fireEvent.change(screen.getByTestId('cu-nom'), { target: { value: 'Diallo' } });
    fireEvent.change(screen.getByTestId('cu-mdp'), { target: { value: 'PassWord!2026' } });
    fireEvent.click(screen.getByTestId('cu-role-VALIDATEUR'));
    expect(screen.getByTestId('btn-creer-user')).toBeDisabled();
  });

  it('mot de passe < 12 chars → bouton reste désactivé', async () => {
    renderDialog();
    await waitFor(() => screen.getByTestId('cu-role-ADMIN'));
    fireEvent.change(screen.getByTestId('cu-email'), { target: { value: 'a@m.io' } });
    fireEvent.change(screen.getByTestId('cu-prenom'), { target: { value: 'A' } });
    fireEvent.change(screen.getByTestId('cu-nom'), { target: { value: 'B' } });
    fireEvent.change(screen.getByTestId('cu-mdp'), { target: { value: 'court' } });
    fireEvent.click(screen.getByTestId('cu-role-ADMIN'));
    expect(screen.getByTestId('btn-creer-user')).toBeDisabled();
  });

  it('aucun rôle sélectionné → bouton désactivé', async () => {
    renderDialog();
    await waitFor(() => screen.getByTestId('cu-role-ADMIN'));
    fireEvent.change(screen.getByTestId('cu-email'), { target: { value: 'a@m.io' } });
    fireEvent.change(screen.getByTestId('cu-prenom'), { target: { value: 'Aïcha' } });
    fireEvent.change(screen.getByTestId('cu-nom'), { target: { value: 'Diallo' } });
    fireEvent.change(screen.getByTestId('cu-mdp'), { target: { value: 'PassWord!2026' } });
    expect(screen.getByTestId('btn-creer-user')).toBeDisabled();
  });

  it('champs valides + ≥ 1 rôle → submit appelle creerUser avec le bon payload', async () => {
    mockCreerUser.mockResolvedValue({ id: '99' });
    renderDialog();
    await waitFor(() => screen.getByTestId('cu-role-ADMIN'));
    fireEvent.change(screen.getByTestId('cu-email'), {
      target: { value: 'test@m.io' },
    });
    fireEvent.change(screen.getByTestId('cu-prenom'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByTestId('cu-nom'), { target: { value: 'Demo' } });
    fireEvent.change(screen.getByTestId('cu-mdp'), {
      target: { value: 'PassWord!2026' },
    });
    fireEvent.click(screen.getByTestId('cu-role-SAISISSEUR'));
    fireEvent.click(screen.getByTestId('cu-role-VALIDATEUR'));
    expect(screen.getByTestId('btn-creer-user')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('btn-creer-user'));
    await waitFor(() => expect(mockCreerUser).toHaveBeenCalled());
    expect(mockCreerUser).toHaveBeenCalledWith({
      email: 'test@m.io',
      prenom: 'Test',
      nom: 'Demo',
      motDePasseInitial: 'PassWord!2026',
      fkRoles: ['2', '3'], // cumul SAISISSEUR + VALIDATEUR
    });
  });
});
