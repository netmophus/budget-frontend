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

/** Mode d'application d'un PATCH structure (cf. backend 2.3A.1). */
export type StructureModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

export interface CreateStructureDto {
  codeStructure: string;
  libelle: string;
  libelleCourt?: string;
  typeStructure: TypeStructure;
  niveauHierarchique: number;
  fkStructureParent?: string;
  codePays?: string;
}

export interface UpdateStructureDto {
  libelle?: string;
  libelleCourt?: string | null;
  typeStructure?: TypeStructure;
  niveauHierarchique?: number;
  fkStructureParent?: string | null;
  codePays?: string | null;
  estActif?: boolean;
}

/** Réponse étendue avec modeMaj côté PATCH (cf. structure.service backend). */
export interface StructureUpdateResponse extends Structure {
  modeMaj?: StructureModeMaj;
  /** Lot 2.3B : nb de CR repointés en cas de nouvelle_version (auto-référence). */
  crsRelinked?: number;
}

export async function createStructure(
  dto: CreateStructureDto,
): Promise<Structure> {
  const { data } = await apiClient.post<Structure>(
    '/referentiels/structures',
    dto,
  );
  return data;
}

export async function updateStructure(
  codeStructure: string,
  dto: UpdateStructureDto,
): Promise<StructureUpdateResponse> {
  const { data } = await apiClient.patch<StructureUpdateResponse>(
    `/referentiels/structures/par-code/${codeStructure}`,
    dto,
  );
  return data;
}

export async function deleteStructure(codeStructure: string): Promise<void> {
  await apiClient.delete(`/referentiels/structures/par-code/${codeStructure}`);
}

export async function getStructureHistorique(
  codeStructure: string,
): Promise<Structure[]> {
  const { data } = await apiClient.get<Structure[]>(
    `/referentiels/structures/par-code/${codeStructure}/historique`,
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

// ─── Comptes (2.4A) ───────────────────────────────────────────────

export type SensCompte = 'D' | 'C' | 'M';

export interface ParentCompte {
  id: string;
  codeCompte: string;
  libelle: string;
}

export interface Compte {
  id: string;
  codeCompte: string;
  libelle: string;
  classe: number;
  sousClasse: string | null;
  fkCompteParent: string | null;
  parentCourant?: ParentCompte;
  niveau: number;
  sens: SensCompte | null;
  codePosteBudgetaire: string | null;
  estCompteCollectif: boolean;
  estPorteurInterets: boolean;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListComptesQuery {
  classe?: number;
  search?: string;
  codePosteBudgetaire?: string;
  estCompteCollectif?: boolean;
  estPorteurInterets?: boolean;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listComptes(
  query: ListComptesQuery = {},
): Promise<PaginatedResponse<Compte>> {
  const { data } = await apiClient.get<PaginatedResponse<Compte>>(
    '/referentiels/comptes',
    { params: query },
  );
  return data;
}

export async function getCompteByCode(codeCompte: string): Promise<Compte> {
  const { data } = await apiClient.get<Compte>(
    `/referentiels/comptes/par-code/${codeCompte}`,
  );
  return data;
}

export async function getCompteHistorique(
  codeCompte: string,
): Promise<Compte[]> {
  const { data } = await apiClient.get<Compte[]>(
    `/referentiels/comptes/par-code/${codeCompte}/historique`,
  );
  return data;
}

// ─── Lignes de métier (2.4B) ──────────────────────────────────────

export interface ParentLigneMetier {
  id: string;
  codeLigneMetier: string;
  libelle: string;
}

export interface LigneMetier {
  id: string;
  codeLigneMetier: string;
  libelle: string;
  fkLigneMetierParent: string | null;
  parentCourant?: ParentLigneMetier;
  niveau: number;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListLignesMetierQuery {
  search?: string;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listLignesMetier(
  query: ListLignesMetierQuery = {},
): Promise<PaginatedResponse<LigneMetier>> {
  const { data } = await apiClient.get<PaginatedResponse<LigneMetier>>(
    '/referentiels/lignes-metier',
    { params: query },
  );
  return data;
}

export async function getLigneMetierByCode(
  codeLigneMetier: string,
): Promise<LigneMetier> {
  const { data } = await apiClient.get<LigneMetier>(
    `/referentiels/lignes-metier/par-code/${codeLigneMetier}`,
  );
  return data;
}

export async function getLigneMetierHistorique(
  codeLigneMetier: string,
): Promise<LigneMetier[]> {
  const { data } = await apiClient.get<LigneMetier[]>(
    `/referentiels/lignes-metier/par-code/${codeLigneMetier}/historique`,
  );
  return data;
}

// ─── Produits (2.4B) ──────────────────────────────────────────────

export type TypeProduit = 'credit' | 'depot' | 'service' | 'marche' | 'autre';

export interface ParentProduit {
  id: string;
  codeProduit: string;
  libelle: string;
}

export interface Produit {
  id: string;
  codeProduit: string;
  libelle: string;
  typeProduit: TypeProduit;
  fkProduitParent: string | null;
  parentCourant?: ParentProduit;
  niveau: number;
  estPorteurInterets: boolean;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListProduitsQuery {
  typeProduit?: TypeProduit;
  search?: string;
  estPorteurInterets?: boolean;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listProduits(
  query: ListProduitsQuery = {},
): Promise<PaginatedResponse<Produit>> {
  const { data } = await apiClient.get<PaginatedResponse<Produit>>(
    '/referentiels/produits',
    { params: query },
  );
  return data;
}

export async function getProduitByCode(codeProduit: string): Promise<Produit> {
  const { data } = await apiClient.get<Produit>(
    `/referentiels/produits/par-code/${codeProduit}`,
  );
  return data;
}

export async function getProduitHistorique(
  codeProduit: string,
): Promise<Produit[]> {
  const { data } = await apiClient.get<Produit[]>(
    `/referentiels/produits/par-code/${codeProduit}/historique`,
  );
  return data;
}

// ─── Segments (2.4B — plat) ───────────────────────────────────────

export type CategorieSegment =
  | 'particulier'
  | 'professionnel'
  | 'pme'
  | 'grande_entreprise'
  | 'institutionnel'
  | 'secteur_public';

export interface Segment {
  id: string;
  codeSegment: string;
  libelle: string;
  categorie: CategorieSegment;
  versionCourante: boolean;
  dateDebutValidite: string;
  dateFinValidite: string | null;
  estActif: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListSegmentsQuery {
  categorie?: CategorieSegment;
  search?: string;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export async function listSegments(
  query: ListSegmentsQuery = {},
): Promise<PaginatedResponse<Segment>> {
  const { data } = await apiClient.get<PaginatedResponse<Segment>>(
    '/referentiels/segments',
    { params: query },
  );
  return data;
}

export async function getSegmentByCode(codeSegment: string): Promise<Segment> {
  const { data } = await apiClient.get<Segment>(
    `/referentiels/segments/par-code/${codeSegment}`,
  );
  return data;
}

export async function getSegmentHistorique(
  codeSegment: string,
): Promise<Segment[]> {
  const { data } = await apiClient.get<Segment[]>(
    `/referentiels/segments/par-code/${codeSegment}/historique`,
  );
  return data;
}
