/**
 * Client API du workflow de validation par CR (Lot workflow CR, PR B).
 *
 * Aligné sur les endpoints backend (PR A) :
 *   /budget/cr/:crCode/{soumettre,valider,rejeter,rouvrir,statut}
 *   /budget/version/:versionId/statuts-crs
 *   /referentiels/versions/:id/soumettre-comite
 *
 * Le `versionId` est passé en query (un statut = version × CR).
 */
import { apiClient } from './client';

export type StatutCr = 'EN_SAISIE' | 'SOUMIS' | 'VALIDE';

export interface CrStatut {
  versionId: string;
  crId: string;
  crCode: string;
  statut: StatutCr;
  dateSoumission: string | null;
  dateValidation: string | null;
  dateReouverture: string | null;
  fkSaisisseur: string | null;
  fkValidateur: string | null;
  motifRejet: string | null;
  motifReouverture: string | null;
}

export interface CrStatutLigne {
  crId: string;
  crCode: string;
  libelle: string;
  statut: StatutCr;
  saisisseurEmail: string | null;
  validateurEmail: string | null;
  dateSoumission: string | null;
  dateValidation: string | null;
  /** PNB du CR (Produits cl.7 − Charges cl.6). */
  pnb: number;
}

export interface StatutsCrsVersion {
  versionId: string;
  statutVersion: string;
  totalAttendus: number;
  nbValides: number;
  nbSoumis: number;
  nbEnSaisie: number;
  crs: CrStatutLigne[];
}

// ─── Lectures ──────────────────────────────────────────────────────

export async function getCrStatut(
  crCode: string,
  versionId: string,
): Promise<CrStatut> {
  const { data } = await apiClient.get<CrStatut>(
    `/budget/cr/${encodeURIComponent(crCode)}/statut`,
    { params: { versionId } },
  );
  return data;
}

export async function getStatutsCrsVersion(
  versionId: string,
  monPerimetre = false,
): Promise<StatutsCrsVersion> {
  const { data } = await apiClient.get<StatutsCrsVersion>(
    `/budget/version/${encodeURIComponent(versionId)}/statuts-crs`,
    monPerimetre ? { params: { monPerimetre: 'true' } } : undefined,
  );
  return data;
}

// ─── Transitions par CR ────────────────────────────────────────────

export async function soumettreCr(
  crCode: string,
  versionId: string,
  commentaire?: string,
): Promise<CrStatut> {
  const { data } = await apiClient.post<CrStatut>(
    `/budget/cr/${encodeURIComponent(crCode)}/soumettre`,
    { commentaire },
    { params: { versionId } },
  );
  return data;
}

export async function validerCr(
  crCode: string,
  versionId: string,
  commentaire?: string,
): Promise<CrStatut> {
  const { data } = await apiClient.post<CrStatut>(
    `/budget/cr/${encodeURIComponent(crCode)}/valider`,
    { commentaire },
    { params: { versionId } },
  );
  return data;
}

export async function rejeterCr(
  crCode: string,
  versionId: string,
  motif: string,
): Promise<CrStatut> {
  const { data } = await apiClient.post<CrStatut>(
    `/budget/cr/${encodeURIComponent(crCode)}/rejeter`,
    { motif },
    { params: { versionId } },
  );
  return data;
}

export async function rouvrirCr(
  crCode: string,
  versionId: string,
  motif: string,
): Promise<CrStatut> {
  const { data } = await apiClient.post<CrStatut>(
    `/budget/cr/${encodeURIComponent(crCode)}/rouvrir`,
    { motif },
    { params: { versionId } },
  );
  return data;
}

// ─── Soumission au Comité (utilisé en PR C) ────────────────────────

export async function soumettreComite(
  versionId: string,
  commentaire?: string,
): Promise<{ id: string; codeVersion: string; statut: string }> {
  const { data } = await apiClient.post<{
    id: string;
    codeVersion: string;
    statut: string;
  }>(`/referentiels/versions/${encodeURIComponent(versionId)}/soumettre-comite`, {
    commentaire,
  });
  return data;
}
