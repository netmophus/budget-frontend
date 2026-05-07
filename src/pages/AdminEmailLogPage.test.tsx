/**
 * Tests Vitest AdminEmailLogPage (Lot 4.3).
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
    listerEmailLog: vi.fn(),
    rejouerEmail: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type EmailLog,
  listerEmailLog,
  rejouerEmail,
} from '@/lib/api/notifications';
import { AdminEmailLogPage } from './AdminEmailLogPage';

const mockLister = listerEmailLog as unknown as ReturnType<typeof vi.fn>;
const mockRejouer = rejouerEmail as unknown as ReturnType<typeof vi.fn>;

function makeLog(over: Partial<EmailLog> = {}): EmailLog {
  return {
    id: '1',
    evenement: 'BUDGET_SOUMIS',
    fkDestinataire: '11',
    destinataireEmail: 'valid@miznas.local',
    sujet: '[MIZNAS] Soumission V1',
    template: 'budget-soumis',
    payload: {},
    statut: 'ENVOYE',
    tentatives: 1,
    dernierMessageErreur: null,
    envoyeLe: '2027-01-01T10:00:00Z',
    dateCreation: '2027-01-01T10:00:00Z',
    ...over,
  };
}

describe('AdminEmailLogPage', () => {
  beforeEach(() => {
    mockLister.mockResolvedValue({
      items: [
        makeLog({ id: '1', statut: 'ENVOYE' }),
        makeLog({ id: '2', statut: 'ECHEC', dernierMessageErreur: 'SMTP DOWN' }),
        makeLog({ id: '3', statut: 'SUPPRIME' }),
      ],
      total: 3,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche les lignes du journal', async () => {
    render(<AdminEmailLogPage />);
    await waitFor(() =>
      expect(screen.getByTestId('email-log-row-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('email-log-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('email-log-row-3')).toBeInTheDocument();
  });

  it('cocher un statut filtre la liste via API', async () => {
    render(<AdminEmailLogPage />);
    await waitFor(() => screen.getByTestId('email-log-row-1'));
    fireEvent.click(screen.getByTestId('filtre-statut-ECHEC'));
    await waitFor(() => {
      const lastCall = mockLister.mock.calls[mockLister.mock.calls.length - 1];
      expect(lastCall![0]).toMatchObject({ statuts: ['ECHEC'] });
    });
  });

  it('cocher un événement filtre la liste via API', async () => {
    render(<AdminEmailLogPage />);
    await waitFor(() => screen.getByTestId('email-log-row-1'));
    fireEvent.click(screen.getByTestId('filtre-event-BUDGET_PUBLIE'));
    await waitFor(() => {
      const lastCall = mockLister.mock.calls[mockLister.mock.calls.length - 1];
      expect(lastCall![0]).toMatchObject({ evenements: ['BUDGET_PUBLIE'] });
    });
  });

  it('le bouton Rejouer ne s\'affiche QUE pour les lignes ECHEC', async () => {
    render(<AdminEmailLogPage />);
    await waitFor(() => screen.getByTestId('email-log-row-2'));
    expect(screen.getByTestId('btn-rejouer-2')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-rejouer-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-rejouer-3')).not.toBeInTheDocument();
  });

  it("clic sur Rejouer appelle l'API + rafraîchit", async () => {
    mockRejouer.mockResolvedValue({ envoye: true });
    render(<AdminEmailLogPage />);
    await waitFor(() => screen.getByTestId('btn-rejouer-2'));
    fireEvent.click(screen.getByTestId('btn-rejouer-2'));
    await waitFor(() => expect(mockRejouer).toHaveBeenCalledWith('2'));
  });

  it('affiche état vide quand 0 ligne', async () => {
    mockLister.mockResolvedValue({ items: [], total: 0 });
    render(<AdminEmailLogPage />);
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument(),
    );
  });
});
