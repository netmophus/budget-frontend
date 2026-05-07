/**
 * Client API notifications (Lot 4.3) — admin email-log + préférences user.
 */
import { apiClient } from './client';

export type StatutEmail = 'EN_ATTENTE' | 'ENVOYE' | 'ECHEC' | 'SUPPRIME';

export type TypeEvenement =
  | 'BUDGET_SOUMIS'
  | 'BUDGET_VALIDE'
  | 'BUDGET_REJETE'
  | 'BUDGET_PUBLIE'
  | 'DELEGATION_CREEE'
  | 'DELEGATION_EXPIREE'
  | 'DELEGATION_REVOQUEE'
  | 'AFFECTATION_CREEE';

export const TYPES_EVENEMENT: TypeEvenement[] = [
  'BUDGET_SOUMIS',
  'BUDGET_VALIDE',
  'BUDGET_REJETE',
  'BUDGET_PUBLIE',
  'DELEGATION_CREEE',
  'DELEGATION_EXPIREE',
  'DELEGATION_REVOQUEE',
  'AFFECTATION_CREEE',
];

export const STATUTS_EMAIL: StatutEmail[] = [
  'EN_ATTENTE',
  'ENVOYE',
  'ECHEC',
  'SUPPRIME',
];

export const EVENEMENT_LABEL: Record<TypeEvenement, string> = {
  BUDGET_SOUMIS: 'Budget soumis',
  BUDGET_VALIDE: 'Budget validé',
  BUDGET_REJETE: 'Budget rejeté',
  BUDGET_PUBLIE: 'Budget publié',
  DELEGATION_CREEE: 'Délégation créée',
  DELEGATION_EXPIREE: 'Délégation expirée',
  DELEGATION_REVOQUEE: 'Délégation révoquée',
  AFFECTATION_CREEE: 'Affectation créée',
};

export const STATUT_LABEL: Record<StatutEmail, string> = {
  EN_ATTENTE: 'En attente',
  ENVOYE: 'Envoyé',
  ECHEC: 'Échec',
  SUPPRIME: 'Supprimé',
};

export interface EmailLog {
  id: string;
  evenement: TypeEvenement;
  fkDestinataire: string | null;
  destinataireEmail: string;
  sujet: string;
  template: string;
  payload: Record<string, unknown>;
  statut: StatutEmail;
  tentatives: number;
  dernierMessageErreur: string | null;
  envoyeLe: string | null;
  dateCreation: string;
}

export interface ListerEmailLogQuery {
  statuts?: StatutEmail[];
  evenements?: TypeEvenement[];
  dateDebut?: string;
  dateFin?: string;
  rechercheEmail?: string;
  page?: number;
  limit?: number;
}

export interface PreferencesNotifications {
  notificationsEmailActives: boolean;
  notificationsEmailTypes: TypeEvenement[] | null;
}

export async function listerEmailLog(
  query: ListerEmailLogQuery = {},
): Promise<{ items: EmailLog[]; total: number }> {
  const { data } = await apiClient.get<{ items: EmailLog[]; total: number }>(
    '/admin/email-log',
    { params: query },
  );
  return data;
}

export async function statistiquesEmail(): Promise<{
  total7Jours: number;
  total30Jours: number;
  parStatut: Record<StatutEmail, number>;
  parEvenement: Record<string, number>;
}> {
  const { data } = await apiClient.get('/admin/email-log/stats');
  return data;
}

export async function rejouerEmail(id: string): Promise<{ envoye: boolean }> {
  const { data } = await apiClient.post<{ envoye: boolean }>(
    `/admin/email-log/${id}/rejouer`,
    {},
  );
  return data;
}

export async function lireMesPreferences(): Promise<PreferencesNotifications> {
  const { data } = await apiClient.get<PreferencesNotifications>(
    '/me/preferences-notifications',
  );
  return data;
}

export async function mettreAJourMesPreferences(
  prefs: PreferencesNotifications,
): Promise<PreferencesNotifications> {
  const { data } = await apiClient.put<PreferencesNotifications>(
    '/me/preferences-notifications',
    prefs,
  );
  return data;
}
