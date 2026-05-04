/**
 * useGrilleSaisie (Lot 3.4) — coeur métier de la grille de saisie
 * budgétaire.
 *
 * Encapsule :
 *  - Le chargement de la grille (GET /budget/grille)
 *  - Une `Map` des modifications locales avant save (clé =
 *    `${compteId}|${ligneMetierId}|${mois}`).
 *  - Les calculs dérivés des totaux (annuel par ligne, mensuel CR,
 *    annuel CR) recalculés en `useMemo` à chaque modification —
 *    Q6 « totaux à la volée ».
 *  - L'action de sauvegarde groupée (POST /budget/grille).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getGrilleSaisie,
  type GrilleCellule,
  type GrilleSaisie,
  type GrilleSaveRequest,
  type GrilleSaveResponse,
  type ModeSaisie,
  saveGrilleSaisie,
} from '@/lib/api/budget-grille';

export interface UseGrilleSaisieParams {
  versionId: string | null;
  scenarioId: string | null;
  crId: string | null;
  /** Lot 3.4-bis : ligne_metier requise (clé from-scratch). */
  ligneMetierId: string | null;
  exerciceFiscal: number;
  codeClasse?: string;
}

/** Clé d'index `${compteId}|${ligneMetierId}|${mois}`. */
export type CelluleKey = string;

export function celluleKey(
  compteId: string,
  ligneMetierId: string,
  mois: string,
): CelluleKey {
  return `${compteId}|${ligneMetierId}|${mois}`;
}

export interface UseGrilleSaisieReturn {
  grille: GrilleSaisie | null;
  isLoading: boolean;
  error: Error | null;
  /** Modifications locales avant save (= cellules touchées). */
  modifications: Map<CelluleKey, GrilleCellule>;
  hasModifications: boolean;
  /** Mode de saisie de chaque ligne (porté par compte+ligne_metier). */
  modeParLigne: Map<string, ModeSaisie>;

  modifierCellule: (
    compteId: string,
    ligneMetierId: string,
    mois: string,
    update: Partial<GrilleCellule>,
  ) => void;
  changerModeLigne: (
    compteId: string,
    ligneMetierId: string,
    nouveauMode: ModeSaisie,
  ) => void;
  annulerModifications: () => void;
  sauvegarder: () => Promise<GrilleSaveResponse>;
  reload: () => Promise<void>;

  getCelluleEffective: (
    compteId: string,
    ligneMetierId: string,
    mois: string,
  ) => GrilleCellule | null;
  getTotalAnnuelLigne: (compteId: string, ligneMetierId: string) => number;
  getTotalMensuel: (mois: string) => number;
  getTotalAnneeCr: () => number;
}

function ligneKey(compteId: string, ligneMetierId: string): string {
  return `${compteId}|${ligneMetierId}`;
}

