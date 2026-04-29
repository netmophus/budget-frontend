import { apiClient } from './client';
import type { PaginatedResponse } from './types';

export interface JourTemps {
  id: string;
  date: string;
  annee: number;
  trimestre: number;
  mois: number;
  jour: number;
  semaineIso: number | null;
  jourOuvre: boolean;
  estFinDeMois: boolean;
  estFinDeTrimestre: boolean;
  estFinDAnnee: boolean;
  exerciceFiscal: number;
  libelleMois: string;
}

export interface Devise {
  id: string;
  codeIso: string;
  libelle: string;
  symbole: string | null;
  nbDecimales: number;
  estDevisePivot: boolean;
  estActive: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListJoursTempsQuery {
  annee?: number;
  mois?: number;
  dateDebut?: string;
  dateFin?: string;
  exerciceFiscal?: number;
  page?: number;
  limit?: number;
}

export async function listJoursTemps(
  query: ListJoursTempsQuery = {},
): Promise<PaginatedResponse<JourTemps>> {
  const { data } = await apiClient.get<PaginatedResponse<JourTemps>>(
    '/referentiels/temps',
    { params: query },
  );
  return data;
}

export async function getJourByDate(date: string): Promise<JourTemps> {
  const { data } = await apiClient.get<JourTemps>(
    `/referentiels/temps/par-date/${date}`,
  );
  return data;
}

export interface ListDevisesQuery {
  estActive?: boolean;
  codeIso?: string;
  page?: number;
  limit?: number;
}

export async function listDevises(
  query: ListDevisesQuery = {},
): Promise<PaginatedResponse<Devise>> {
  const { data } = await apiClient.get<PaginatedResponse<Devise>>(
    '/referentiels/devises',
    { params: query },
  );
  return data;
}

export async function getDevisePivot(): Promise<Devise> {
  const { data } = await apiClient.get<Devise>('/referentiels/devises/pivot');
  return data;
}

// ─── Structures (2.3A) ────────────────────────────────────────────

export type TypeStructure =
  | 'entite_juridique'
  | 'branche'
  | 'direction'
  | 'departement'
  | 'agence';

export interface Structure {
  id: string;
  codeStructure: string;
  libelle: string;
  libelleCourt: string | null;
  typeStructure: TypeStructure;
  niveauHierarchique: number;
  fkStructureParent: string | null;
  codePays: string | null;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListStructuresQuery {
  codePays?: string;
  typeStructure?: string;
  search?: string;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listStructures(
  query: ListStructuresQuery = {},
): Promise<PaginatedResponse<Structure>> {
  const { data } = await apiClient.get<PaginatedResponse<Structure>>(
    '/referentiels/structures',
    { params: query },
  );
  return data;
}

export async function getStructureByCode(
  codeStructure: string,
): Promise<Structure> {
  const { data } = await apiClient.get<Structure>(
    `/referentiels/structures/par-code/${codeStructure}`,
  );
  return data;
}

export async function getStructureRacines(): Promise<Structure[]> {
  const { data } = await apiClient.get<Structure[]>(
    '/referentiels/structures/racines',
  );
  return data;
}

export async function getStructureEnfants(id: string): Promise<Structure[]> {
  const { data } = await apiClient.get<Structure[]>(
    `/referentiels/structures/${id}/enfants`,
  );
  return data;
}

export async function getStructureAncetres(id: string): Promise<Structure[]> {
  const { data } = await apiClient.get<Structure[]>(
    `/referentiels/structures/${id}/ancetres`,
  );
  return data;
}

// ─── Centres de responsabilité (2.3B) ─────────────────────────────

export type TypeCr = 'cdc' | 'cdp' | 'cdr' | 'autre';

export interface CentreResponsabilite {
  id: string;
  codeCr: string;
  libelle: string;
  libelleCourt: string | null;
  typeCr: TypeCr;
  fkStructure: string;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
  /** Populé par le backend pour faciliter l'affichage en table. */
  structureCourante?: {
    id: string;
    codeStructure: string;
    libelle: string;
  };
}

export interface ListCrsQuery {
  codeStructure?: string;
  typeCr?: string;
  search?: string;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listCrs(
  query: ListCrsQuery = {},
): Promise<PaginatedResponse<CentreResponsabilite>> {
  const { data } = await apiClient.get<PaginatedResponse<CentreResponsabilite>>(
    '/referentiels/cr',
    { params: query },
  );
  return data;
}

export async function getCrByCode(
  codeCr: string,
): Promise<CentreResponsabilite> {
  const { data } = await apiClient.get<CentreResponsabilite>(
    `/referentiels/cr/par-code/${codeCr}`,
  );
  return data;
}

export async function getCrsByStructure(
  codeStructure: string,
): Promise<CentreResponsabilite[]> {
  const { data } = await apiClient.get<CentreResponsabilite[]>(
    `/referentiels/cr/par-structure/${codeStructure}`,
  );
  return data;
}
