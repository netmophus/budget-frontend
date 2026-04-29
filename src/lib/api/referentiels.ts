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
