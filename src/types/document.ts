/**
 * Types DocumentOfficiel + workflow visa/signature (Lot 8.2.B).
 *
 * Pattern hérité Lot 8.2.A : DTOs en camelCase (alignement Lot 8.1.B),
 * réutilisation de `UserResume` exporté par `types/campagne.ts` (vue
 * sécurisée sans `motDePasseHash` — règle projet "sérialisation
 * manuelle" cf. hotfix Lot 8.2.A backend).
 *
 * Workflow : BROUILLON → SOUMIS_VISA → VISE → SIGNE (→ ARCHIVE).
 */

import type { UserResume } from './campagne';
import type { LettreCadrageDetail } from './lettre-cadrage';
import type { LettreMobilisationDetail } from './lettre-mobilisation';
import type { NoteOrientationDetail } from './note-orientation';
import type { NotePreparatoireDetail } from './note-preparatoire';
import type { PvApprobationDetail } from './pv-approbation';

export type StatutDocument =
  | 'BROUILLON'
  | 'SOUMIS_VISA'
  | 'VISE'
  | 'SIGNE'
  | 'ARCHIVE';

export type TypeDocument =
  | 'D1_NOTE_PREPARATOIRE'
  | 'D2_LETTRE_CADRAGE'
  | 'D3_NOTE_ORIENTATION'
  | 'D5_LETTRE_DG'
  | 'R3_BORDEREAU_VALIDATION'
  | 'R5_BORDEREAU_REJET'
  | 'D11_PV_APPROBATION'
  | 'D12_LETTRE_OFFICIALISATION';

export type StatutVisa = 'EN_ATTENTE' | 'VISE' | 'REJETE' | 'IGNORE';

export type ActionVisa = 'VISER' | 'REJETER';

export interface DocumentVisaResume {
  id: string;
  fkUserViseur: string;
  ordreVisa: number;
  estObligatoire: boolean;
  libelleFonction: string | null;
  statut: StatutVisa;
  dateAction: string | null;
  commentaire: string | null;
  /** Enrichi par backend (mapping vers vue allégée sans motDePasseHash). */
  user?: UserResume;
}

export interface DocumentSignatureResume {
  id: string;
  fkUserSignataire: string;
  emailSignataire: string;
  nomSignataire: string;
  dateSignature: string;
  hashContenu: string;
  hashVisas: string;
  ipSignature: string | null;
  methodeAuthentification: string;
}

export interface DocumentOfficiel {
  id: string;
  codeDocument: string;
  typeDocument: TypeDocument;
  fkCampagne: string | null;
  titre: string;
  contenuHtml: string;
  referenceExterne: string | null;
  statut: StatutDocument;
  fkUserEmetteur: string;
  fkUserSignataire: string;
  dateCreation: string;
  dateModification: string | null;
  dateSoumissionVisa: string | null;
  dateVisaComplet: string | null;
  dateSignature: string | null;
  fichierJointPath: string | null;
  fichierJointNom: string | null;
  /** Enrichissements backend (vues sécurisées). */
  emetteur?: UserResume;
  signataire?: UserResume;
  visas?: DocumentVisaResume[];
  signature?: DocumentSignatureResume;
  /**
   * Lot 8.2.C — détail métier structuré, présent UNIQUEMENT pour les
   * documents de type `D2_LETTRE_CADRAGE`. `null` si type ≠ D2 ou si
   * le DG n'a pas encore renseigné le détail (BROUILLON fraîchement
   * créé). Chargé conditionnellement par le backend
   * `detailDocument` pour éviter un round-trip sur les autres types.
   */
  lettreCadrageDetail?: LettreCadrageDetail | null;
  /**
   * Lot 8.3.A — détail métier structuré, présent UNIQUEMENT pour les
   * documents de type `D3_NOTE_ORIENTATION` (note interne avec analyse
   * macro + axes stratégiques + description riche HTML TipTap).
   */
  noteOrientationDetail?: NoteOrientationDetail | null;
  /**
   * Lot 8.3.B — détail métier structuré, présent UNIQUEMENT pour les
   * documents de type `D5_LETTRE_DG` (lettre motivationnelle DG →
   * Directeurs avec objectifs globaux + indicateurs mobilisation +
   * échéances + message DG TipTap, libellée "Lettre de mobilisation").
   */
  lettreMobilisationDetail?: LettreMobilisationDetail | null;
  /**
   * Lot 8.3.C — détail métier structuré, présent UNIQUEMENT pour les
   * documents de type `D1_NOTE_PREPARATOIRE` (note préparatoire DG
   * émise AVANT la réunion du Comité en début de cycle budgétaire).
   */
  notePreparatoireDetail?: NotePreparatoireDetail | null;
  /**
   * Lot 8.3.D — détail métier structuré, présent UNIQUEMENT pour les
   * documents de type `D11_PV_APPROBATION` (PV d'approbation du
   * Conseil d'Administration, émis APRÈS la signature de D2 — acte
   * officiel d'approbation budgétaire).
   *
   * **Exclusion mutuelle stricte** entre les 5 détails métier
   * (`lettreCadrageDetail` / `noteOrientationDetail` /
   * `lettreMobilisationDetail` / `notePreparatoireDetail` /
   * `pvApprobationDetail`) : au plus UN des 5 est non-null pour un
   * document donné (déterminé par `typeDocument`).
   */
  pvApprobationDetail?: PvApprobationDetail | null;
}

export interface DocumentHistoriqueEvenement {
  etape:
    | 'CREATION'
    | 'EDITION'
    | 'SOUMISSION'
    | 'VISA'
    | 'REJET'
    | 'SIGNATURE';
  date: string;
  acteur: string;
  libelle: string;
  commentaire: string | null;
}

export interface DocumentVerificationIntegrite {
  documentId: string;
  signaturePresente: boolean;
  contenuIntact: boolean;
  visasIntacts: boolean;
  dateSignature: string | null;
  signataireSnapshot: { email: string; nom: string } | null;
}

// ─── Libellés FR pour l'UI ───────────────────────────────────────────

export const STATUT_DOCUMENT_LABEL: Record<StatutDocument, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS_VISA: 'Soumis au visa',
  VISE: 'Visé',
  SIGNE: 'Signé',
  ARCHIVE: 'Archivé',
};

export const TYPE_DOCUMENT_LABEL: Record<TypeDocument, string> = {
  D1_NOTE_PREPARATOIRE: 'Note préparatoire DG',
  D2_LETTRE_CADRAGE: 'Lettre de cadrage',
  D3_NOTE_ORIENTATION: "Note d'orientation",
  D5_LETTRE_DG: 'Lettre de mobilisation',
  R3_BORDEREAU_VALIDATION: 'Bordereau validation',
  R5_BORDEREAU_REJET: 'Bordereau rejet',
  D11_PV_APPROBATION: "PV d'approbation",
  D12_LETTRE_OFFICIALISATION: "Lettre d'officialisation",
};

export const STATUT_VISA_LABEL: Record<StatutVisa, string> = {
  EN_ATTENTE: 'En attente',
  VISE: 'Visé',
  REJETE: 'Rejeté',
  IGNORE: 'Ignoré',
};
