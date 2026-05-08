/**
 * Client API reforecast trimestriel (Lot 5.3.B). Aligné sur les
 * DTOs backend `src/reforecast/dto/reforecast.dto.ts`.
 *
 * 8 endpoints sous `/reforecast` : lancer, lister, détail, grille,
 * comparaison, soumettre, valider, rejeter, publier.
 */
import { apiClient } from './client';

export type StatutWorkflow = 'ouvert' | 'soumis' | 'valide' | 'gele';
export type StatutPublicationReforecast = 'ACTIVE' | 'OBSOLETE';
export type MethodeExtrapolation =
  | 'MOYENNE_TRIMESTRE'
  | 'BUDGET_INITIAL'
  | 'MANUELLE';
export type OrigineLigne = 'REALISE' | 'EXTRAPOLATION' | 'MANUEL';

export interface Reforecast {
  id: string;
  codeVersion: string;
  libelle: string;
  exerciceFiscal: number;
  statut: StatutWorkflow;
  statutPublication: StatutPublicationReforecast;
  fkVersionSource: string;
  fkScenarioSource: string;
  trimestreConsolide: number;
  anneeConsolide: number;
  methodeExtrapolation: MethodeExtrapolation;
  dateObsolescence: string | null;
  fkVersionRemplacante: string | null;
  libelleVersionSource: string | null;
  libelleScenarioSource: string | null;
  dateCreation: string;
  utilisateurCreation: string;
  commentaire: string | null;
  nbLignes?: number;
}

export interface LancerReforecastPayload {
  fkVersionSource: string;
  fkScenarioSource: string;
  trimestreConsolide: number;
  anneeConsolide: number;
  methodeExtrapolation: MethodeExtrapolation;
  libelleNouveauVersion: string;
  commentaire?: string;
}

export interface ListerFiltres {
  statutPublication?: StatutPublicationReforecast;
  fkVersionSource?: string;
  anneeConsolide?: number;
  /** URL-friendly : BROUILLON / SOUMIS / VALIDE / PUBLIE */
  statutWorkflow?: 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'PUBLIE';
}

export interface LigneComparaison {
  fkCentre: string;
  codeCr: string;
  fkCompte: string;
  codeCompte: string;
  fkLigneMetier: string;
  codeLigneMetier: string;
  fkTemps: string;
  mois: number;
  annee: number;
  origine: OrigineLigne;
  montantSource: number;
  montantReforecast: number;
  ecart: number;
}

export interface ComparaisonResponse {
  lignes: LigneComparaison[];
  totalSource: number;
  totalReforecast: number;
  totalEcart: number;
}

// ─── Helpers libellés ──────────────────────────────────────────

export const STATUT_WORKFLOW_LABEL: Record<StatutWorkflow, string> = {
  ouvert: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  gele: 'Publié',
};

export const METHODE_LABEL: Record<MethodeExtrapolation, string> = {
  MOYENNE_TRIMESTRE: 'Moyenne du trimestre consolidé',
  BUDGET_INITIAL: 'Budget initial',
  MANUELLE: 'Saisie manuelle',
};

export const METHODE_DESCRIPTION: Record<MethodeExtrapolation, string> = {
  MOYENNE_TRIMESTRE:
    'Les trimestres restants sont remplis avec la moyenne du réalisé du trimestre consolidé.',
  BUDGET_INITIAL:
    'Les trimestres restants reprennent les valeurs du budget initial source.',
  MANUELLE:
    'Les trimestres restants sont à 0, à saisir manuellement.',
};

export const ORIGINE_LABEL: Record<OrigineLigne, string> = {
  REALISE: 'Réalisé',
  EXTRAPOLATION: 'Extrapolation',
  MANUEL: 'Manuel',
};

// ─── Endpoints ─────────────────────────────────────────────────

export async function lancerReforecast(
  payload: LancerReforecastPayload,
): Promise<Reforecast> {
  const { data } = await apiClient.post<Reforecast>(
    '/reforecast/lancer',
    payload,
  );
  return data;
}

export async function listerReforecasts(
  filtres: ListerFiltres = {},
): Promise<Reforecast[]> {
  const { data } = await apiClient.get<Reforecast[]>('/reforecast', {
    params: filtres,
    paramsSerializer: { indexes: null },
  });
  return data;
}

export async function getReforecast(id: string): Promise<Reforecast> {
  const { data } = await apiClient.get<Reforecast>(`/reforecast/${id}`);
  return data;
}

export async function getReforecastComparaison(
  id: string,
): Promise<ComparaisonResponse> {
  const { data } = await apiClient.get<ComparaisonResponse>(
    `/reforecast/${id}/comparaison`,
  );
  return data;
}

export async function soumettreReforecast(
  id: string,
  commentaire?: string,
): Promise<Reforecast> {
  const { data } = await apiClient.post<Reforecast>(
    `/reforecast/${id}/soumettre`,
    commentaire ? { commentaire } : {},
  );
  return data;
}

export async function validerReforecast(
  id: string,
  commentaire?: string,
): Promise<Reforecast> {
  const { data } = await apiClient.post<Reforecast>(
    `/reforecast/${id}/valider`,
    commentaire ? { commentaire } : {},
  );
  return data;
}

export async function rejeterReforecast(
  id: string,
  motif: string,
): Promise<Reforecast> {
  const { data } = await apiClient.post<Reforecast>(
    `/reforecast/${id}/rejeter`,
    { commentaire: motif },
  );
  return data;
}

export async function publierReforecast(
  id: string,
  commentaire?: string,
): Promise<Reforecast> {
  const { data } = await apiClient.post<Reforecast>(
    `/reforecast/${id}/publier`,
    commentaire ? { commentaire } : {},
  );
  return data;
}

/**
 * Helper : vérifie si un reforecast existant pour la même clé serait
 * écrasé par un nouveau lancer(). Le backend ne dispose pas d'un
 * endpoint dédié — on filtre la liste.
 */
export async function chercherReforecastExistant(
  fkVersionSource: string,
  fkScenarioSource: string,
  trimestreConsolide: number,
  anneeConsolide: number,
): Promise<Reforecast | null> {
  const list = await listerReforecasts({
    statutPublication: 'ACTIVE',
    fkVersionSource,
    anneeConsolide,
  });
  const match =
    list.find(
      (r) =>
        r.fkScenarioSource === fkScenarioSource &&
        r.trimestreConsolide === trimestreConsolide,
    ) ?? null;
  return match;
}
