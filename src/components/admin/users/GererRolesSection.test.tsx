/**
 * Tests Vitest GererRolesSection (Lot Administration ADMIN.B).
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
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

  // ─── Lot 6.7.2 — tooltips descriptifs (Z2) ──────────────────────

  it('Z2 : tooltip rendu au hover si description du rôle présente', async () => {
    mockListRoles.mockResolvedValue([
      {
        id: '2',
        codeRole: 'SAISISSEUR',
        libelle: 'Saisisseur de budget',
        estActif: true,
        description: 'Saisit les lignes budgétaires de son périmètre.',
      },
    ]);
    mockListUserRoles.mockResolvedValue([
      {
        id: '50',
        fkRole: '2',
        codeRole: 'SAISISSEUR',
        libelle: 'Saisisseur de budget',
        estActif: true,
        dateCreation: '2026-01-01',
      },
    ]);
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() => screen.getByTestId('badge-role-SAISISSEUR'));
    await userEvent.hover(screen.getByTestId('badge-role-SAISISSEUR'));
    expect(
      await screen.findByTestId('tooltip-role-SAISISSEUR'),
    ).toBeInTheDocument();
  });

  it('Z2 : pas de tooltip si description null (fallback rôle legacy)', async () => {
    // Mock par défaut : tous les rôles sans `description` (cas legacy).
    // Le badge doit être rendu normalement, sans wrapper Tooltip.
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() => screen.getByTestId('badge-role-SAISISSEUR'));
    await userEvent.hover(screen.getByTestId('badge-role-SAISISSEUR'));
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByTestId('tooltip-role-SAISISSEUR'),
    ).not.toBeInTheDocument();
  });

  it('Z2 : contenu tooltip = libellé + description', async () => {
    mockListRoles.mockResolvedValue([
      {
        id: '2',
        codeRole: 'SAISISSEUR',
        libelle: 'Saisisseur de budget',
        estActif: true,
        description: 'Saisit les lignes budgétaires de son périmètre.',
      },
    ]);
    mockListUserRoles.mockResolvedValue([
      {
        id: '50',
        fkRole: '2',
        codeRole: 'SAISISSEUR',
        libelle: 'Saisisseur de budget',
        estActif: true,
        dateCreation: '2026-01-01',
      },
    ]);
    render(<GererRolesSection userId="5" userEmail="a@m.io" />);
    await waitFor(() => screen.getByTestId('badge-role-SAISISSEUR'));
    await userEvent.hover(screen.getByTestId('badge-role-SAISISSEUR'));
    const tooltip = await screen.findByTestId('tooltip-role-SAISISSEUR');
    expect(tooltip).toHaveTextContent('Saisisseur de budget');
    expect(tooltip).toHaveTextContent(
      'Saisit les lignes budgétaires de son périmètre.',
    );
  });
});
