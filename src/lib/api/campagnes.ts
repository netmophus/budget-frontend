/**
 * Client API Campagnes Budgétaires (Lot 8.2.A) — consomme les
 * endpoints `/campagnes` livrés par les Lots 8.1.B et 8.1.C.
 *
 * Convention projet : on exporte des fonctions nommées (pattern
 * `listVersions` / `createVersion`), pas un objet `xxxApi`. Cohérent
 * avec `lib/api/versions.ts`, `lib/api/users.ts`, etc.
 */
import { apiClient } from './client';
import type { Campagne, ComiteMembre, ModeVisa } from '@/types/campagne';

export interface CreerCampagneDto {
  code: string;
  exerciceFiscal: number;
  libelle: string;
  fkUserSignataireDefaut: string;
  modeVisaDefaut?: ModeVisa;
}

export interface AjouterMembreDto {
  fkUser: string;
  libelleFonction?: string;
  estObligatoire?: boolean;
}

/** Réponse de GET /campagnes/:id (détail enrichi avec membres). */
export interface CampagneDetail extends Campagne {
  comiteMembres: ComiteMembre[];
}

export async function listerCampagnes(): Promise<Campagne[]> {
  const { data } = await apiClient.get<Campagne[]>('/campagnes');
  return data;
}

export async function detailCampagne(id: string): Promise<CampagneDetail> {
  const { data } = await apiClient.get<CampagneDetail>(`/campagnes/${id}`);
  return data;
}

export async function creerCampagne(
  dto: CreerCampagneDto,
): Promise<Campagne> {
  const { data } = await apiClient.post<Campagne>('/campagnes', dto);
  return data;
}

export async function ajouterMembreCampagne(
  campagneId: string,
  dto: AjouterMembreDto,
): Promise<ComiteMembre> {
  const { data } = await apiClient.post<ComiteMembre>(
    `/campagnes/${campagneId}/membres`,
    dto,
  );
  return data;
}

export async function lancerCampagne(campagneId: string): Promise<Campagne> {
  const { data } = await apiClient.post<Campagne>(
    `/campagnes/${campagneId}/lancer`,
  );
  return data;
}
