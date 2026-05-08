/**
 * Store Zustand pour la liste des reforecasts (Lot 5.3.B). Persiste
 * uniquement les filtres ; la liste elle-même reste volatile.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  type LancerReforecastPayload,
  type ListerFiltres,
  type Reforecast,
  lancerReforecast,
  listerReforecasts,
} from '@/lib/api/reforecast';

interface FiltresPersisted {
  statutPublication: 'TOUS' | 'ACTIVE' | 'OBSOLETE';
  statutWorkflow: 'TOUS' | 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'PUBLIE';
  anneeConsolide: number | null;
  recherche: string;
}

interface ReforecastStoreState extends FiltresPersisted {
  liste: Reforecast[];
  loading: boolean;
  error: string | null;

  setStatutPublication: (s: FiltresPersisted['statutPublication']) => void;
  setStatutWorkflow: (s: FiltresPersisted['statutWorkflow']) => void;
  setAnneeConsolide: (a: number | null) => void;
  setRecherche: (q: string) => void;

  fetchListe: () => Promise<void>;
  lancer: (payload: LancerReforecastPayload) => Promise<Reforecast>;
}

const DEFAULT: FiltresPersisted = {
  statutPublication: 'ACTIVE',
  statutWorkflow: 'TOUS',
  anneeConsolide: null,
  recherche: '',
};

export const useReforecastStore = create<ReforecastStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      liste: [],
      loading: false,
      error: null,

      setStatutPublication: (s) => set({ statutPublication: s }),
      setStatutWorkflow: (s) => set({ statutWorkflow: s }),
      setAnneeConsolide: (a) => set({ anneeConsolide: a }),
      setRecherche: (q) => set({ recherche: q }),

      fetchListe: async () => {
        const s = get();
        set({ loading: true, error: null });
        const filtres: ListerFiltres = {};
        if (s.statutPublication !== 'TOUS') {
          filtres.statutPublication = s.statutPublication;
        }
        if (s.statutWorkflow !== 'TOUS') {
          filtres.statutWorkflow = s.statutWorkflow;
        }
        if (s.anneeConsolide !== null) {
          filtres.anneeConsolide = s.anneeConsolide;
        }
        try {
          const liste = await listerReforecasts(filtres);
          set({ liste, loading: false });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur';
          set({ error: msg, loading: false });
        }
      },

      lancer: async (payload) => {
        const result = await lancerReforecast(payload);
        // Refresh liste après succès
        await get().fetchListe();
        return result;
      },
    }),
    {
      name: 'reforecast-store-v1',
      partialize: (s): FiltresPersisted => ({
        statutPublication: s.statutPublication,
        statutWorkflow: s.statutWorkflow,
        anneeConsolide: s.anneeConsolide,
        recherche: s.recherche,
      }),
    },
  ),
);

/**
 * Helper pur (testable) : applique le filtre recherche sur la liste.
 */
export function filtrerListe(
  liste: Reforecast[],
  recherche: string,
): Reforecast[] {
  const r = recherche.trim().toLowerCase();
  if (!r) return liste;
  return liste.filter(
    (rf) =>
      rf.libelle.toLowerCase().includes(r) ||
      rf.codeVersion.toLowerCase().includes(r),
  );
}
