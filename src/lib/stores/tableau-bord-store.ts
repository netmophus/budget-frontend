/**
 * Store Zustand pour le tableau de bord budget vs réalisé
 * (Lot 5.2.C). Persiste les filtres principaux côté localStorage
 * pour les retrouver à la prochaine ouverture.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  analyserEcarts,
  type EcartsResponse,
  type FiltresEcarts,
  type NiveauAlerte,
} from '@/lib/api/tableau-bord';

type FiltreRapide =
  | 'TOUS'
  | 'CRITIQUE'
  | 'ATTENTION'
  | 'MANQUANT'
  | 'SANS_BUDGET';
/** Filtre client par classe de compte (compte de résultat). */
export type FiltreClasse = 'TOUTES' | 'PRODUITS' | 'CHARGES';

interface FiltresPersisted {
  versionId: string | null;
  scenarioId: string | null;
  crIds: string[];
  moisDebut: string;
  moisFin: string;
  seuilEcartPctAttention: number;
  seuilEcartPctCritique: number;
}

interface TableauBordStoreState extends FiltresPersisted {
  // État volatile (non persisté)
  ecarts: EcartsResponse | null;
  loading: boolean;
  error: string | null;
  filtreRapide: FiltreRapide;
  filtreClasse: FiltreClasse;
  rechercheTexte: string;
  // Drill-down (PR2) : filtre actif déclenché par un clic sur un chart
  // par CR / ligne métier. Volatile (non persisté).
  drillCr: string | null;
  drillLm: string | null;

  // Actions filtres
  setVersionId: (id: string | null) => void;
  setScenarioId: (id: string | null) => void;
  setCrIds: (ids: string[]) => void;
  setPeriode: (debut: string, fin: string) => void;
  setSeuils: (attention: number, critique: number) => void;
  setFiltreRapide: (f: FiltreRapide) => void;
  setFiltreClasse: (c: FiltreClasse) => void;
  setRechercheTexte: (q: string) => void;
  setDrillCr: (codeCr: string | null) => void;
  setDrillLm: (codeLm: string | null) => void;
  clearDrill: () => void;

  // Actions API
  analyser: () => Promise<void>;
}

function moisIlYa(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT: FiltresPersisted = {
  versionId: null,
  scenarioId: null,
  crIds: [],
  moisDebut: moisIlYa(2),
  moisFin: moisCourant(),
  seuilEcartPctAttention: 5,
  seuilEcartPctCritique: 10,
};

export const useTableauBordStore = create<TableauBordStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      ecarts: null,
      loading: false,
      error: null,
      filtreRapide: 'TOUS',
      filtreClasse: 'TOUTES',
      rechercheTexte: '',
      drillCr: null,
      drillLm: null,

      setVersionId: (id) => set({ versionId: id }),
      setScenarioId: (id) => set({ scenarioId: id }),
      setCrIds: (ids) => set({ crIds: ids }),
      setPeriode: (debut, fin) => set({ moisDebut: debut, moisFin: fin }),
      setSeuils: (attention, critique) =>
        set({
          seuilEcartPctAttention: attention,
          seuilEcartPctCritique: critique,
        }),
      setFiltreRapide: (f) => set({ filtreRapide: f }),
      setFiltreClasse: (c) => set({ filtreClasse: c }),
      setRechercheTexte: (q) => set({ rechercheTexte: q }),
      // Drill-down : un clic CR efface un éventuel drill LM (et vice
      // versa) — on ne combine pas deux drill-down à la fois.
      setDrillCr: (codeCr) => set({ drillCr: codeCr, drillLm: null }),
      setDrillLm: (codeLm) => set({ drillLm: codeLm, drillCr: null }),
      clearDrill: () => set({ drillCr: null, drillLm: null }),

      analyser: async () => {
        const s = get();
        if (!s.versionId || !s.scenarioId) {
          set({
            ecarts: null,
            error: 'Sélectionnez une version et un scénario.',
          });
          return;
        }
        const filtres: FiltresEcarts = {
          versionId: s.versionId,
          scenarioId: s.scenarioId,
          crIds: s.crIds.length > 0 ? s.crIds : undefined,
          moisDebut: s.moisDebut,
          moisFin: s.moisFin,
          seuilEcartPctAttention: s.seuilEcartPctAttention,
          seuilEcartPctCritique: s.seuilEcartPctCritique,
        };
        set({ loading: true, error: null });
        try {
          const r = await analyserEcarts(filtres);
          set({ ecarts: r, loading: false });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur inconnue';
          set({ error: msg, loading: false });
        }
      },
    }),
    {
      name: 'tableau-bord-store-v1',
      partialize: (s): FiltresPersisted => ({
        versionId: s.versionId,
        scenarioId: s.scenarioId,
        crIds: s.crIds,
        moisDebut: s.moisDebut,
        moisFin: s.moisFin,
        seuilEcartPctAttention: s.seuilEcartPctAttention,
        seuilEcartPctCritique: s.seuilEcartPctCritique,
      }),
    },
  ),
);

/**
 * Helper pur (testable) : applique le filtre rapide (niveau) + le filtre
 * de classe (Produits 7 / Charges 6) + la recherche texte.
 */
export function filtrerLignes<
  T extends {
    codeCr: string;
    codeCompte: string;
    classeCompte: string;
    niveauAlerte: NiveauAlerte;
  },
>(
  lignes: T[],
  filtreRapide: FiltreRapide,
  recherche: string,
  filtreClasse: FiltreClasse = 'TOUTES',
): T[] {
  const r = recherche.trim().toLowerCase();
  return lignes.filter((l) => {
    if (filtreRapide !== 'TOUS' && l.niveauAlerte !== filtreRapide)
      return false;
    if (filtreClasse === 'PRODUITS' && l.classeCompte !== '7') return false;
    if (filtreClasse === 'CHARGES' && l.classeCompte !== '6') return false;
    if (r) {
      const target = `${l.codeCr} ${l.codeCompte}`.toLowerCase();
      if (!target.includes(r)) return false;
    }
    return true;
  });
}
