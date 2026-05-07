/**
 * Tests Vitest AdminDelegationsPage (Lot 4.2.C).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/delegations', () => ({
  listerToutesDelegations: vi.fn(),
  PERMISSION_DELEGABLE_LABELS: {
    SAISIE: 'Saisie',
    SOUMISSION: 'Soumission',
    VALIDATION: 'Validation',
    PUBLICATION: 'Publication',
  },
  STATUT_LABELS: {
    ACTIVE: 'Active',
    REVOQUEE: 'Révoquée',
    EXPIREE: 'Expirée',
  },
}));

vi.mock('@/components/admin/RevoquerDelegationDialog', () => ({
  RevoquerDelegationDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="revoq-dialog-stub">revoq</div> : null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type Delegation,
  listerToutesDelegations,
} from '@/lib/api/delegations';
import { AdminDelegationsPage } from './AdminDelegationsPage';

const mockToutes = listerToutesDelegations as unknown as ReturnType<typeof vi.fn>;

function makeDelegation(over: Partial<Delegation> = {}): Delegation {
  return {
    id: '1',
    fkDelegant: '10',
    fkDelegataire: '11',
    delegantEmail: 'd@m.io',
    delegataireEmail: 'r@m.io',
    perimetreUserPerimetreIds: ['1'],
    permissions: ['VALIDATION'],
    motif: 'Mission',
    dateDebut: '2027-01-01',
    dateFin: '2027-01-31',
    actif: true,
    revoqueeLe: null,
    fkRevoquePar: null,
    motifRevocation: null,
    statut: 'ACTIVE',
    ...over,
  };
}

describe('AdminDelegationsPage', () => {
  beforeEach(() => {
    mockToutes.mockResolvedValue([
      makeDelegation({ id: '1', statut: 'ACTIVE' }),
      makeDelegation({ id: '2', statut: 'EXPIREE', actif: false }),
      makeDelegation({ id: '3', statut: 'REVOQUEE', actif: false }),
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche toutes les délégations avec compteur', async () => {
    render(<AdminDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-delegation-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('admin-delegation-2')).toBeInTheDocument();
    expect(screen.getByTestId('admin-delegation-3')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('3 délégation(s)');
  });

  it("n'affiche le bouton de révocation admin QUE pour les délégations actives", async () => {
    render(<AdminDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-delegation-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('btn-admin-revoquer-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('btn-admin-revoquer-2'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('btn-admin-revoquer-3'),
    ).not.toBeInTheDocument();
  });

  it("appel initial sans filtre statut (TOUS) puis change en ACTIVE", async () => {
    render(<AdminDelegationsPage />);
    await waitFor(() => expect(mockToutes).toHaveBeenCalled());
    expect(mockToutes).toHaveBeenLastCalledWith({
      statut: undefined,
      limit: 200,
    });
  });

  it('clic sur Révoquer ouvre la stub du dialogue', async () => {
    render(<AdminDelegationsPage />);
    await waitFor(() => screen.getByTestId('btn-admin-revoquer-1'));
    fireEvent.click(screen.getByTestId('btn-admin-revoquer-1'));
    expect(screen.getByTestId('revoq-dialog-stub')).toBeInTheDocument();
  });

  it('affiche un état vide quand aucune délégation', async () => {
    mockToutes.mockResolvedValue([]);
    render(<AdminDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument(),
    );
  });
});
