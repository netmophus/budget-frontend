/**
 * Client API Documents officiels (Lot 8.2.B) — consomme les
 * 9 endpoints `/documents` + 2 endpoints fichier livrés par les
 * Lots 8.1.B (workflow) à 8.1.D (upload PDF).
 *
 * Convention projet : fonctions nommées exportées directement
 * (cohérent avec `lib/api/versions.ts`, `lib/api/campagnes.ts`).
 */
import { apiClient } from './client';
import type {
  ActionVisa,
  DocumentHistoriqueEvenement,
  DocumentOfficiel,
  DocumentVerificationIntegrite,
  StatutDocument,
  TypeDocument,
} from '@/types/document';
import type {
  LettreCadrageDetail,
  MettreAJourDetailCadrageDto,
} from '@/types/lettre-cadrage';
import type {
  LettreMobilisationDetail,
  MettreAJourDetailLettreMobilisationDto,
} from '@/types/lettre-mobilisation';
import type {
  MettreAJourDetailNoteOrientationDto,
  NoteOrientationDetail,
} from '@/types/note-orientation';

export interface CreerDocumentDto {
  codeDocument: string;
  typeDocument: TypeDocument;
  fkCampagne: string;
  titre: string;
  contenuHtml: string;
  referenceExterne?: string;
  fkUserSignataire: string;
  fkVersionBudget?: string;
}

export interface EditerDocumentDto {
  titre?: string;
  contenuHtml?: string;
  referenceExterne?: string;
}

export interface ListerDocumentsQuery {
  statut?: StatutDocument;
  typeDocument?: TypeDocument;
  fkCampagne?: string;
  monRole?: 'emetteur' | 'viseur_en_attente' | 'signataire';
}

export interface ApporterVisaDto {
  action: ActionVisa;
  commentaire?: string;
}

export interface SignerDocumentDto {
  motDePasse: string;
}

export interface UploadFichierResult {
  documentId: string;
  fichierNom: string;
  fichierTaille: number;
  dateUpload: string;
}

export async function listerDocuments(
  query?: ListerDocumentsQuery,
): Promise<DocumentOfficiel[]> {
  const { data } = await apiClient.get<DocumentOfficiel[]>('/documents', {
    params: query,
  });
  return data;
}

/**
 * Détail enrichi d'un document.
 *
 * Lot 8.1.E Palier 2 : le backend `DocumentWorkflowService.detailDocument`
 * renvoie désormais l'objet APLATI `{ ...document, emetteur, signataire,
 * visas, signature }` directement (symétrique au hotfix `detailCampagne`
 * Lot 8.2.A). Le mapping de compensation côté client a été supprimé —
 * on retourne `data` tel quel.
 */
export async function detailDocument(id: string): Promise<DocumentOfficiel> {
  const { data } = await apiClient.get<DocumentOfficiel>(`/documents/${id}`);
  return data;
}

export async function creerDocument(
  dto: CreerDocumentDto,
): Promise<DocumentOfficiel> {
  const { data } = await apiClient.post<DocumentOfficiel>('/documents', dto);
  return data;
}

export async function editerDocument(
  id: string,
  dto: EditerDocumentDto,
): Promise<DocumentOfficiel> {
  const { data } = await apiClient.patch<DocumentOfficiel>(
    `/documents/${id}`,
    dto,
  );
  return data;
}

export async function soumettreVisa(id: string): Promise<DocumentOfficiel> {
  const { data } = await apiClient.post<DocumentOfficiel>(
    `/documents/${id}/soumettre`,
  );
  return data;
}

export async function apporterVisa(
  id: string,
  dto: ApporterVisaDto,
): Promise<DocumentOfficiel> {
  const { data } = await apiClient.post<DocumentOfficiel>(
    `/documents/${id}/visa`,
    dto,
  );
  return data;
}

export async function signerDocument(
  id: string,
  dto: SignerDocumentDto,
): Promise<DocumentOfficiel> {
  const { data } = await apiClient.post<DocumentOfficiel>(
    `/documents/${id}/signer`,
    dto,
  );
  return data;
}

export async function historiqueDocument(id: string): Promise<{
  documentId: string;
  evenements: DocumentHistoriqueEvenement[];
}> {
  const { data } = await apiClient.get<{
    documentId: string;
    evenements: DocumentHistoriqueEvenement[];
  }>(`/documents/${id}/historique`);
  return data;
}