export function useGrilleSaisie(
  params: UseGrilleSaisieParams,
): UseGrilleSaisieReturn {
  const [grille, setGrille] = useState<GrilleSaisie | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [modifications, setModifications] = useState<
    Map<CelluleKey, GrilleCellule>
  >(new Map());
  const [modeParLigne, setModeParLigne] = useState<Map<string, ModeSaisie>>(
    new Map(),
  );

  const reload = useCallback(async (): Promise<void> => {
    if (
      !params.versionId ||
      !params.scenarioId ||
      !params.crId ||
      !params.ligneMetierId
    ) {
      setGrille(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getGrilleSaisie({
        versionId: params.versionId,
        scenarioId: params.scenarioId,
        crId: params.crId,
        ligneMetierId: params.ligneMetierId,
        exerciceFiscal: params.exerciceFiscal,
        ...(params.codeClasse ? { classeCompte: params.codeClasse } : {}),
      });
      setGrille(result);
      setModifications(new Map());
      // Hydrate le mode par ligne depuis les cellules existantes
      const modes = new Map<string, ModeSaisie>();
      for (const ligne of result.lignes) {
        const cellAvecMode = ligne.cellules.find((c) => c.modeSaisie !== null);
        if (cellAvecMode && cellAvecMode.modeSaisie) {
          modes.set(
            ligneKey(ligne.compte.id, ligne.ligneMetier.id),
            cellAvecMode.modeSaisie,
          );
        }
      }
      setModeParLigne(modes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
    } finally {
      setIsLoading(false);
    }
  }, [
    params.versionId,
    params.scenarioId,
    params.crId,
    params.ligneMetierId,
    params.exerciceFiscal,
    params.codeClasse,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ─── Lecture cellule effective (modif locale ou origine) ───────

  const cellulesOriginales = useMemo(() => {
    const m = new Map<CelluleKey, GrilleCellule>();
    if (!grille) return m;
    for (const ligne of grille.lignes) {
      for (const c of ligne.cellules) {
        m.set(
          celluleKey(ligne.compte.id, ligne.ligneMetier.id, c.mois),
          c,
        );
      }
    }
    return m;
  }, [grille]);

  const getCelluleEffective = useCallback(
    (
      compteId: string,
      ligneMetierId: string,
      mois: string,
    ): GrilleCellule | null => {
      const k = celluleKey(compteId, ligneMetierId, mois);
      return modifications.get(k) ?? cellulesOriginales.get(k) ?? null;
    },
    [modifications, cellulesOriginales],
  );

  // ─── Modification ──────────────────────────────────────────────

  const modifierCellule = useCallback(
    (
      compteId: string,
      ligneMetierId: string,
      mois: string,
      update: Partial<GrilleCellule>,
    ) => {
      setModifications((prev) => {
        const next = new Map(prev);
        const k = celluleKey(compteId, ligneMetierId, mois);
        const original = cellulesOriginales.get(k);
        const courant = next.get(k) ?? original;

        const fusionnee: GrilleCellule = {
          mois,
          montant: update.montant ?? courant?.montant ?? 0,
          modeSaisie:
            update.modeSaisie ?? courant?.modeSaisie ?? 'MONTANT',
          encoursMoyen:
            'encoursMoyen' in update
              ? (update.encoursMoyen ?? null)
              : (courant?.encoursMoyen ?? null),
          tie:
            'tie' in update ? (update.tie ?? null) : (courant?.tie ?? null),
          commentaire:
            'commentaire' in update
              ? (update.commentaire ?? null)
              : (courant?.commentaire ?? null),
          ligneId: courant?.ligneId ?? null,
        };

        // Si la fusion est strictement identique à l'original, on
        // retire la modification (pas de modif fictive).
        if (original && cellulesEgales(fusionnee, original)) {
          next.delete(k);
        } else {
          next.set(k, fusionnee);
        }
        return next;
      });
    },
    [cellulesOriginales],
  );

  const changerModeLigne = useCallback(
    (
      compteId: string,
      ligneMetierId: string,
      nouveauMode: ModeSaisie,
    ) => {
      const lk = ligneKey(compteId, ligneMetierId);
      setModeParLigne((prev) => {
        const next = new Map(prev);
        next.set(lk, nouveauMode);
        return next;
      });
      // Met à jour les 12 cellules : modeSaisie change ; si on
      // bascule MONTANT → ENCOURS_TIE, on remet montant à 0 ; si on
      // bascule ENCOURS_TIE → MONTANT, on garde le montant calculé
      // mais on efface encoursMoyen + tie.
      if (!grille) return;
      const ligne = grille.lignes.find(
        (l) =>
          l.compte.id === compteId && l.ligneMetier.id === ligneMetierId,
      );
      if (!ligne) return;
      for (const cell of ligne.cellules) {
        if (nouveauMode === 'ENCOURS_TIE') {
          modifierCellule(compteId, ligneMetierId, cell.mois, {
            modeSaisie: 'ENCOURS_TIE',
            montant: 0,
            encoursMoyen: null,
            tie: null,
          });
        } else {
          modifierCellule(compteId, ligneMetierId, cell.mois, {
            modeSaisie: 'MONTANT',
            encoursMoyen: null,
            tie: null,
          });
        }
      }
    },
    [grille, modifierCellule],
  );

  const annulerModifications = useCallback(() => {
    setModifications(new Map());
  }, []);

  // ─── Totaux à la volée (Q6) ────────────────────────────────────

  const getTotalAnnuelLigne = useCallback(
    (compteId: string, ligneMetierId: string): number => {
      if (!grille) return 0;
      const ligne = grille.lignes.find(
        (l) =>
          l.compte.id === compteId && l.ligneMetier.id === ligneMetierId,
      );
      if (!ligne) return 0;
      let total = 0;
      for (const cell of ligne.cellules) {
        const eff = getCelluleEffective(compteId, ligneMetierId, cell.mois);
        total += eff?.montant ?? 0;
      }
      return total;
    },
    [grille, getCelluleEffective],
  );

  const getTotalMensuel = useCallback(
    (mois: string): number => {
      if (!grille) return 0;
      let total = 0;
      for (const ligne of grille.lignes) {
        const eff = getCelluleEffective(
          ligne.compte.id,
          ligne.ligneMetier.id,
          mois,
        );
        total += eff?.montant ?? 0;
      }
      return total;
    },
    [grille, getCelluleEffective],
  );

  const getTotalAnneeCr = useCallback((): number => {
    if (!grille) return 0;
    let total = 0;
    for (const m of grille.totauxMensuels) {
      total += getTotalMensuel(m.mois);
    }
    return total;
  }, [grille, getTotalMensuel]);

  // ─── Save ───────────────────────────────────────────────────────

  const sauvegarder = useCallback(async (): Promise<GrilleSaveResponse> => {
    if (!grille || modifications.size === 0) {
      return {
        totalCellules: 0,
        inserees: 0,
        modifiees: 0,
        supprimees: 0,
        ignorees: 0,
        erreurs: [],
        dureeMs: 0,
      };
    }
    // Regrouper les cellules par (compteId, ligneMetierId)
    const parLigne = new Map<
      string,
      {
        compteId: string;
        ligneMetierId: string;
        cellules: GrilleCellule[];
      }
    >();
    for (const [k, cell] of modifications.entries()) {
      const [compteId, ligneMetierId] = k.split('|');
      if (!compteId || !ligneMetierId) continue;
      const lk = `${compteId}|${ligneMetierId}`;
      if (!parLigne.has(lk)) {
        parLigne.set(lk, { compteId, ligneMetierId, cellules: [] });
      }
      parLigne.get(lk)!.cellules.push(cell);
    }

    const request: GrilleSaveRequest = {
      versionId: grille.version.id,
      scenarioId: grille.scenario.id,
      crId: grille.cr.id,
      lignes: Array.from(parLigne.values()).map((l) => ({
        compteId: l.compteId,
        ligneMetierId: l.ligneMetierId,
        cellules: l.cellules.map((c) => ({
          mois: c.mois,
          montant: c.montant,
          ...(c.modeSaisie ? { modeSaisie: c.modeSaisie } : {}),
          ...(c.encoursMoyen !== null && c.encoursMoyen !== undefined
            ? { encoursMoyen: c.encoursMoyen }
            : {}),
          ...(c.tie !== null && c.tie !== undefined ? { tie: c.tie } : {}),
          ...(c.commentaire ? { commentaire: c.commentaire } : {}),
        })),
      })),
    };
    const response = await saveGrilleSaisie(request);
    if (response.erreurs.length === 0) {
      // Recharger pour récupérer les ligneId à jour
      await reload();
    }
    return response;
  }, [grille, modifications, reload]);

  return {
    grille,
    isLoading,
    error,
    modifications,
    hasModifications: modifications.size > 0,
    modeParLigne,
    modifierCellule,
    changerModeLigne,
    annulerModifications,
    sauvegarder,
    reload,
    getCelluleEffective,
    getTotalAnnuelLigne,
    getTotalMensuel,
    getTotalAnneeCr,
  };
}

function cellulesEgales(a: GrilleCellule, b: GrilleCellule): boolean {
  return (
    a.montant === b.montant &&
    a.modeSaisie === b.modeSaisie &&
    a.encoursMoyen === b.encoursMoyen &&
    a.tie === b.tie &&
    a.commentaire === b.commentaire
  );
}
