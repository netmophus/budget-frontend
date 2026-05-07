/**
 * Tests Vitest client API délégations (Lot 4.2.C).
 * Vérifie la sérialisation correcte des appels axios.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiClient } from './client';
import {
  creerDelegation,
  listerDelegationsEmises,
  listerDelegationsRecues,
  listerToutesDelegations,
  revoquerDelegation,
} from './delegations';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

describe('delegations API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creerDelegation POST /delegations avec le DTO complet', async () => {
    mockPost.mockResolvedValue({ data: { id: '1', warnings: [] } });
    await creerDelegation({
      fkDelegataire: '11',
      perimetreUserPerimetreIds: ['1'],
      permissions: ['VALIDATION'],
      motif: 'Mission BCEAO',
      dateDebut: '2027-01-01',
      dateFin: '2027-01-31',
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/delegations',
      expect.objectContaining({
        fkDelegataire: '11',
        permissions: ['VALIDATION'],
      }),
    );
  });

  it('revoquerDelegation POST /delegations/:id/revoquer avec motif', async () => {
    mockPost.mockResolvedValue({ data: { id: '1' } });
    await revoquerDelegation('42', { motif: 'Retour de mission' });
    expect(mockPost).toHaveBeenCalledWith('/delegations/42/revoquer', {
      motif: 'Retour de mission',
    });
  });

  it('listerDelegationsRecues GET /delegations/recues avec params', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await listerDelegationsRecues({ actif: true, dateRef: '2027-01-15' });
    expect(mockGet).toHaveBeenCalledWith('/delegations/recues', {
      params: { actif: true, dateRef: '2027-01-15' },
    });
  });

  it('listerDelegationsEmises GET /delegations/emises avec filtre statut', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await listerDelegationsEmises({ statut: 'ACTIVE' });
    expect(mockGet).toHaveBeenCalledWith('/delegations/emises', {
      params: { statut: 'ACTIVE' },
    });
  });

  it('listerToutesDelegations GET /admin/delegations transmet tous les filtres', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await listerToutesDelegations({
      delegantId: '10',
      actif: true,
      page: 2,
      limit: 25,
    });
    expect(mockGet).toHaveBeenCalledWith('/admin/delegations', {
      params: { delegantId: '10', actif: true, page: 2, limit: 25 },
    });
  });
});
