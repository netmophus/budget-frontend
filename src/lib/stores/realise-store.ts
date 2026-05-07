/**
 * Store Zustand pour le module Réalisé (Lot 5.1).
 *
 * - État du contexte (CR, période, devise) persisté localStorage
 *   (cohérent avec budget-grille-store).
 * - État de la grille (lignes chargées, sélection, filtres,
 *   loading) NON persisté — re-fetché à chaque mount.
 *
 * Pas de données sensibles dans le persist (juste des IDs
 * non-secrets et des codes mois).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  type FaitRealise,
  type SourceFaitRealise,
  type StatutFaitRealise,
  getGrilleRealise,
  validerRealise,
} from '@/lib/api/realise';

interface RealiseContextePersisted {
  crId: string | null;
  moisDebut: string; // YYYY-MM
  moisFin: string;
  fkDeviseDefaut: string | null;
}

interface RealiseStoreState extends RealiseContextePersisted {
  // État volatile (non persisté)
  lignes: FaitRealise[];
  selection: Set<string>;
  filtreCodeCompte: string;
  filtreStatut: StatutFaitRealise | 'TOUS';
  filtreSource: SourceFaitRealise | 'TOUS';
  loading: boolean;
  error: string | null;

  // Actions contexte
  setCrId: (id: string | null) => void;
  setPeriode: (debut: string, fin: string) => void;
  setDeviseDefaut: (id: string | null) => void;

  // Actions filtres
  setFiltreCodeCompte: (q: string) => void;
  setFiltreStatut: (s: StatutFaitRealise | 'TOUS') => void;
  setFiltreSource: (s: SourceFaitRealise | 'TOUS') => void;

  // Actions sélection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAllImporte: () => void;

  // Actions API
  fetchGrille: () => Promise<void>;
  validerSelection: () => Promise<{ nbValidees: number }>;
}

function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function moisIlYa(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT: RealiseContextePersisted = {
  crId: null,
  moisDebut: moisIlYa(2),
  moisFin: moisCourant(),
  fkDeviseDefaut: null,
};

export const useRealiseStore = create<RealiseStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      lignes: [],
      selection: new Set<string>(),
      filtreCodeCompte: '',
      filtreStatut: 'TOUS',
      filtreSource: 'TOUS',
      loading: false,
      error: null,

      setCrId: (id) => set({ crId: id, selection: new Set() }),
      setPeriode: (debut, fin) =>
        set({ moisDebut: debut, moisFin: fin, selection: new Set() }),
      setDeviseDefaut: (id) => set({ fkDeviseDefaut: id }),

      setFiltreCodeCompte: (q) => set({ filtreCodeCompte: q }),
      setFiltreStatut: (s) => set({ filtreStatut: s }),
      setFiltreSource: (s) => set({ filtreSource: s }),

      toggleSelection: (id) => {
        const { selection } = get();
        const next = new Set(selection);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        set({ selection: next });
      },
      clearSelection: () => set({ selection: new Set() }),
      selectAllImporte: () => {
        const { lignes } = get();
        const ids = lignes
          .filter((l) => l.statut === 'IMPORTE')
          .map((l) => l.id);
        set({ selection: new Set(ids) });
      },

      fetchGrille: async () => {
        const { crId, moisDebut, moisFin } = get();
        if (!crId) {
          set({ lignes: [], error: null });
          return;
        }
        set({ loading: true, error: null });
        try {
          const r = await getGrilleRealise(crId, moisDebut, moisFin);
          set({ lignes: r, loading: false });
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Erreur inconnue';
          set({ error: msg, loading: false });
        }
      },

      validerSelection: async () => {
        const { selection } = get();
        const ids = Array.from(selection);
        const r = await validerRealise(ids);
        // Refresh + clear selection
        set({ selection: new Set() });
        await get().fetchGrille();
        return r;
      },
    }),
    {
      name: 'realise-store-v1',
      partialize: (s): RealiseContextePersisted => ({
        crId: s.crId,
        moisDebut: s.moisDebut,
        moisFin: s.moisFin,
        fkDeviseDefaut: s.fkDeviseDefaut,
      }),
    },
  ),
);
