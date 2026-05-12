/**
 * Client API délégations (Lot 4.2).
 *
 *  POST   /delegations                  — créer (auth)
 *  POST   /delegations/:id/revoquer     — révoquer (délégant ou admin)
 *  GET    /delegations/recues           — déléguées au user courant
 *  GET    /delegations/emises           — déléguées par le user courant
 *  GET    /admin/delegations            — toutes (DELEGATION.GERER)
 */
import { apiClient } from './client';

export type PermissionDelegable =
  | 'SAISIE'
  | 'SOUMISSION'
  | 'VALIDATION'
  | 'PUBLICATION';

export type DelegationStatut = 'ACTIVE' | 'REVOQUEE' | 'EXPIREE';

export interface Delegation {
  id: string;
  fkDelegant: string;
  fkDelegataire: string;
  delegantEmail?: string;
  delegataireEmail?: string;
  perimetreUserPerimetreIds: string[];
  permissions: PermissionDelegable[];
  motif: string;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  revoqueeLe: string | null;
  fkRevoquePar: string | null;
  motifRevocation: string | null;
  statut: DelegationStatut;
}

export interface DelegationAvecWarnings extends Delegation {
  warnings: string[];
}

export interface CreerDelegationDto {
  fkDelegataire: string;
  perimetreUserPerimetreIds: string[];
  permissions: PermissionDelegable[];
  motif: string;
  dateDebut: string;
  dateFin: string;
}

export interface RevoquerDelegationDto {
  motif: string;
}

export interface ListerDelegationsQuery {
  actif?: boolean;
  statut?: DelegationStatut;
  delegantId?: string;
  delegataireId?: string;
  dateRef?: string;
  page?: number;
  limit?: number;
}

export const PERMISSION_DELEGABLE_LABELS: Record<PermissionDelegable, string> = {
  SAISIE: 'Saisie',
  SOUMISSION: 'Soumission',
  VALIDATION: 'Validation',
  PUBLICATION: 'Publication',
};

// Lot 6.7.2 — descriptions FR consommées par les tooltips sur les
// pages AdminDelegationsPage, MesDelegationsPage et le dialog
// CreerDelegationDialog. La mention "Action irréversible" sur
// PUBLICATION est cohérente avec la description BDD du rôle
// PUBLICATEUR (migration 1779200000110).
export const PERMISSION_DELEGABLE_DESCRIPTIONS: Record<
  PermissionDelegable,
  string
> = {
  SAISIE:
    'Permet au délégataire de saisir les lignes budgétaires de votre périmètre.',
  SOUMISSION:
    'Permet au délégataire de soumettre les versions saisies pour validation.',
  VALIDATION:
    'Permet au délégataire de valider ou rejeter les versions soumises.',
  PUBLICATION:
    'Permet au délégataire de geler (publier) les versions validées. Action irréversible.',
};

export const STATUT_LABELS: Record<DelegationStatut, string> = {
  ACTIVE: 'Active',
  REVOQUEE: 'Révoquée',
  EXPIREE: 'Expirée',
};

export async function creerDelegation(
  dto: CreerDelegationDto,
): Promise<DelegationAvecWarnings> {
  const { data } = await apiClient.post<DelegationAvecWarnings>(
    '/delegations',
    dto,
  );
  return data;
}

export async function revoquerDelegation(
  id: string,
  dto: RevoquerDelegationDto,
): Promise<Delegation> {
  const { data } = await apiClient.post<Delegation>(
    `/delegations/${id}/revoquer`,
    dto,
  );
  return data;
}

export async function listerDelegationsRecues(
  options: { actif?: boolean; dateRef?: string } = {},
): Promise<Delegation[]> {
  const { data } = await apiClient.get<Delegation[]>('/delegations/recues', {
    params: options,
  });
  return data;
}

export async function listerDelegationsEmises(
  options: { actif?: boolean; statut?: DelegationStatut } = {},
): Promise<Delegation[]> {
  const { data } = await apiClient.get<Delegation[]>('/delegations/emises', {
    params: options,
  });
  return data;
}

export async function listerToutesDelegations(
  query: ListerDelegationsQuery = {},
): Promise<Delegation[]> {
  const { data } = await apiClient.get<Delegation[]>('/admin/delegations', {
    params: query,
  });
  return data;
}
