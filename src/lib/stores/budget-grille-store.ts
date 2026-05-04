/**
 * Store Zustand pour le contexte de saisie budgétaire (Lot 3.4).
 *
 * Persiste dans localStorage les choix de l'utilisateur (version /
 * scénario / CR / classe) pour les retrouver au prochain login.
 *
 * NB : aucune donnée sensible — uniquement des IDs non-secrets.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BudgetGrillePersistedState {
  versionId: string | null;
  scenarioId: string | null;
  crId: string | null;
  /** Lot 3.4-bis : ligne_metier sélectionnée (clé from-scratch). */
  ligneMetierId: string | null;
  /** '6' (charges) / '7' (produits) / 'TOUTES' / etc. */
  codeClasse: string;
}

interface BudgetGrilleState extends BudgetGrillePersistedState {
  setVersionId: (id: string | null) => void;
  setScenarioId: (id: string | null) => void;
  setCrId: (id: string | null) => void;
  setLigneMetierId: (id: string | null) => void;
  setCodeClasse: (code: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: BudgetGrillePersistedState = {
  versionId: null,
  scenarioId: null,
  crId: null,
  ligneMetierId: null,
  codeClasse: '6',
};

export const useBudgetGrilleStore = create<BudgetGrilleState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setVersionId: (id) => set({ versionId: id }),
      setScenarioId: (id) => set({ scenarioId: id }),
      setCrId: (id) => set({ crId: id }),
      setLigneMetierId: (id) => set({ ligneMetierId: id }),
      setCodeClasse: (code) => set({ codeClasse: code }),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'miznas-budget-grille',
      partialize: (state) => ({
        versionId: state.versionId,
        scenarioId: state.scenarioId,
        crId: state.crId,
        ligneMetierId: state.ligneMetierId,
        codeClasse: state.codeClasse,
      }),
    },
  ),
);
