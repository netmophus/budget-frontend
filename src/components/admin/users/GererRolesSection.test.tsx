/**
 * Tests Vitest GererRolesSection (Lot Administration ADMIN.B).
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
  return {
    ...actual,
    listerRolesUser: vi.fn(),
    attribuerRoleUser: vi.fn(),
    retirerRoleUser: vi.fn(),
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { listRoles } from '@/lib/api/roles';
import { listerRolesUser, retirerRoleUser } from '@/lib/api/users';
import { GererRolesSection } from './GererRolesSection';

const mockListRoles = listRoles as unknown as ReturnType<typeof vi.fn>;
const mockListUserRoles = listerRolesUser as unknown as ReturnType<typeof vi.fn>;
const mockRetirer = retirerRoleUser as unknown as ReturnType<typeof vi.fn>;

describe('GererRolesSection', () => {
  beforeEach(() => {
    mockListRoles.mockResolvedValue([
      { id: '1', codeRole: 'ADMIN', libelle: 'Admin', estActif: true },
      { id: '2', codeRole: 'SAISISSEUR', libelle: 'Saisisseur', estActif: true },
      { id: '3', codeRole: 'VALIDATEUR', libelle: 'Validateur', estActif: true },
    ]);
    mockListUserRoles.mockResolvedValue([
      {
        id: '50',
        fkRole: '2',
        codeRole: 'SAISISSEUR',
        libelle: 'Saisisseur',
        estActif: true,
        dateCreation: '2026-01-01',
      },
    ]);
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche les rôles actifs en badges', async () => {
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() =>
      expect(screen.getByTestId('badge-role-SAISISSEUR')).toBeInTheDocument(),
    );
  });

  it('le dropdown ajout exclut les rôles déjà attribués (cumul UI)', async () => {
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() => screen.getByTestId('badge-role-SAISISSEUR'));
    // Le select-role-ajout ne doit pas proposer SAISISSEUR (déjà attribué).
    expect(screen.getByTestId('select-role-ajout')).toBeInTheDocument();
    // Le bouton Ajouter est désactivé tant qu'aucune sélection.
    expect(screen.getByTestId('btn-ajouter-role')).toBeDisabled();
  });

  it('clic sur X retire le rôle après confirmation', async () => {
    mockRetirer.mockResolvedValue({ retire: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() => screen.getByTestId('btn-retirer-SAISISSEUR'));
    fireEvent.click(screen.getByTestId('btn-retirer-SAISISSEUR'));
    await waitFor(() => expect(mockRetirer).toHaveBeenCalledWith('5', '2'));
    confirmSpy.mockRestore();
  });
});
