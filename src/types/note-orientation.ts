/**
 * Types NoteOrientationDetail (Lot 8.3.A frontend).
 *
 * Reflète exactement l'entité `note_orientation_detail` côté backend.
 * NUMERIC reçus en `string` (préserve précision pg), DATE en `string`
 * ISO 'YYYY-MM-DD'. Tous les champs métier nullable (draft incomplet
 * autorisé en BROUILLON, cohérent Lot 8.2.C).
 *
 * Différence métier D2 (LettreCadrageDetail) vs D3 (ce fichier) :
 *  - D2 = lettre OFFICIELLE externe avec objectifs chiffrés
 *  - D3 = note INTERNE de Direction avec analyse macro + axes
 *    stratégiques + description riche HTML TipTap
 */

export interface NoteOrientationDetail {
  id: string;
  fkDocument: string;

  // En-tête note interne
  numeroNote: string | null;
  dateEmission: string | null;
  emetteurDirection: string | null;
  destinataire: string | null;

  // Période d'application
  exerciceConcerne: number | null;
  dateDebutApplication: string | null;
  dateFinApplication: string | null;

  // Hypothèses macroéconomiques (NUMERIC pg → string TS)
  tauxDirecteurBceaoPct: string | null;
  inflationNigerPct: string | null;
  croissancePibNigerPct: string | null;
  tauxChangeUsdFcfa: string | null;
  coursPetroleUsd: string | null;

  // Positionnement marché
  partMarcheActuellePct: string | null;
  partMarcheCiblePct: string | null;
  principauxConcurrents: string | null;
  avantagesCompetitifs: string | null;

  // Axes stratégiques (4 axes)
  axeDigitalisation: string | null;
  axeDeveloppementPme: string | null;
  axeInclusionFinanciere: string | null;
  axeAutresPriorites: string | null;

  // Description riche (HTML TipTap)
  descriptionDetailleeHtml: string | null;

  // Recommandations
  recommandations: string | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourNoteOrientationDetailDto`. `exerciceConcerne`
 * accepte `number` (correspond à @IsInt côté backend).
 */
export interface MettreAJourDetailNoteOrientationDto {
  numeroNote?: string | null;
  dateEmission?: string | null;
  emetteurDirection?: string | null;
  destinataire?: string | null;
  exerciceConcerne?: number | null;
  dateDebutApplication?: string | null;
  dateFinApplication?: string | null;
  tauxDirecteurBceaoPct?: string | null;
  inflationNigerPct?: string | null;
  croissancePibNigerPct?: string | null;
  tauxChangeUsdFcfa?: string | null;
  coursPetroleUsd?: string | null;
  partMarcheActuellePct?: string | null;
  partMarcheCiblePct?: string | null;
  principauxConcurrents?: string | null;
  avantagesCompetitifs?: string | null;
  axeDigitalisation?: string | null;
  axeDeveloppementPme?: string | null;
  axeInclusionFinanciere?: string | null;
  axeAutresPriorites?: string | null;
  descriptionDetailleeHtml?: string | null;
  recommandations?: string | null;
}
