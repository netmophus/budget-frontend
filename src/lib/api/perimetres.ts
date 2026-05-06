/**
 * Client API multi-périmètres (Lot 4.1).
 *
 * - GET    /admin/users/:userId/perimetres
 * - POST   /admin/users/:userId/perimetres   (USER.GERER)
 * - DELETE /admin/users/:userId/perimetres/:id  (USER.GERER)
 * - GET    /me/perimetres
 */
import { apiClient } from './client';

export type CiblePerimetreType = 'STRUCTURE' | 'CR' | 'CR_SET';
export type OriginePerimetre = 'PRINCIPAL' | 'AFFECTATION' | 'DELEGATION';

export interface AffectationPerimetre {
  id: string;
  cibleType: CiblePerimetreType;
  cibleId: string | null;
  cibleCrIds: string[] | null;
  origine: OriginePerimetre;
  delegationId: string | null;
  dateDebut: string;
  dateFin: string | null;
  actif: boolean;
  motif: string | null;
}

export interface CreerAffectationPerimetreDto {
  cibleType: CiblePerimetreType;
  cibleId?: string;
  cibleCrIds?: string[];
  origine?: OriginePerimetre;
  dateDebut?: string;
  dateFin?: string;
  motif?: string;
}

export interface ListerPerimetresUserOptions {
  actif?: boolean;
  origine?: OriginePerimetre;
  dateRef?: string;
}

export async function listerPerimetresUser(
  userId: string,
  options: ListerPerimetresUserOptions = {},
): Promise<AffectationPerimetre[]> {
  const { data } = await apiClient.get<AffectationPerimetre[]>(
    `/admin/users/${userId}/perimetres`,
    { params: options },
  );
  return data;
}

export async function creerAffectationPerimetre(
  userId: string,
  dto: CreerAffectationPerimetreDto,
): Promise<AffectationPerimetre> {
  const { data } = await apiClient.post<AffectationPerimetre>(
    `/admin/users/${userId}/perimetres`,
    dto,
  );
  return data;
}

export async function retirerAffectationPerimetre(
  userId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}/perimetres/${id}`);
}

export async function listerMesPerimetres(): Promise<AffectationPerimetre[]> {
  const { data } = await apiClient.get<AffectationPerimetre[]>(
    '/me/perimetres',
  );
  return data;
}

export const CIBLE_TYPE_LABEL: Record<CiblePerimetreType, string> = {
  STRUCTURE: 'Structure (descente arbre)',
  CR: 'CR unique',
  CR_SET: 'Ensemble de CR',
};
