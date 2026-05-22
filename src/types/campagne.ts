/**
 * Types Campagne Budgétaire (Lot 8.2.A).
 *
 * Une campagne = un cycle annuel de production des documents officiels
 * (lettre cadrage, notes, PV, etc.) avec workflow visa / signature.
 * Backend : table `campagne_budgetaire` (Lot 8.1.A).
 *
 * Convention API : DTOs en camelCase (décision Lot 8.1.B). Les noms
 * de champs ici miment exactement ceux du backend pour permettre une
 * désérialisation directe d'axios sans transformation.
 *
 * 4 statuts du workflow :
 *   PARAMETRAGE → EN_COURS → TERMINEE → ARCHIVEE
 */

export type StatutCampagne =
  | 'PARAMETRAGE'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'ARCHIVEE';

export type ModeVisa = 'PARALLELE' | 'SEQUENTIEL';

/**
 * Résumé d'un user enrichi par le backend (signataire défaut, membres
 * comité). BIGINT côté DB → string côté JSON (alignement Lot 8.1.B).
 */
export interface UserResume {
  id: string;
  email: string;
  nom: string;
  prenom: string;
}

export interface Campagne {
  id: string;
  code: string;
  exerciceFiscal: number;
  libelle: string;
  statut: StatutCampagne;
  modeVisaDefaut: ModeVisa;
  fkUserSignataireDefaut: string;
  dateCreation: string;
  dateLancement: string | null;
  dateFin: string | null;
  utilisateurCreation: string;
  utilisateurModification: string | null;
  dateModification: string | null;
  /** Présent si le backend enrichit (GET /campagnes — Lot 8.1.C). */
  signataireDefaut?: UserResume;
  /** Présent si le backend compte (GET /campagnes liste). */
  nombreMembres?: number;
}

export interface ComiteMembre {
  id: string;
  fkCampagne: string;
  fkUser: string;
  ordre: number;
  estObligatoire: boolean;
  libelleFonction: string | null;
  dateCreation: string;
  /** Enrichissement backend (GET /campagnes/:id). */
  user?: UserResume;
}
