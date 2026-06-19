/**
 * Agrégation des faits budgétaires d'un CR par couple (compte PCB ×
 * ligne métier). Primitive partagée entre :
 *   - DetailCrModal (vue plate : 1 ligne par couple compte × LM) ;
 *   - ImpressionCrPage (vue pivot : comptes en lignes, LM en colonnes).
 *
 * Discipline : aucune valeur inventée. Un fait sans compte/LM résolu
 * retombe sur le marqueur « — » ; une cellule (compte × LM) absente du
 * pivot n'apparaît pas dans `montants` (le consommateur affiche « — »).
 */
import type { FaitBudget } from '@/lib/api/budget';

export const PLACEHOLDER_VIDE = '—';

export interface RefCompte {
  code: string;
  libelle: string;
}

export interface RefLigneMetier {
  code: string;
  libelle: string;
}

export interface CelluleAgregee {
  compteCode: string;
  compteLibelle: string;
  lmCode: string;
  lmLibelle: string;
  montant: number;
}

export interface AgregationCr {
  /** Cellules (compte × LM) agrégées, triées par compte puis LM. */
  cellules: CelluleAgregee[];
  /** Comptes distincts présents, triés par code. */
  comptes: RefCompte[];
  /** Lignes métier distinctes présentes (colonnes du pivot), triées. */
  lignesMetier: RefLigneMetier[];
}

const triCode = (a: string, b: string): number => a.localeCompare(b);

/**
 * Agrège une liste de faits budgétaires par (compte × ligne métier).
 * Plusieurs faits sur le même couple sont sommés (`montantDevise`).
 */
export function agregerFaitsParCompteLigneMetier(
  faits: FaitBudget[],
): AgregationCr {
  const cellules = new Map<string, CelluleAgregee>();
  const comptes = new Map<string, RefCompte>();
  const lignesMetier = new Map<string, RefLigneMetier>();

  for (const f of faits) {
    const compteCode = f.compte?.code ?? PLACEHOLDER_VIDE;
    const compteLibelle = f.compte?.libelle ?? PLACEHOLDER_VIDE;
    const lmCode = f.ligneMetier?.code ?? PLACEHOLDER_VIDE;
    const lmLibelle = f.ligneMetier?.libelle ?? PLACEHOLDER_VIDE;

    const cle = `${compteCode}|${lmCode}`;
    const prev = cellules.get(cle);
    if (prev) {
      prev.montant += f.montantDevise;
    } else {
      cellules.set(cle, {
        compteCode,
        compteLibelle,
        lmCode,
        lmLibelle,
        montant: f.montantDevise,
      });
    }
    if (!comptes.has(compteCode)) {
      comptes.set(compteCode, { code: compteCode, libelle: compteLibelle });
    }
    if (!lignesMetier.has(lmCode)) {
      lignesMetier.set(lmCode, { code: lmCode, libelle: lmLibelle });
    }
  }

  return {
    cellules: [...cellules.values()].sort(
      (a, b) => triCode(a.compteCode, b.compteCode) || triCode(a.lmCode, b.lmCode),
    ),
    comptes: [...comptes.values()].sort((a, b) => triCode(a.code, b.code)),
    lignesMetier: [...lignesMetier.values()].sort((a, b) =>
      triCode(a.code, b.code),
    ),
  };
}

export interface LignePivot {
  compteCode: string;
  compteLibelle: string;
  /** Montant par code LM (clé = lmCode). Couple absent ⇒ clé absente. */
  montants: Record<string, number>;
  /** Somme horizontale de la ligne. */
  totalLigne: number;
}

export interface PivotCr {
  /** Colonnes dynamiques (lignes métier présentes). */
  lignesMetier: RefLigneMetier[];
  /** Lignes du tableau (un compte par ligne). */
  lignes: LignePivot[];
  /** Totaux verticaux par code LM. */
  totauxParLm: Record<string, number>;
  /** Total général (somme de tous les totaux colonne). */
  totalGeneral: number;
}

/**
 * Dérive la vue pivot (comptes × lignes métier) depuis l'agrégation :
 * une ligne par compte, une colonne par LM, totaux ligne/colonne/général.
 */
export function construirePivotCr(agg: AgregationCr): PivotCr {
  const index = new Map<string, number>();
  for (const c of agg.cellules) {
    index.set(`${c.compteCode}|${c.lmCode}`, c.montant);
  }

  const totauxParLm: Record<string, number> = {};
  for (const lm of agg.lignesMetier) totauxParLm[lm.code] = 0;

  const lignes: LignePivot[] = agg.comptes.map((cpt) => {
    const montants: Record<string, number> = {};
    let totalLigne = 0;
    for (const lm of agg.lignesMetier) {
      const m = index.get(`${cpt.code}|${lm.code}`);
      if (m !== undefined) {
        montants[lm.code] = m;
        totalLigne += m;
        totauxParLm[lm.code] += m;
      }
    }
    return {
      compteCode: cpt.code,
      compteLibelle: cpt.libelle,
      montants,
      totalLigne,
    };
  });

  const totalGeneral = Object.values(totauxParLm).reduce((s, v) => s + v, 0);
  return { lignesMetier: agg.lignesMetier, lignes, totauxParLm, totalGeneral };
}
