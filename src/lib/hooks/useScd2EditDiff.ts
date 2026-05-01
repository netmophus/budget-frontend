/**
 * Hook utilitaire qui calcule le diff entre les données initiales
 * d'une dimension SCD2 et le formulaire courant, prédit le mode
 * d'application backend (`modeMaj`) et fournit le bandeau UI à
 * afficher.
 *
 * Pattern factorisé depuis StructureFormDrawer (Lot 2.5-bis-D) et
 * SegmentFormDrawer (Lot 2.5B). 3ᵉ cas concret = ProduitFormDrawer
 * (Lot 2.5C).
 *
 * Détermine `modeMajPredit` selon les règles backend (cf.
 * StructureService.update / SegmentService.update — pattern 4-cas) :
 *  - `no_op` : aucun champ modifié.
 *  - `in_place_est_actif` : seul `est_actif` modifié.
 *  - `ecrasement_intra_jour` : champ SCD2 modifié + version courante
 *    créée le jour même (`dateDebutValiditeInitiale === today`).
 *  - `nouvelle_version` : champ SCD2 modifié + version courante
 *    antérieure → une nouvelle ligne SCD2 sera créée.
 *
 * Le hook prédit côté UI ; le backend reste l'autorité finale (la
 * réponse PATCH renvoie le `modeMaj` réel, qui peut différer si
 * d'autres modifications sont survenues côté serveur entre-temps).
 */
import { useMemo } from 'react';

export type Scd2ModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

export type Scd2Bandeau =
  | { type: 'jaune'; titre: string; message: string }
  | { type: 'bleu'; titre: string; message: string }
  | { type: 'info'; titre: string; message: string }
  | null;

export interface UseScd2EditDiffParams<T> {
  /** Données originales chargées depuis le backend. */
  initial: T;
  /** Données du formulaire en édition. */
  form: T;
  /**
   * Champs trackés SCD2 — toute différence sur ces clés implique
   * une mise à jour SCD2 (intra-jour ou nouvelle version).
   */
  scd2Fields: ReadonlyArray<keyof T>;
  /**
   * Date de début de validité de la version courante (format
   * `YYYY-MM-DD`). Utilisée pour détecter le cas
   * `ecrasement_intra_jour` (date == today).
   */
  dateDebutValiditeInitiale?: string;
}

export interface UseScd2EditDiffResult<T> {
  /** Champs où `form[k]` diffère de `initial[k]`. Inclut `estActif` si modifié. */
  diff: Partial<T>;
  /** Mode d'application prédit côté UI (le backend reste autorité finale). */
  modeMajPredit: Scd2ModeMaj;
  /** Bandeau à afficher au-dessus du formulaire — null si aucune modification. */
  bandeau: Scd2Bandeau;
  /** Raccourci `modeMajPredit !== 'no_op'`. */
  aDesChangements: boolean;
}

const BANDEAUX: Record<Exclude<Scd2ModeMaj, 'no_op'>, Scd2Bandeau> = {
  in_place_est_actif: {
    type: 'bleu',
    titre: 'Mise à jour en place',
    message:
      "Modification orthogonale au SCD2 — aucune nouvelle version ne sera créée.",
  },
  ecrasement_intra_jour: {
    type: 'info',
    titre: 'Écrasement intra-jour',
    message:
      "Modification du jour : la version courante sera écrasée sans créer de nouvelle ligne historique.",
  },
  nouvelle_version: {
    type: 'jaune',
    titre: "SCD2 — Modification d'attribut historisé",
    message:
      "Une nouvelle version SCD2 sera créée. L'ancienne reste consultable dans l'historique et continue de référencer les saisies budgétaires antérieures.",
  },
};

const EST_ACTIF_KEY = 'estActif' as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useScd2EditDiff<T extends Record<string, unknown>>(
  params: UseScd2EditDiffParams<T>,
): UseScd2EditDiffResult<T> {
  const { initial, form, scd2Fields, dateDebutValiditeInitiale } = params;

  return useMemo(() => {
    const diff: Partial<T> = {};
    let scd2Touched = false;
    let estActifTouched = false;

    // Diff sur les champs SCD2-tracés.
    for (const key of scd2Fields) {
      if (form[key] !== initial[key]) {
        scd2Touched = true;
        (diff as Record<string, unknown>)[key as string] = form[key];
      }
    }

    // Diff sur estActif (orthogonal au SCD2).
    if (
      EST_ACTIF_KEY in form &&
      EST_ACTIF_KEY in initial &&
      form[EST_ACTIF_KEY] !== initial[EST_ACTIF_KEY]
    ) {
      estActifTouched = true;
      (diff as Record<string, unknown>)[EST_ACTIF_KEY] = form[EST_ACTIF_KEY];
    }

    let modeMajPredit: Scd2ModeMaj;
    if (!scd2Touched && !estActifTouched) {
      modeMajPredit = 'no_op';
    } else if (estActifTouched && !scd2Touched) {
      modeMajPredit = 'in_place_est_actif';
    } else {
      // Au moins un champ SCD2 touché : intra-jour ou nouvelle version.
      const intraJour =
        dateDebutValiditeInitiale !== undefined &&
        dateDebutValiditeInitiale === todayIsoDate();
      modeMajPredit = intraJour
        ? 'ecrasement_intra_jour'
        : 'nouvelle_version';
    }

    const bandeau: Scd2Bandeau =
      modeMajPredit === 'no_op' ? null : BANDEAUX[modeMajPredit];

    return {
      diff,
      modeMajPredit,
      bandeau,
      aDesChangements: modeMajPredit !== 'no_op',
    };
    // initial et form sont des objets shallow — la comparaison
    // d'identité React suffit pour ce cas, vu que les FormDrawers
    // recréent un nouveau form à chaque setState.
  }, [initial, form, scd2Fields, dateDebutValiditeInitiale]);
}
