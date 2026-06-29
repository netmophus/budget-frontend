import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PermissionResponse, RoleResponse } from '@/lib/api/types';

vi.mock('@/lib/api/roles', () => ({
  listRoles: vi.fn(),
  listPermissions: vi.fn(),
  ajouterPermissionRole: vi.fn(),
  retirerPermissionRole: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import {
  ajouterPermissionRole,
  listPermissions,
  listRoles,
} from '@/lib/api/roles';
import { RolesPermissionsPage } from './RolesPermissionsPage';

const mockListRoles = listRoles as unknown as ReturnType<typeof vi.fn>;
const mockListPermissions = listPermissions as unknown as ReturnType<
  typeof vi.fn
>;
const mockAjouter = ajouterPermissionRole as unknown as ReturnType<
  typeof vi.fn
>;

function perm(
  id: string,
  codePermission: string,
  module: string,
): PermissionResponse {
  return { id, codePermission, libelle: codePermission, module, description: null };
}

const PERMS: PermissionResponse[] = [
  perm('1', 'SYSTEM.ADMIN', 'SYSTEM'),
  perm('2', 'ROLE.GERER', 'ROLE'),
  perm('3', 'ROLE.LIRE', 'ROLE'),
  perm('4', 'USER.GERER', 'USER'),
  perm('5', 'USER.LIRE', 'USER'),
  perm('6', 'BUDGET.LIRE', 'BUDGET'),
  perm('7', 'BUDGET.SAISIR', 'BUDGET'),
  perm('8', 'AUDIT.LIRE', 'AUDIT'),
];

const permById = new Map(PERMS.map((p) => [p.id, p]));
function role(
  id: string,
  codeRole: string,
  permIds: string[],
): RoleResponse {
  return {
    id,
    codeRole,
    libelle: codeRole,
    description: null,
    estActif: true,
    permissions: permIds.map((pid) => permById.get(pid)!),
  };
}

const ROLES: RoleResponse[] = [
  role('10', 'ADMIN', ['1', '2', '3', '4', '5', '6', '7', '8']),
  role('11', 'PUBLICATEUR', []),
  role('12', 'VALIDATEUR', []),
  role('13', 'COORDINATEUR', []),
  role('14', 'SAISISSEUR', ['7']),
  role('15', 'AUDITEUR', ['8']),
  role('16', 'LECTEUR', ['3', '5', '6']),
];

function renderPage() {
  mockListRoles.mockResolvedValue(ROLES);
  mockListPermissions.mockResolvedValue(PERMS);
  return render(<RolesPermissionsPage />);
}

describe('RolesPermissionsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('rend la matrice : 7 colonnes de rôles + groupes par module', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    for (const code of [
      'ADMIN',
      'PUBLICATEUR',
      'VALIDATEUR',
      'COORDINATEUR',
      'SAISISSEUR',
      'AUDITEUR',
      'LECTEUR',
    ]) {
      expect(screen.getByTestId(`col-${code}`)).toBeInTheDocument();
    }
    // 4 modules présents (SYSTEM, ROLE, USER, BUDGET, AUDIT).
    expect(screen.getByTestId('module-group-BUDGET')).toBeInTheDocument();
    expect(screen.getByTestId('module-group-AUDIT')).toBeInTheDocument();
  });

  it('permission verrouillée sur ADMIN : cadenas, pas de case à cocher', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    // SYSTEM.ADMIN sur ADMIN → cadenas, pas de checkbox.
    expect(
      screen.getByTestId('lock-ADMIN-SYSTEM.ADMIN'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('cell-ADMIN-SYSTEM.ADMIN'),
    ).not.toBeInTheDocument();
    // La même permission sur un rôle non-ADMIN reste éditable.
    expect(
      screen.getByTestId('cell-SAISISSEUR-SYSTEM.ADMIN'),
    ).toBeInTheDocument();
  });

  it('Enregistrer désactivé tant qu’aucun changement', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    expect(screen.getByTestId('btn-enregistrer')).toBeDisabled();
    expect(screen.getByTestId('btn-annuler')).toBeDisabled();
  });

  it('cocher une case passe l’état en dirty (Enregistrer activé)', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    const cell = screen.getByTestId(
      'cell-SAISISSEUR-BUDGET.LIRE',
    ) as HTMLInputElement;
    expect(cell.checked).toBe(false);
    fireEvent.click(cell);
    expect(cell.checked).toBe(true);
    expect(screen.getByTestId('btn-enregistrer')).toBeEnabled();
    expect(screen.getByTestId('btn-annuler')).toBeEnabled();
  });

  it('Annuler restaure l’état initial', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    const cell = screen.getByTestId(
      'cell-SAISISSEUR-BUDGET.LIRE',
    ) as HTMLInputElement;
    fireEvent.click(cell);
    expect(cell.checked).toBe(true);
    fireEvent.click(screen.getByTestId('btn-annuler'));
    expect(
      (screen.getByTestId('cell-SAISISSEUR-BUDGET.LIRE') as HTMLInputElement)
        .checked,
    ).toBe(false);
    expect(screen.getByTestId('btn-enregistrer')).toBeDisabled();
  });

  it('filtre module : ne montre que le module choisi', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    fireEvent.click(screen.getByTestId('filter-module'));
    fireEvent.click(await screen.findByRole('option', { name: 'BUDGET' }));
    await waitFor(() =>
      expect(screen.getByTestId('module-group-BUDGET')).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId('module-group-AUDIT'),
    ).not.toBeInTheDocument();
  });

  it('recherche permission (debounce) filtre les lignes', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    fireEvent.change(screen.getByTestId('search-permission'), {
      target: { value: 'AUDIT' },
    });
    // Attend l'application du debounce (300ms) : BUDGET disparaît.
    await waitFor(() =>
      expect(
        screen.queryByTestId('module-group-BUDGET'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('module-group-AUDIT')).toBeInTheDocument();
  });

  it('confirmation avant sauvegarde : compteurs + appel API + toast', async () => {
    renderPage();
    await screen.findByTestId('roles-permissions-table');
    fireEvent.click(screen.getByTestId('cell-SAISISSEUR-BUDGET.LIRE'));

    fireEvent.click(screen.getByTestId('btn-enregistrer'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByTestId('confirm-count-add')).toHaveTextContent(
      '1',
    );
    expect(
      within(dialog).getByTestId('confirm-count-remove'),
    ).toHaveTextContent('0');

    mockAjouter.mockResolvedValue({
      roleId: '14',
      codeRole: 'SAISISSEUR',
      fkPermission: '6',
      codePermission: 'BUDGET.LIRE',
      deja: false,
    });
    fireEvent.click(within(dialog).getByTestId('btn-confirmer'));

    await waitFor(() =>
      expect(mockAjouter).toHaveBeenCalledWith('14', '6'),
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });
});
