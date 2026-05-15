/**
 * Tests Vitest MesDelegationsPage (Lot 4.2.C).
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/delegations', () => ({
  listerDelegationsRecues: vi.fn(),
  listerDelegationsEmises: vi.fn(),
  PERMISSION_DELEGABLE_LABELS: {
    SAISIE: 'Saisie',
    SOUMISSION: 'Soumission',
    VALIDATION: 'Validation',
    PUBLICATION: 'Publication',
  },
  // Lot 6.7.2 — tooltips descriptifs.
  PERMISSION_DELEGABLE_DESCRIPTIONS: {
    SAISIE: 'desc-saisie',
    SOUMISSION: 'desc-soumission',
    VALIDATION: 'desc-validation',
    PUBLICATION: 'desc-publication',
  },
  STATUT_LABELS: {
    ACTIVE: 'Active',
    REVOQUEE: 'Révoquée',
    EXPIREE: 'Expirée',
  },
}));

vi.mock('@/components/admin/CreerDelegationDialog', () => ({
  CreerDelegationDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="creer-dialog-stub">creer</div> : null,
}));

vi.mock('@/components/admin/RevoquerDelegationDialog', () => ({
  RevoquerDelegationDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="revoq-dialog-stub">revoq</div> : null,
}));

vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: '10' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type Delegation,
  listerDelegationsEmises,
  listerDelegationsRecues,
} from '@/lib/api/delegations';
import { MesDelegationsPage } from './MesDelegationsPage';

const mockRecues = listerDelegationsRecues as unknown as ReturnType<typeof vi.fn>;
const mockEmises = listerDelegationsEmises as unknown as ReturnType<typeof vi.fn>;

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

describe('MesDelegationsPage', () => {
  beforeEach(() => {
    mockRecues.mockResolvedValue([
      makeDelegation({ id: '5', fkDelegataire: '10', fkDelegant: '99' }),
    ]);
    mockEmises.mockResolvedValue([
      makeDelegation({ id: '6', fkDelegant: '10' }),
      makeDelegation({ id: '7', fkDelegant: '10', statut: 'EXPIREE', actif: false }),
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche les onglets avec compteurs reçues + émises', async () => {
    render(<MesDelegationsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tab-recues')).toHaveTextContent('Reçues (1)');
    });
    expect(screen.getByTestId('tab-emises')).toHaveTextContent('Émises (2)');
  });

  it("démarre sur l'onglet Reçues et affiche la délégation reçue", async () => {
    render(<MesDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delegation-5')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('delegation-6')).not.toBeInTheDocument();
  });

  it("bascule sur l'onglet Émises et affiche les deux délégations émises", async () => {
    render(<MesDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('delegation-5')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-emises'));
    await waitFor(() =>
      expect(screen.getByTestId('delegation-6')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('delegation-7')).toBeInTheDocument();
  });

  it("n'affiche le bouton Révoquer QUE pour les délégations émises actives par le délégant courant", async () => {
    render(<MesDelegationsPage />);
    await waitFor(() => screen.getByTestId('delegation-5'));
    fireEvent.click(screen.getByTestId('tab-emises'));
    await waitFor(() => screen.getByTestId('delegation-6'));
    // Active émise par moi → bouton présent
    expect(screen.getByTestId('btn-revoquer-6')).toBeInTheDocument();
    // Expirée → pas de bouton
    expect(screen.queryByTestId('btn-revoquer-7')).not.toBeInTheDocument();
  });

  it('clic sur Nouvelle délégation ouvre la stub CreerDelegationDialog', async () => {
    render(<MesDelegationsPage />);
    await waitFor(() => screen.getByTestId('delegation-5'));
    expect(screen.queryByTestId('creer-dialog-stub')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-nouvelle-delegation'));
    expect(screen.getByTestId('creer-dialog-stub')).toBeInTheDocument();
  });

  it('clic sur btn-revoquer-X ouvre la stub RevoquerDelegationDialog', async () => {
    render(<MesDelegationsPage />);
    await waitFor(() => screen.getByTestId('delegation-5'));
    fireEvent.click(screen.getByTestId('tab-emises'));
    await waitFor(() => screen.getByTestId('btn-revoquer-6'));
    fireEvent.click(screen.getByTestId('btn-revoquer-6'));
    expect(screen.getByTestId('revoq-dialog-stub')).toBeInTheDocument();
  });

  it('affiche un état vide quand aucune délégation reçue', async () => {
    mockRecues.mockResolvedValue([]);
    mockEmises.mockResolvedValue([]);
    render(<MesDelegationsPage />);
    await waitFor(() => screen.getByTestId('empty-state'));
    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'Aucune délégation reçue.',
    );
  });

  // ─── Lot 7.3 V9 — KPI cards + état vide modernisé ───────────────

  it('V9 : rend les 3 KPI cards (Reçues actives / Émises actives / Historique)', async () => {
    render(<MesDelegationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('kpi-recues-actives')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('kpi-emises-actives')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-historique')).toBeInTheDocument();
    // Reçues actives = 1 (la délégation id=5 active reçue)
    expect(screen.getByTestId('kpi-recues-actives')).toHaveTextContent('1');
  });

  it('V9 : état vide affiche une icône Inbox + message contextuel selon onglet', async () => {
    mockRecues.mockResolvedValue([]);
    mockEmises.mockResolvedValue([]);
    render(<MesDelegationsPage />);
    const empty = await waitFor(() => screen.getByTestId('empty-state'));
    // Icône Inbox (SVG Lucide) rendue dans l'état vide
    expect(empty.querySelector('svg')).not.toBeNull();
    // Onglet par défaut = reçues
    expect(empty).toHaveTextContent('Aucune délégation reçue.');
    // Bascule sur émises → message change
    fireEvent.click(screen.getByTestId('tab-emises'));
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        'Aucune délégation émise.',
      ),
    );
  });

  // ─── Lot 6.7.2 — tooltips descriptifs sur permissions (Z1) ──────

  it('Z1 : trigger tooltip présent sur permission délégation reçue', async () => {
    render(<MesDelegationsPage />);
    await waitFor(() => screen.getByTestId('delegation-5'));
    // Onglet "reçues" par défaut, délégation id=5 avec permissions=['VALIDATION']
    expect(screen.getByTestId('perm-5-VALIDATION')).toBeInTheDocument();
    expect(screen.getByTestId('perm-5-VALIDATION')).toHaveTextContent(
      'Validation',
    );
  });
});
