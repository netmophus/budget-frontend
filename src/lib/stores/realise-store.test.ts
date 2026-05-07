/**
 * Tests Vitest realiseStore (Lot 5.1.B).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/realise', () => ({
  getGrilleRealise: vi.fn(),
  validerRealise: vi.fn(),
}));

import {
  getGrilleRealise,
  validerRealise,
  type FaitRealise,
} from '@/lib/api/realise';
import { useRealiseStore } from './realise-store';

const mockGetGrille = getGrilleRealise as unknown as ReturnType<typeof vi.fn>;
const mockValider = validerRealise as unknown as ReturnType<typeof vi.fn>;

function makeRow(over: Partial<FaitRealise> = {}): FaitRealise {
  return {
    id: '1',
    fkCentreResponsabilite: '10',
    fkCompte: '20',
    fkLigneMetier: '30',
    fkTemps: '40',
    fkDevise: '50',
    montant: 1000,
    tauxChangeApplique: 1,
    mode: 'MNT',
    statut: 'IMPORTE',
    source: 'SAISIE',
    commentaire: null,
    valideLe: null,
    fkValidePar: null,
    dateCreation: '2027-01-15T10:00:00Z',
    ...over,
  };
}

describe('realiseStore', () => {
  beforeEach(() => {
    // Reset store entre tests (state volatile)
    useRealiseStore.setState({
      lignes: [],
      selection: new Set(),
      filtreCodeCompte: '',
      filtreStatut: 'TOUS',
      filtreSource: 'TOUS',
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchGrille appelle l\'API et met à jour les lignes', async () => {
    useRealiseStore.setState({
      crId: '10',
      moisDebut: '2027-01',
      moisFin: '2027-03',
    });
    const lignes = [makeRow({ id: '1' }), makeRow({ id: '2' })];
    mockGetGrille.mockResolvedValue(lignes);
    await useRealiseStore.getState().fetchGrille();
    expect(mockGetGrille).toHaveBeenCalledWith('10', '2027-01', '2027-03');
    expect(useRealiseStore.getState().lignes).toEqual(lignes);
    expect(useRealiseStore.getState().loading).toBe(false);
  });

  it('fetchGrille avec crId=null vide les lignes sans appel API', async () => {
    useRealiseStore.setState({ crId: null });
    await useRealiseStore.getState().fetchGrille();
    expect(mockGetGrille).not.toHaveBeenCalled();
    expect(useRealiseStore.getState().lignes).toEqual([]);
  });

  it('toggleSelection ajoute / retire un id', () => {
    useRealiseStore.getState().toggleSelection('5');
    expect(useRealiseStore.getState().selection.has('5')).toBe(true);
    useRealiseStore.getState().toggleSelection('5');
    expect(useRealiseStore.getState().selection.has('5')).toBe(false);
  });

  it("validerSelection appelle l'API + refetch + clear selection", async () => {
    useRealiseStore.setState({
      crId: '10',
      moisDebut: '2027-01',
      moisFin: '2027-03',
      selection: new Set(['1', '2']),
    });
    mockValider.mockResolvedValue({ nbValidees: 2 });
    mockGetGrille.mockResolvedValue([]);
    const r = await useRealiseStore.getState().validerSelection();
    expect(r.nbValidees).toBe(2);
    expect(mockValider).toHaveBeenCalledWith(['1', '2']);
    expect(mockGetGrille).toHaveBeenCalled();
    expect(useRealiseStore.getState().selection.size).toBe(0);
  });
});
