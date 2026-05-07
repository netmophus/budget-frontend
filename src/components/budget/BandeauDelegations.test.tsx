/**
 * Tests Vitest BandeauDelegations (Lot 4.2-fix.B).
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/delegations', () => ({
  listerDelegationsRecues: vi.fn(),
}));

import {
  type Delegation,
  listerDelegationsRecues,
} from '@/lib/api/delegations';
import { BandeauDelegations } from './BandeauDelegations';

const mockListe = listerDelegationsRecues as unknown as ReturnType<typeof vi.fn>;

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

function renderWithRouter(): void {
  render(
    <MemoryRouter>
      <BandeauDelegations />
    </MemoryRouter>,
  );
}

describe('BandeauDelegations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('affiche le bandeau avec le compte et le lien quand délégations actives', async () => {
    mockListe.mockResolvedValue([
      makeDelegation({ id: '1', permissions: ['VALIDATION'] }),
      makeDelegation({ id: '2', permissions: ['SAISIE', 'VALIDATION'] }),
    ]);
    renderWithRouter();
    await waitFor(() =>
      expect(screen.getByTestId('bandeau-delegations')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('bandeau-delegations-count')).toHaveTextContent('2');
    expect(screen.getByText(/2 permission\(s\) distincte\(s\)/)).toBeInTheDocument();
    expect(screen.getByTestId('bandeau-delegations-lien')).toHaveAttribute(
      'href',
      '/mes-delegations',
    );
  });

  it("n'affiche RIEN quand aucune délégation active reçue", async () => {
    mockListe.mockResolvedValue([]);
    renderWithRouter();
    // On attend que le hook se résolve (loading → false) puis on
    // vérifie l'absence du bandeau.
    await waitFor(() => expect(mockListe).toHaveBeenCalled());
    // Petite attente pour le cycle setState
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId('bandeau-delegations')).not.toBeInTheDocument();
  });

  it('appelle listerDelegationsRecues avec actif=true et dateRef=today', async () => {
    mockListe.mockResolvedValue([]);
    renderWithRouter();
    await waitFor(() => expect(mockListe).toHaveBeenCalled());
    const today = new Date().toISOString().slice(0, 10);
    expect(mockListe).toHaveBeenCalledWith({ actif: true, dateRef: today });
  });

  it("masque le bandeau silencieusement si l'API échoue", async () => {
    mockListe.mockRejectedValue(new Error('500'));
    renderWithRouter();
    await waitFor(() => expect(mockListe).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId('bandeau-delegations')).not.toBeInTheDocument();
  });
});
