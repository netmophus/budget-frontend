import { apiClient } from './client';
import type { PaginatedResponse } from './types';

export type TypeVersion =
  | 'budget_initial'
  | 'reforecast_1'
  | 'reforecast_2'
  | 'atterrissage';

export type StatutVersion = 'ouvert' | 'soumis' | 'valide' | 'gele';

export interface Version {
  id: string;
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion;
  exerciceFiscal: number;
  statut: StatutVersion;
  dateGel: string | null;
  utilisateurGel: string | null;
  commentaire: string | null;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
  // Workflow Lot 3.5 — 4 commentaires + traces (date+user) par
  // transition. dateGel/utilisateurGel ci-dessus jouent le rôle de
  // date_publication/utilisateur_publication.
  commentaireSoumission: string | null;
  commentaireValidation: string | null;
  commentaireRejet: string | null;
  commentairePublication: string | null;
  dateSoumission: string | null;
  utilisateurSoumission: string | null;
  dateValidation: string | null;
  utilisateurValidation: string | null;
  dateRejet: string | null;
  utilisateurRejet: string | null;
}

/** Vocabulaire UI : libellé d'affichage par statut DB. */
export const STATUT_VERSION_LABEL: Record<StatutVersion, string> = {
  ouvert: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  gele: 'Publié',
};

/**
 * Réponse étendue de POST /referentiels/versions (Lot 3.2) — porte le
 * code du scénario auto-créé par le hook Q9 si l'exercice n'avait
 * aucun scénario rattaché. Null sinon.
 */
export interface CreateVersionResponse extends Version {
  scenarioAutoCreeCode: string | null;
}

export interface ListVersionsQuery {
  exerciceFiscal?: number;
  statut?: StatutVersion;
  typeVersion?: TypeVersion;
  page?: number;
  limit?: number;
}

export interface CreateVersionDto {
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion;
  exerciceFiscal: number;
  commentaire?: string;
}

export interface UpdateVersionDto {
  libelle?: string;
  typeVersion?: TypeVersion;
  exerciceFiscal?: number;
  commentaire?: string;
}

export async function listVersions(
  query: ListVersionsQuery = {},
): Promise<PaginatedResponse<Version>> {
  const { data } = await apiClient.get<PaginatedResponse<Version>>(
    '/referentiels/versions',
    { params: query },
  );
  return data;
}

export async function getVersionById(id: string): Promise<Version> {
  const { data } = await apiClient.get<Version>(
    `/referentiels/versions/${id}`,
  );
  return data;
}

export async function getVersionByCode(codeVersion: string): Promise<Version> {
  const { data } = await apiClient.get<Version>(
    `/referentiels/versions/par-code/${codeVersion}`,
  );
  return data;
}

export async function createVersion(
  dto: CreateVersionDto,
): Promise<CreateVersionResponse> {
  const { data } = await apiClient.post<CreateVersionResponse>(
    '/referentiels/versions',
    dto,
  );
  return data;
}

export async function updateVersion(
  id: string,
  dto: UpdateVersionDto,
): Promise<Version> {
  const { data } = await apiClient.patch<Version>(
    `/referentiels/versions/${id}`,
    dto,
  );
  return data;
}

export async function deleteVersion(id: string): Promise<void> {
  await apiClient.delete(`/referentiels/versions/${id}`);
}

// ─── Workflow de validation budgétaire (Lot 3.5) ────────────────────

export interface SoumettreVersionDto {
  /** Optionnel — note pour le contrôleur. */
  commentaire?: string;
}

export interface ValiderVersionDto {
  commentaire?: string;
}

/** Le commentaire de rejet est OBLIGATOIRE côté API (BadRequest sinon). */
export interface RejeterVersionDto {
  commentaire: string;
}

export interface PublierVersionDto {
  commentaire?: string;
}

export async function soumettreVersion(
  id: string,
  dto: SoumettreVersionDto = {},
): Promise<Version> {
  const { data } = await apiClient.post<Version>(
    `/referentiels/versions/${id}/soumettre`,
    dto,
  );
  return data;
}

export async function validerVersion(
  id: string,
  dto: ValiderVersionDto = {},
): Promise<Version> {
  const { data } = await apiClient.post<Version>(
    `/referentiels/versions/${id}/valider`,
    dto,
  );
  return data;
}

export async function rejeterVersion(
  id: string,
  dto: RejeterVersionDto,
): Promise<Version> {
  const { data } = await apiClient.post<Version>(
    `/referentiels/versions/${id}/rejeter`,
    dto,
  );
  return data;
}

export async function publierVersion(
  id: string,
  dto: PublierVersionDto = {},
): Promise<Version> {
  const { data } = await apiClient.post<Version>(
    `/referentiels/versions/${id}/publier`,
    dto,
  );
  return data;
}
