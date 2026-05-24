/**
 * Types LettreCadrageDetail (Lot 8.2.C frontend).
 *
 * Reflète exactement l'entité `lettre_cadrage_detail` côté backend.
 * Tous les NUMERIC sont reçus en `string` (préserve la précision
 * exacte côté pg, pattern projet déjà acté pour BIGINT user.id).
 * Les DATE sont reçues en `string` ISO 'YYYY-MM-DD'.
 *
 * Tous les champs métier sont nullable : le DG peut sauvegarder un
 * draft incomplet en BROUILLON avant d'avoir tous les chiffres
 * définitifs (cf. décision architecturale Lot 8.2.C P1).
 */

export interface LettreCadrageDetail {
  id: string;
  fkDocument: string;

  // En-tête Holding
  referenceHolding: string | null;
  dateEmissionHolding: string | null;
  signataireHolding: string | null;

  // Objectifs quantitatifs (NUMERIC pg → string TS)
  pnbCibleMfcfa: string | null;
  rnCibleMfcfa: string | null;
  croissanceCreditsPct: string | null;
  croissanceDepotsPct: string | null;
  coefficientExploitationPct: string | null;
  roeCiblePct: string | null;

  // Ratios prudentiels BCEAO
  ratioSolvabiliteMinPct: string | null;
  ratioLiquiditeMinPct: string | null;
  ratioDivisionRisquesPct: string | null;

  // Calendrier budgétaire (5 jalons)
  dateDebutSaisie: string | null;
  dateLimiteSaisieCr: string | null;
  dateValidationDga: string | null;
  dateValidationDg: string | null;
  datePublicationBceao: string | null;

  // Orientations stratégiques (texte libre max 2000 chars)
  orientationsStrategiques: string | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourLettreCadrageDetailDto`.
 */
export interface MettreAJourDetailCadrageDto {
  referenceHolding?: string | null;
  dateEmissionHolding?: string | null;
  signataireHolding?: string | null;
  pnbCibleMfcfa?: string | null;
  rnCibleMfcfa?: string | null;
  croissanceCreditsPct?: string | null;
  croissanceDepotsPct?: string | null;
  coefficientExploitationPct?: string | null;
  roeCiblePct?: string | null;
  ratioSolvabiliteMinPct?: string | null;
  ratioLiquiditeMinPct?: string | null;
  ratioDivisionRisquesPct?: string | null;
  dateDebutSaisie?: string | null;
  dateLimiteSaisieCr?: string | null;
  dateValidationDga?: string | null;
  dateValidationDg?: string | null;
  datePublicationBceao?: string | null;
  orientationsStrategiques?: string | null;
}
