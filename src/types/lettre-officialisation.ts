/**
 * Types LettreOfficialisationDetail (Lot 8.3.E frontend).
 *
 * Reflète exactement l'entité `lettre_officialisation_detail` côté
 * backend. DATE en `string` ISO 'YYYY-MM-DD', BOOLEAN en
 * `boolean | null`. Tous les champs métier nullable (draft incomplet
 * autorisé en BROUILLON, cohérent Lots précédents).
 *
 * Position dans le cycle BSIC : la Lettre d'officialisation est
 * émise APRÈS la signature du PV CA (D11). Elle notifie l'approbation
 * du budget aux parties prenantes (équipe direction, filiales,
 * BCEAO, CREPMF, holding, etc.) et marque l'entrée en vigueur
 * officielle.
 *
 * Cycle complet : **D1 (Note préparatoire DG) → D3 (Orientation
 * Comité) → D2 (Cadrage Directeurs CR) → D5 (Mobilisation tous
 * Directeurs) → D11 (PV d'approbation CA) → D12 (Lettre
 * d'officialisation)**.
 *
 * Particularités D12 :
 *  - 1 colonne TipTap (corpsHtml) — pas 2 comme D11
 *  - 1 BOOLEAN (cachetAppose) — 2e du projet après quorumAtteint D11
 *  - referencePvCa = texte libre VARCHAR(100), aucun format imposé
 *    (Option A actée : pas de FK frontend → backend)
 */

export interface LettreOfficialisationDetail {
  id: string;
  fkDocument: string;

  // Identification de la lettre
  numeroLettre: string | null;
  dateEmission: string | null;
  objet: string | null;

  // Référence PV CA (texte libre)
  referencePvCa: string | null;

  // Destinataires
  destinatairesPrincipaux: string | null;
  destinatairesCopies: string | null;
  piecesJointes: string | null;

  // Corps de la lettre (HTML riche TipTap)
  corpsHtml: string | null;

  // Signature & officialisation
  signataire: string | null;
  dateEntreeVigueur: string | null;
  cachetAppose: boolean | null;

  // Audit
  dateCreation: string;
  dateModification: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
}

/**
 * DTO d'upsert (tous champs optionnels) — aligné DTO backend
 * `CreerOuMettreAJourLettreOfficialisationDetailDto`.
 */
export interface MettreAJourDetailLettreOfficialisationDto {
  numeroLettre?: string | null;
  dateEmission?: string | null;
  objet?: string | null;
  referencePvCa?: string | null;
  destinatairesPrincipaux?: string | null;
  destinatairesCopies?: string | null;
  piecesJointes?: string | null;
  corpsHtml?: string | null;
  signataire?: string | null;
  dateEntreeVigueur?: string | null;
  cachetAppose?: boolean | null;
}