export async function verifierIntegrite(
  id: string,
): Promise<DocumentVerificationIntegrite> {
  const { data } = await apiClient.get<DocumentVerificationIntegrite>(
    `/documents/${id}/integrite`,
  );
  return data;
}

/**
 * Upload PDF (multipart, 10 MB max côté backend, MIME + magic bytes
 * filtrés en service). Le backend retourne 200 (pas 201) — modification
 * d'un document existant, pas création.
 */
export async function uploadFichierDocument(
  id: string,
  fichier: File,
): Promise<UploadFichierResult> {
  const formData = new FormData();
  formData.append('fichier', fichier);
  const { data } = await apiClient.post<UploadFichierResult>(
    `/documents/${id}/upload-fichier`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/**
 * Download du PDF en Blob (responseType blob obligatoire — axios
 * sinon décode binaire en string et corrompt le fichier).
 */
export async function telechargerFichierDocument(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/documents/${id}/fichier`, {
    responseType: 'blob',
  });
  return data;
}

// ─── Lot 8.2.C — détail métier Lettre de cadrage ────────────────────

/**
 * Lit le détail métier d'une Lettre de cadrage (objectifs PNB/RN,
 * ratios BCEAO, calendrier, orientations). Retourne `null` si pas
 * encore renseigné (BROUILLON fraîchement créé).
 */
export async function lireDetailCadrage(
  documentId: string,
): Promise<LettreCadrageDetail | null> {
  const { data } = await apiClient.get<LettreCadrageDetail | null>(
    `/documents/${documentId}/cadrage-detail`,
  );
  return data;
}

/**
 * UPSERT du détail métier (PUT idempotent). Le backend valide les
 * pré-requis métier (type === D2, statut === BROUILLON, user ===
 * émetteur).
 */
export async function mettreAJourDetailCadrage(
  documentId: string,
  dto: MettreAJourDetailCadrageDto,
): Promise<LettreCadrageDetail> {
  const { data } = await apiClient.put<LettreCadrageDetail>(
    `/documents/${documentId}/cadrage-detail`,
    dto,
  );
  return data;
}

// ─── Lot 8.3.A — détail métier Note d'orientation ───────────────────

/**
 * Lit le détail métier d'une Note d'orientation (hypothèses macro,
 * positionnement marché, axes stratégiques, description riche
 * TipTap, recommandations). Retourne `null` si pas encore renseigné.
 */
export async function lireDetailNoteOrientation(
  documentId: string,
): Promise<NoteOrientationDetail | null> {
  const { data } = await apiClient.get<NoteOrientationDetail | null>(
    `/documents/${documentId}/note-orientation-detail`,
  );
  return data;
}

/**
 * UPSERT du détail métier (PUT idempotent). Backend valide pré-requis
 * métier (type === D3, statut === BROUILLON, user === émetteur).
 */
export async function mettreAJourDetailNoteOrientation(
  documentId: string,
  dto: MettreAJourDetailNoteOrientationDto,
): Promise<NoteOrientationDetail> {
  const { data } = await apiClient.put<NoteOrientationDetail>(
    `/documents/${documentId}/note-orientation-detail`,
    dto,
  );
  return data;
}

// ─── Lot 8.3.B — détail métier Lettre de mobilisation ───────────────

/**
 * Lit le détail métier d'une Lettre de mobilisation (objectifs
 * globaux, indicateurs mobilisation, échéances, message DG TipTap,
 * engagement). Retourne `null` si pas encore renseigné.
 */
export async function lireDetailLettreMobilisation(
  documentId: string,
): Promise<LettreMobilisationDetail | null> {
  const { data } = await apiClient.get<LettreMobilisationDetail | null>(
    `/documents/${documentId}/lettre-mobilisation-detail`,
  );
  return data;
}

/**
 * UPSERT du détail métier (PUT idempotent). Backend valide pré-requis
 * métier (type === D5, statut === BROUILLON, user === émetteur).
 */
export async function mettreAJourDetailLettreMobilisation(
  documentId: string,
  dto: MettreAJourDetailLettreMobilisationDto,
): Promise<LettreMobilisationDetail> {
  const { data } = await apiClient.put<LettreMobilisationDetail>(
    `/documents/${documentId}/lettre-mobilisation-detail`,
    dto,
  );
  return data;
}
