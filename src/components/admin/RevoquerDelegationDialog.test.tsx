/**
 * Tests Vitest RevoquerDelegationDialog (Lot 4.2.C).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/delegations', () => ({
  revoquerDelegation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { revoquerDelegation, type Delegation } from '@/lib/api/delegations';
import { RevoquerDelegationDialog } from './RevoquerDelegationDialog';

const mockRevoq = revoquerDelegation as unknown as ReturnType<typeof vi.fn>;

function makeDelegation(over: Partial<Delegation> = {}): Delegation {
  return {
    id: '42',
    fkDelegant: '10',
    fkDelegataire: '11',
    delegantEmail: 'delegant@miznas.local',
    delegataireEmail: 'delegataire@miznas.local',
    perimetreUserPerimetreIds: ['1', '2'],
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

describe('RevoquerDelegationDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche les infos de la délégation cible', () => {
    render(
      <RevoquerDelegationDialog
        isOpen={true}
        onClose={() => {}}
        delegation={makeDelegation()}
        onRevoked={() => {}}
      />,
    );
    expect(screen.getByTestId('revoq-delegataire')).toHaveTextContent(
      'delegataire@miznas.local',
    );
    expect(screen.getByText(/2027-01-01 → 2027-01-31/)).toBeInTheDocument();
  });

  it('le bouton confirmer est désactivé tant que motif < 3 caractères', () => {
    render(
      <RevoquerDelegationDialog
        isOpen={true}
        onClose={() => {}}
        delegation={makeDelegation()}
        onRevoked={() => {}}
      />,
    );
    const btn = screen.getByTestId('btn-confirmer-revocation');
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByTestId('motif-revocation'), {
      target: { value: 'ab' },
    });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByTestId('motif-revocation'), {
      target: { value: 'Retour anticipé' },
    });
    expect(btn).not.toBeDisabled();
  });

  it('appelle revoquerDelegation puis onRevoked + onClose au succès', async () => {
    mockRevoq.mockResolvedValue({});
    const onRevoked = vi.fn();
    const onClose = vi.fn();
    render(
      <RevoquerDelegationDialog
        isOpen={true}
        onClose={onClose}
        delegation={makeDelegation()}
        onRevoked={onRevoked}
      />,
    );
    fireEvent.change(screen.getByTestId('motif-revocation'), {
      target: { value: 'Retour de mission anticipé' },
    });
    fireEvent.click(screen.getByTestId('btn-confirmer-revocation'));
    await waitFor(() => expect(mockRevoq).toHaveBeenCalledTimes(1));
    expect(mockRevoq).toHaveBeenCalledWith('42', {
      motif: 'Retour de mission anticipé',
    });
    expect(onRevoked).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
