/**
 * Tests Vitest store reforecast (Lot 5.3.B). Couvre helper
 * filtrerListe + actions du store.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/reforecast', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reforecast')>(
    '@/lib/api/reforecast',
  );
  return {
    ...actual,
    listerReforecasts: vi.fn(),
    lancerReforecast: vi.fn(),
  };
});

import {
  type Reforecast,
  lancerReforecast,
  listerReforecasts,
} from '@/lib/api/reforecast';
import {
  filtrerListe,
  useReforecastStore,
} from './reforecast-store';

const mockLister = listerReforecasts as unknown as ReturnType<typeof vi.fn>;
const mockLancer = lancerReforecast as unknown as ReturnType<typeof vi.fn>;

function makeReforecast(over: Partial<Reforecast> = {}): Reforecast {
  return {
    id: '1',
    codeVersion: 'REFORECAST_T1_2027_1',
    libelle: 'Reforecast T1 2027',
    exerciceFiscal: 2027,
    statut: 'ouvert',
    statutPublication: 'ACTIVE',
    fkVersionSource: '10',
    fkScenarioSource: '20',
    trimestreConsolide: 1,
    anneeConsolide: 2027,
    methodeExtrapolation: 'BUDGET_INITIAL',
    dateObsolescence: null,
    fkVersionRemplacante: null,
    libelleVersionSource: 'Budget initial',
    libelleScenarioSource: 'Optimiste',
    dateCreation: '2027-04-01T00:00:00Z',
    utilisateurCreation: 'admin',
    commentaire: null,
    ...over,
  };
}

describe('filtrerListe', () => {
  const liste = [
    makeReforecast({
      id: '1',
      libelle: 'Reforecast T1 2027',
      codeVersion: 'REFORECAST_T1_2027_1',
    }),
    makeReforecast({
      id: '2',
      libelle: 'Reforecast T2 2027',
      codeVersion: 'REFORECAST_T2_2027_2',
    }),
    makeReforecast({
      id: '3',
      libelle: 'Test Q3',
      codeVersion: 'AUTRE_CODE_2027_3',
    }),
  ];

  it('aucune recherche → renvoie tout', () => {
    expect(filtrerListe(liste, '')).toHaveLength(3);
  });

  it('recherche dans libellé (insensible casse)', () => {
    expect(filtrerListe(liste, 't1')).toHaveLength(1);
    expect(filtrerListe(liste, 'reforecast')).toHaveLength(2);
  });

  it('recherche dans codeVersion', () => {
    expect(filtrerListe(liste, 'REFORECAST_T1')).toHaveLength(1);
  });

  it('aucun match : tableau vide', () => {
    expect(filtrerListe(liste, 'inexistant')).toHaveLength(0);
  });
});

describe('useReforecastStore', () => {
  beforeEach(() => {
    useReforecastStore.setState({
      statutPublication: 'ACTIVE',
      statutWorkflow: 'TOUS',
      anneeConsolide: null,
      recherche: '',
      liste: [],
      loading: false,
      error: null,
    });
    mockLister.mockReset();
    mockLancer.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('fetchListe met à jour liste/loading/error', async () => {
    mockLister.mockResolvedValueOnce([
      makeReforecast({ id: '1' }),
      makeReforecast({ id: '2' }),
    ]);
    await useReforecastStore.getState().fetchListe();
    const s = useReforecastStore.getState();
    expect(s.liste).toHaveLength(2);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it("fetchListe applique le filtre statutPublication=ACTIVE par défaut", async () => {
    mockLister.mockResolvedValueOnce([]);
    await useReforecastStore.getState().fetchListe();
    expect(mockLister).toHaveBeenCalledWith(
      expect.objectContaining({ statutPublication: 'ACTIVE' }),
    );
  });

  it("fetchListe ne passe pas statutPublication quand filtre = TOUS", async () => {
    useReforecastStore.setState({ statutPublication: 'TOUS' });
    mockLister.mockResolvedValueOnce([]);
    await useReforecastStore.getState().fetchListe();
    const arg = mockLister.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.statutPublication).toBeUndefined();
  });

  it("fetchListe gère l'erreur API en remplissant error", async () => {
    mockLister.mockRejectedValueOnce(new Error('Network down'));
    await useReforecastStore.getState().fetchListe();
    const s = useReforecastStore.getState();
    expect(s.error).toContain('Network down');
    expect(s.loading).toBe(false);
  });

  it('lancer rafraîchit la liste après succès', async () => {
    const created = makeReforecast({ id: '99' });
    mockLancer.mockResolvedValueOnce(created);
    mockLister.mockResolvedValueOnce([created]);
    const r = await useReforecastStore.getState().lancer({
      fkVersionSource: '10',
      fkScenarioSource: '20',
      trimestreConsolide: 1,
      anneeConsolide: 2027,
      methodeExtrapolation: 'BUDGET_INITIAL',
      libelleNouveauVersion: 'Test',
    });
    expect(r.id).toBe('99');
    expect(mockLister).toHaveBeenCalledTimes(1);
    expect(useReforecastStore.getState().liste).toHaveLength(1);
  });
});
