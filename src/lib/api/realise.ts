/**
 * Client API module Réalisé (Lot 5.1) — aligné sur les DTOs backend
 * src/realise/dto/realise.dto.ts.
 *
 * Endpoints :
 *  GET    /realise              listing filtré
 *  GET    /realise/grille       grille CR × plage mois
 *  GET    /realise/:id          détail
 *  POST   /realise              saisie manuelle
 *  PATCH  /realise/:id          modif (statut=IMPORTE)
 *  DELETE /realise/:id          suppression (statut=IMPORTE)
 *  POST   /realise/valider      validation en lot
 *  POST   /realise/import       upload multipart
 */
import { apiClient } from './client';

export type StatutFaitRealise = 'IMPORTE' | 'VALIDE';
export type SourceFaitRealise = 'IMPORT' | 'SAISIE';
export type ModeFaitRealise = 'MNT' | 'VOL' | 'UNIT';

export interface FaitRealise {
  id: string;
  fkCentreResponsabilite: string;
  fkCompte: string;
  fkLigneMetier: string;
  fkTemps: string;
  fkDevise: string;
  montant: number;
  tauxChangeApplique: number;
  mode: ModeFaitRealise;
  statut: StatutFaitRealise;
  source: SourceFaitRealise;
  commentaire: string | null;
  valideLe: string | null;
  fkValidePar: string | null;
  dateCreation: string;
}

export interface CreerFaitRealiseDto {
  fkCentreResponsabilite: string;
  fkCompte: string;
  fkLigneMetier: string;
  fkTemps: string;
  fkDevise: string;
  montant: number;
  mode?: ModeFaitRealise;
  tauxChangeApplique?: number;
  commentaire?: string;
}

export interface ModifierFaitRealiseDto {
  montant?: number;
  mode?: ModeFaitRealise;
  tauxChangeApplique?: number;
  commentaire?: string;
}

export interface ListerQuery {
  fkCentreResponsabilite?: string;
  fkCompte?: string;
  moisDebut?: string; // YYYY-MM
  moisFin?: string;
  statut?: StatutFaitRealise;
  source?: SourceFaitRealise;
  page?: number;
  limit?: number;
}

export interface RapportImportRealise {
  nbLignesTraitees: number;
  nbLignesCreees: number;
  nbLignesMisesAJour: number;
  nbLignesIgnorees: number;
  nbErreurs: number;
  erreurs: Array<{ ligne: number; message: string }>;
  lignesIgnorees: Array<{ ligne: number; raison: string }>;
}

export const STATUT_LABEL: Record<StatutFaitRealise, string> = {
  IMPORTE: 'Importé',
  VALIDE: 'Validé',
};

export const MODE_LABEL: Record<ModeFaitRealise, string> = {
  MNT: 'Montant',
  VOL: 'Volume',
  UNIT: 'Unitaire',
};

export const SOURCE_LABEL: Record<SourceFaitRealise, string> = {
  IMPORT: 'Import',
  SAISIE: 'Saisie',
};

// ─── Endpoints ────────────────────────────────────────────────

export async function listerRealise(
  query: ListerQuery = {},
): Promise<{ items: FaitRealise[]; total: number }> {
  const { data } = await apiClient.get<{
    items: FaitRealise[];
    total: number;
  }>('/realise', { params: query });
  return data;
}

export async function getGrilleRealise(
  crId: string,
  moisDebut: string,
  moisFin: string,
): Promise<FaitRealise[]> {
  const { data } = await apiClient.get<FaitRealise[]>('/realise/grille', {
    params: { crId, moisDebut, moisFin },
  });
  return data;
}

export async function getRealise(id: string): Promise<FaitRealise> {
  const { data } = await apiClient.get<FaitRealise>(`/realise/${id}`);
  return data;
}

export async function creerRealise(
  dto: CreerFaitRealiseDto,
): Promise<FaitRealise> {
  const { data } = await apiClient.post<FaitRealise>('/realise', dto);
  return data;
}

export async function modifierRealise(
  id: string,
  dto: ModifierFaitRealiseDto,
): Promise<FaitRealise> {
  const { data } = await apiClient.patch<FaitRealise>(`/realise/${id}`, dto);
  return data;
}

export async function supprimerRealise(
  id: string,
): Promise<{ supprime: boolean }> {
  const { data } = await apiClient.delete<{ supprime: boolean }>(
    `/realise/${id}`,
  );
  return data;
}

export async function validerRealise(
  ids: string[],
): Promise<{ nbValidees: number }> {
  const { data } = await apiClient.post<{ nbValidees: number }>(
    '/realise/valider',
    { ids },
  );
  return data;
}

export async function importerRealise(
  file: File,
): Promise<RapportImportRealise> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<RapportImportRealise>(
    '/realise/import',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
