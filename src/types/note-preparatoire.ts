/**
 * Types NotePreparatoireDetail (Lot 8.3.C frontend).
 *
 * Reflète exactement l'entité `note_preparatoire_detail` côté
 * backend. INTEGER en `number | null`, DATE en `string` ISO
 * 'YYYY-MM-DD'. Tous les champs métier nullable (draft incomplet
 * autorisé en BROUILLON, cohérent Lots 8.2.C / 8.3.A / 8.3.B).
 *
 * Position dans le cycle BSIC : la Note préparatoire DG est émise
 * AVANT la réunion du Comité, en début de cycle budgétaire. Elle
 * pose le contexte et l'ordre du jour de la réunion qui donnera
 * ensuite naissance à D3 puis D2 puis D5.
 *
 * Différence métier vs D2 / D3 / D5 :
 *  - D1 = NOTE PRÉPARATOIRE interne DG → Comité (en amont du cycle)
 *  - D2 = lettre OFFICIELLE externe avec objectifs chiffrés
 *  - D3 = note INTERNE de Direction (analyse macro + axes)
 *  - D5 = lettre MOTIVATIONNELLE DG → Directeurs après cadrage
 */

export interface NotePreparatoireDetail {
  id: string;
  fkDocument: string;

  // En-tête note préparatoire
  referenceNote: string | null;
  dateEmission: string | null;
  dateConvocationComite: string | null;
  lieuReunion: string | null;

  // Participants convoqués (texte multi-lignes)
  participantsConvoques: string | null;

  // Exercice budgétaire concerné
  exerciceConcerne: number | null;
  dateDebutPreparation: string | null;
  dateButoirPreparation: string | null;

  // Ordre du jour (HTML riche TipTap)
  ordreDuJourHtml: string | null;

  // Documents pré-lus attendus (texte multi-lignes)
  documentsPreLus: string | null;

  // Points clés à débattre
  pointsClesDebattre: string | null;

  // Décisions attendues
  decisionsAttendues: string | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourNotePreparatoireDetailDto`. `exerciceConcerne`
 * accepte `number` (matches @IsInt côté backend).
 */
export interface MettreAJourDetailNotePreparatoireDto {
  referenceNote?: string | null;
  dateEmission?: string | null;
  dateConvocationComite?: string | null;
  lieuReunion?: string | null;
  participantsConvoques?: string | null;
  exerciceConcerne?: number | null;
  dateDebutPreparation?: string | null;
  dateButoirPreparation?: string | null;
  ordreDuJourHtml?: string | null;
  documentsPreLus?: string | null;
  pointsClesDebattre?: string | null;
  decisionsAttendues?: string | null;
}
