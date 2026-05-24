/**
 * Types LettreMobilisationDetail (Lot 8.3.B frontend).
 *
 * Reflète exactement l'entité `lettre_mobilisation_detail` côté
 * backend. NUMERIC reçus en `string` (préserve précision pg),
 * INTEGER en `number | null`, DATE en `string` ISO 'YYYY-MM-DD'.
 * Tous les champs métier nullable (draft incomplet autorisé en
 * BROUILLON, cohérent Lots 8.2.C et 8.3.A).
 *
 * Différence métier vs D2 (LettreCadrageDetail) et D3
 * (NoteOrientationDetail) :
 *  - D2 = lettre OFFICIELLE externe avec objectifs chiffrés
 *  - D3 = note INTERNE de Direction (analyse macro + axes)
 *  - D5 = lettre MOTIVATIONNELLE DG → Directeurs APRÈS D2/D3
 *    avec indicateurs mobilisation + échéances + message DG TipTap
 */

export interface LettreMobilisationDetail {
  id: string;
  fkDocument: string;

  // En-tête lettre officielle
  referenceLettre: string | null;
  dateEmission: string | null;
  destinatairesDirections: string | null;

  // Période d'exécution
  exerciceConcerne: number | null;
  dateDebutExecution: string | null;
  dateFinExecution: string | null;

  // Objectifs globaux BSIC NIGER (NUMERIC pg → string TS)
  pnbConsolideMfcfa: string | null;
  rnConsolideMfcfa: string | null;
  croissanceCreditsGlobalePct: string | null;
  croissanceDepotsGlobalePct: string | null;

  // Indicateurs de mobilisation
  tauxParticipationVisePct: string | null;
  nbObjectifsPrioritaires: number | null;
  tauxConformiteBudgetairePct: string | null;

  // Échéances clés (5 jalons)
  dateReunionMobilisation: string | null;
  dateDebutSaisieObjectifs: string | null;
  datePremierPointAvancement: string | null;
  dateValidationFinale: string | null;
  dateCommunicationBceao: string | null;

  // Message DG (HTML riche TipTap)
  messageDgHtml: string | null;

  // Engagement attendu
  engagementAttendu: string | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourLettreMobilisationDetailDto`. `exerciceConcerne`
 * et `nbObjectifsPrioritaires` acceptent `number` (matches @IsInt
 * côté backend).
 */
export interface MettreAJourDetailLettreMobilisationDto {
  referenceLettre?: string | null;
  dateEmission?: string | null;
  destinatairesDirections?: string | null;
  exerciceConcerne?: number | null;
  dateDebutExecution?: string | null;
  dateFinExecution?: string | null;
  pnbConsolideMfcfa?: string | null;
  rnConsolideMfcfa?: string | null;
  croissanceCreditsGlobalePct?: string | null;
  croissanceDepotsGlobalePct?: string | null;
  tauxParticipationVisePct?: string | null;
  nbObjectifsPrioritaires?: number | null;
  tauxConformiteBudgetairePct?: string | null;
  dateReunionMobilisation?: string | null;
  dateDebutSaisieObjectifs?: string | null;
  datePremierPointAvancement?: string | null;
  dateValidationFinale?: string | null;
  dateCommunicationBceao?: string | null;
  messageDgHtml?: string | null;
  engagementAttendu?: string | null;
}
