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
  DocumentSignatureResume,
  DocumentVerificationIntegrite,
  DocumentVisaResume,
  StatutDocument,
  TypeDocument,
} from '@/types/document';

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
  confirmationConsciente: boolean;
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
 * ⚠️ Adaptation Lot 8.2.B P2 : le backend
 * `DocumentWorkflowService.detailDocument` retourne actuellement
 * `{ document, visas, signature }` (structure nestée) au lieu d'un
 * objet aplati `Document & { visas, signature }`. Pattern obsolète
 * identique au bug `campagne.service.detailCampagne` pré-hotfix
 * Lot 8.2.A. On aplatit ici au boundary pour que le composant utilise
 * le type strict `DocumentOfficiel` du contrat frontend.
 *
 * TODO Lot 8.x : hotfix backend symétrique au fix `campagne.service`
 * pour homogénéiser le contrat API (aplatissement + relations
 * emetteur/signataire enrichies via mapping `UserResume` sécurisé).
 */
export async function detailDocument(id: string): Promise<DocumentOfficiel> {
  const { data } = await apiClient.get<{
    document: DocumentOfficiel;
    visas: DocumentVisaResume[];
    signature: DocumentSignatureResume | null;
  }>(`/documents/${id}`);
  return {
    ...data.document,
    visas: data.visas,
    signature: data.signature ?? undefined,
  };
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
