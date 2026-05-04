/**
 * Tests unitaires useGrilleSaisie (Lot 3.4) — sans appel API réel.
 * On mocke `getGrilleSaisie` et `saveGrilleSaisie` pour isoler la
 * logique du hook : modifications Map, recalcul totaux à la volée,
 * détection des modifications identiques, payload save.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/budget-grille', () => ({
  getGrilleSaisie: vi.fn(),
  saveGrilleSaisie: vi.fn(),
}));

import {
  getGrilleSaisie,
  saveGrilleSaisie,
  type GrilleSaisie,
} from '@/lib/api/budget-grille';
import { useGrilleSaisie } from './useGrilleSaisie';

const mockGet = getGrilleSaisie as unknown as ReturnType<typeof vi.fn>;
const mockSave = saveGrilleSaisie as unknown as ReturnType<typeof vi.fn>;

const SAMPLE_GRILLE: GrilleSaisie = {
  version: { id: '1', codeVersion: 'BUDGET_2027', libelle: 'B27', statut: 'ouvert' },
  scenario: { id: '10', codeScenario: 'MEDIAN_2027', libelle: 'Méd.', typeScenario: 'central' },
  cr: {
    id: '100',
    codeCr: 'CR_AG',
    libelle: 'CR Agence',
    structureRattachee: { codeStructure: 'AG_ABJ', libelle: 'Agence Plateau' },
  },
  exerciceFiscal: 2027,
  moisLabels: ['Janv. 2027', 'Févr. 2027'],
  comptesFeuillesEligibles: [],
  lignes: [
    {
      compte: {
        id: '500',
        codeCompte: '611100',
        libelle: 'Salaires',
        classe: '6',
        sens: 'D',
        estPorteurInterets: false,
      },
      ligneMetier: { id: '20', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
      cellules: [
        {
          mois: '2027-01-01',
          montant: 10_000_000,
          modeSaisie: 'MONTANT',
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: 'L1',
        },
        {
          mois: '2027-02-01',
          montant: 10_000_000,
          modeSaisie: 'MONTANT',
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: 'L2',
        },
      ],
      totalAnnee: 20_000_000,
    },
  ],
  totauxMensuels: [
    { mois: '2027-01-01', total: 10_000_000 },
    { mois: '2027-02-01', total: 10_000_000 },
  ],
  totalAnneeCr: 20_000_000,
};

describe('useGrilleSaisie', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('charge la grille au mount + getCelluleEffective retourne origine sans modif', async () => {
    mockGet.mockResolvedValue(SAMPLE_GRILLE);
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.grille).toBeTruthy();
    const cell = result.current.getCelluleEffective(
      '500',
      '20',
      '2027-01-01',
    );
    expect(cell?.montant).toBe(10_000_000);
  });

  it('modifierCellule ajoute à modifications + total annuel ligne recalculé à la volée', async () => {
    mockGet.mockResolvedValue(SAMPLE_GRILLE);
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.modifierCellule('500', '20', '2027-01-01', {
        montant: 12_000_000,
      });
    });
    expect(result.current.modifications.size).toBe(1);
    expect(result.current.hasModifications).toBe(true);
    expect(result.current.getTotalAnnuelLigne('500', '20')).toBe(22_000_000);
    expect(result.current.getTotalMensuel('2027-01-01')).toBe(12_000_000);
    expect(result.current.getTotalAnneeCr()).toBe(22_000_000);
  });

  it('modifierCellule avec valeur identique à origine retire la modif (pas de modif fictive)', async () => {
    mockGet.mockResolvedValue(SAMPLE_GRILLE);
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // 1) modifier
    act(() => {
      result.current.modifierCellule('500', '20', '2027-01-01', {
        montant: 12_000_000,
      });
    });
    expect(result.current.modifications.size).toBe(1);
    // 2) revenir à la valeur d'origine
    act(() => {
      result.current.modifierCellule('500', '20', '2027-01-01', {
        montant: 10_000_000,
      });
    });
    expect(result.current.modifications.size).toBe(0);
    expect(result.current.hasModifications).toBe(false);
  });

  it('annulerModifications vide la Map', async () => {
    mockGet.mockResolvedValue(SAMPLE_GRILLE);
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.modifierCellule('500', '20', '2027-01-01', {
        montant: 12_000_000,
      });
      result.current.modifierCellule('500', '20', '2027-02-01', {
        montant: 13_000_000,
      });
    });
    expect(result.current.modifications.size).toBe(2);
    act(() => {
      result.current.annulerModifications();
    });
    expect(result.current.modifications.size).toBe(0);
    // Et getCelluleEffective retombe sur l'origine
    const cell = result.current.getCelluleEffective(
      '500',
      '20',
      '2027-01-01',
    );
    expect(cell?.montant).toBe(10_000_000);
  });

  it('sauvegarder construit le payload + appelle saveGrilleSaisie', async () => {
    mockGet.mockResolvedValue(SAMPLE_GRILLE);
    mockSave.mockResolvedValue({
      totalCellules: 1,
      inserees: 0,
      modifiees: 1,
      supprimees: 0,
      ignorees: 0,
      erreurs: [],
      dureeMs: 42,
    });
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.modifierCellule('500', '20', '2027-01-01', {
        montant: 12_000_000,
      });
    });
    await act(async () => {
      const r = await result.current.sauvegarder();
      expect(r.modifiees).toBe(1);
    });
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        lignes: expect.arrayContaining([
          expect.objectContaining({
            compteId: '500',
            ligneMetierId: '20',
            cellules: expect.arrayContaining([
              expect.objectContaining({
                mois: '2027-01-01',
                montant: 12_000_000,
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('changerModeLigne MONTANT → ENCOURS_TIE met les 12 cellules en mode ENCOURS_TIE', async () => {
    const grilleAvecPorteur: GrilleSaisie = {
      ...SAMPLE_GRILLE,
      lignes: SAMPLE_GRILLE.lignes.map((l) => ({
        ...l,
        compte: { ...l.compte, estPorteurInterets: true, codeCompte: '671100' },
      })),
    };
    mockGet.mockResolvedValue(grilleAvecPorteur);
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: '1',
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.changerModeLigne('500', '20', 'ENCOURS_TIE');
    });
    expect(result.current.modeParLigne.get('500|20')).toBe('ENCOURS_TIE');
    // Les 2 cellules du sample sont passées en ENCOURS_TIE avec
    // montant=0 + encours=null + tie=null
    const c1 = result.current.getCelluleEffective('500', '20', '2027-01-01');
    expect(c1?.modeSaisie).toBe('ENCOURS_TIE');
    expect(c1?.montant).toBe(0);
    expect(c1?.encoursMoyen).toBeNull();
  });

  it('grille null si versionId/scenarioId/crId incomplet', () => {
    const { result } = renderHook(() =>
      useGrilleSaisie({
        versionId: null,
        scenarioId: '10',
        crId: '100',
        exerciceFiscal: 2027,
      }),
    );
    expect(result.current.grille).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
