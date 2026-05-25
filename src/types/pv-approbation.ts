/**
 * Types PvApprobationDetail (Lot 8.3.D frontend).
 *
 * Reflète exactement l'entité `pv_approbation_detail` côté backend.
 * INTEGER en `number | null`, DATE en `string` ISO 'YYYY-MM-DD',
 * BOOLEAN en `boolean | null`. Tous les champs métier nullable
 * (draft incomplet autorisé en BROUILLON, cohérent Lots 8.2.C /
 * 8.3.A / 8.3.B / 8.3.C).
 *
 * Position dans le cycle BSIC : le PV CA est émis APRÈS la
 * signature de D2 (Lettre de cadrage). C'est l'acte officiel par
 * lequel le Conseil d'Administration approuve formellement le
 * budget cadré par la DG.
 *
 * Cycle complet : **D1 (Note préparatoire DG) → D3 (Orientation
 * Comité) → D2 (Cadrage Directeurs CR) → D5 (Mobilisation tous
 * Directeurs) → D11 (PV d'approbation CA)**.
 *
 * Particularités D11 :
 *  - 1 BOOLEAN (quorumAtteint) — 1er BOOLEAN des détails métier
 *  - 1 enum textuelle (voteResultat avec 3 valeurs)
 *  - 2 colonnes TipTap (ordreDuJourHtml + decisionsHtml)
 */

/**
 * Valeurs autorisées pour le résultat de vote — alignées avec
 * l'enum côté backend `VOTE_RESULTATS_VALIDES` (CHECK SQL
 * `ck_vote_resultat_valide_pv` + `@IsIn` DTO).
 */
export const VOTE_RESULTATS_VALIDES = [
  'UNANIMITE',
  'MAJORITE',
  'REJETE',
] as const;

export type VoteResultat = (typeof VOTE_RESULTATS_VALIDES)[number];

/** Libellés FR pour l'UI (Select + Aperçu). */
export const VOTE_RESULTAT_LABEL: Record<VoteResultat, string> = {
  UNANIMITE: 'Unanimité',
  MAJORITE: 'Majorité',
  REJETE: 'Rejeté',
};

export interface PvApprobationDetail {
  id: string;
  fkDocument: string;

  // Identification du PV
  numeroResolution: string | null;
  dateSeanceCa: string | null;
  lieuSeance: string | null;

  // Présidence de séance
  presidentSeance: string | null;
  secretaireSeance: string | null;

  // Quorum
  nbAdministrateursPresents: number | null;
  nbAdministrateursTotal: number | null;
  quorumAtteint: boolean | null;

  // Ordre du jour (HTML riche TipTap)
  ordreDuJourHtml: string | null;

  // Décisions adoptées (HTML riche TipTap)
  decisionsHtml: string | null;

  // Vote
  voteResultat: VoteResultat | null;
  commentairePresident: string | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourPvApprobationDetailDto`.
 * `nbAdministrateursPresents` et `nbAdministrateursTotal` acceptent
 * `number` (matches @IsInt côté backend).
 */
export interface MettreAJourDetailPvApprobationDto {
  numeroResolution?: string | null;
  dateSeanceCa?: string | null;
  lieuSeance?: string | null;
  presidentSeance?: string | null;
  secretaireSeance?: string | null;
  nbAdministrateursPresents?: number | null;
  nbAdministrateursTotal?: number | null;
  quorumAtteint?: boolean | null;
  ordreDuJourHtml?: string | null;
  decisionsHtml?: string | null;
  voteResultat?: VoteResultat | null;
  commentairePresident?: string | null;
}
