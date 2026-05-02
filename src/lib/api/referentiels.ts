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

export type CompteModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

export type ImportMode = 'insert-only' | 'upsert';

export type ImportErrorCode =
  | 'PARENT_INCONNU'
  | 'VALIDATION_ZOD'
  | 'CYCLE_DETECTE'
  | 'INCOHERENCE_NIVEAU'
  | 'INCOHERENCE_CLASSE'
  | 'AUTRE';

export interface ImportError {
  ligne: number;
  codeCompte?: string;
  message: string;
  code: ImportErrorCode;
}

export interface ImportRapport {
  totalLines: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  dureeMs: number;
}

export interface ParentCompte {
  id: string;
  codeCompte: string;
  libelle: string;
}

export interface Compte {
  id: string;
  codeCompte: string;
  libelle: string;
  classe: string;
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
  modeMaj?: CompteModeMaj;
  comptesEnfantsRelinked?: number;
}

export interface ListComptesQuery {
  classe?: string;
  search?: string;
  codePosteBudgetaire?: string;
  estCompteCollectif?: boolean;
  estPorteurInterets?: boolean;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export interface CreateCompteDto {
  codeCompte: string;
  libelle: string;
  classe: string;
  niveau: number;
  sousClasse?: string;
  fkCompteParent?: string;
  codeCompteParent?: string;
  sens?: SensCompte;
  codePosteBudgetaire?: string;
  estCompteCollectif?: boolean;
  estPorteurInterets?: boolean;
}

export interface UpdateCompteDto {
  libelle?: string;
  sousClasse?: string;
  fkCompteParent?: string | null;
  codeCompteParent?: string;
  niveau?: number;
  sens?: SensCompte;
  codePosteBudgetaire?: string;
  estCompteCollectif?: boolean;
  estPorteurInterets?: boolean;
  estActif?: boolean;
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

export async function listComptesRacines(): Promise<Compte[]> {
  const { data } = await apiClient.get<Compte[]>(
    '/referentiels/comptes/racines',
  );
  return data;
}

export async function getCompteById(id: string): Promise<Compte> {
  const { data } = await apiClient.get<Compte>(
    `/referentiels/comptes/${id}`,
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

export async function getCompteEnfants(id: string): Promise<Compte[]> {
  const { data } = await apiClient.get<Compte[]>(
    `/referentiels/comptes/${id}/enfants`,
  );
  return data;
}

export async function getCompteDescendants(id: string): Promise<Compte[]> {
  const { data } = await apiClient.get<Compte[]>(
    `/referentiels/comptes/${id}/descendants`,
  );
  return data;
}

export async function getCompteAncetres(id: string): Promise<Compte[]> {
  const { data } = await apiClient.get<Compte[]>(
    `/referentiels/comptes/${id}/ancetres`,
  );
  return data;
}

export async function createCompte(dto: CreateCompteDto): Promise<Compte> {
  const { data } = await apiClient.post<Compte>(
    '/referentiels/comptes',
    dto,
  );
  return data;
}

export async function updateCompte(
  codeCompte: string,
  dto: UpdateCompteDto,
): Promise<Compte> {
  const { data } = await apiClient.patch<Compte>(
    `/referentiels/comptes/par-code/${codeCompte}`,
    dto,
  );
  return data;
}

export async function deleteCompte(codeCompte: string): Promise<void> {
  await apiClient.delete(`/referentiels/comptes/par-code/${codeCompte}`);
}

export async function importComptes(
  file: File,
  mode: ImportMode = 'insert-only',
): Promise<ImportRapport> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ImportRapport>(
    '/referentiels/comptes/import',
    formData,
    {
      params: { mode },
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data;
}

// ─── Lignes de métier (2.4B) ──────────────────────────────────────

export interface ParentLigneMetier {
  id: string;
  codeLigneMetier: string;
  libelle: string;
}

export type LigneMetierModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

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
  modeMaj?: LigneMetierModeMaj;
  lignesMetierEnfantsRelinked?: number;
}

export interface ListLignesMetierQuery {
  search?: string;
  page?: number;
  limit?: number;
  versionCouranteUniquement?: boolean;
}

export interface CreateLigneMetierDto {
  codeLigneMetier: string;
  libelle: string;
  niveau: number;
  fkLigneMetierParent?: string;
  codeLigneMetierParent?: string;
}

export interface UpdateLigneMetierDto {
  libelle?: string;
  niveau?: number;
  fkLigneMetierParent?: string | null;
  codeLigneMetierParent?: string;
  estActif?: boolean;
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

export async function listLignesMetierRacines(): Promise<LigneMetier[]> {
  const { data } = await apiClient.get<LigneMetier[]>(
    '/referentiels/lignes-metier/racines',
  );
  return data;
}

export async function getLigneMetierById(id: string): Promise<LigneMetier> {
  const { data } = await apiClient.get<LigneMetier>(
    `/referentiels/lignes-metier/${id}`,
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

export async function getLigneMetierEnfants(
  id: string,
): Promise<LigneMetier[]> {
  const { data } = await apiClient.get<LigneMetier[]>(
    `/referentiels/lignes-metier/${id}/enfants`,
  );
  return data;
}

export async function getLigneMetierDescendants(
  id: string,
): Promise<LigneMetier[]> {
  const { data } = await apiClient.get<LigneMetier[]>(
    `/referentiels/lignes-metier/${id}/descendants`,
  );
  return data;
}

export async function getLigneMetierAncetres(
  id: string,
): Promise<LigneMetier[]> {
  const { data } = await apiClient.get<LigneMetier[]>(
    `/referentiels/lignes-metier/${id}/ancetres`,
  );
  return data;
}

export async function createLigneMetier(
  dto: CreateLigneMetierDto,
): Promise<LigneMetier> {
  const { data } = await apiClient.post<LigneMetier>(
    '/referentiels/lignes-metier',
    dto,
  );
  return data;
}

export async function updateLigneMetier(
  codeLigneMetier: string,
  dto: UpdateLigneMetierDto,
): Promise<LigneMetier> {
  const { data } = await apiClient.patch<LigneMetier>(
    `/referentiels/lignes-metier/par-code/${codeLigneMetier}`,
    dto,
  );
  return data;
}

export async function deleteLigneMetier(
  codeLigneMetier: string,
): Promise<void> {
  await apiClient.delete(
    `/referentiels/lignes-metier/par-code/${codeLigneMetier}`,
  );
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

export async function getProduitsRacines(): Promise<Produit[]> {
  const { data } = await apiClient.get<Produit[]>(
    '/referentiels/produits/racines',
  );
  return data;
}

export async function getProduitEnfants(id: string): Promise<Produit[]> {
  const { data } = await apiClient.get<Produit[]>(
    `/referentiels/produits/${id}/enfants`,
  );
  return data;
}

export async function getProduitDescendants(id: string): Promise<Produit[]> {
  const { data } = await apiClient.get<Produit[]>(
    `/referentiels/produits/${id}/descendants`,
  );
  return data;
}

export async function getProduitAncetres(id: string): Promise<Produit[]> {
  const { data } = await apiClient.get<Produit[]>(
    `/referentiels/produits/${id}/ancetres`,
  );
  return data;
}

/** Mode d'application d'un PATCH produit (cf. backend pattern 4-cas). */
export type ProduitModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

export interface CreateProduitDto {
  codeProduit: string;
  libelle: string;
  typeProduit: string;
  niveau: number;
  fkProduitParent?: string;
  codeProduitParent?: string;
  estPorteurInterets?: boolean;
}

export interface UpdateProduitDto {
  libelle?: string;
  typeProduit?: string;
  niveau?: number;
  fkProduitParent?: string | null;
  codeProduitParent?: string;
  estPorteurInterets?: boolean;
  estActif?: boolean;
}

export interface ProduitUpdateResponse extends Produit {
  modeMaj?: ProduitModeMaj;
  produitsEnfantsRelinked?: number;
}

export async function createProduit(
  dto: CreateProduitDto,
): Promise<Produit> {
  const { data } = await apiClient.post<Produit>(
    '/referentiels/produits',
    dto,
  );
  return data;
}

export async function updateProduit(
  codeProduit: string,
  dto: UpdateProduitDto,
): Promise<ProduitUpdateResponse> {
  const { data } = await apiClient.patch<ProduitUpdateResponse>(
    `/referentiels/produits/par-code/${codeProduit}`,
    dto,
  );
  return data;
}

export async function deleteProduit(codeProduit: string): Promise<void> {
  await apiClient.delete(`/referentiels/produits/par-code/${codeProduit}`);
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

/** Mode d'application d'un PATCH segment (cf. backend pattern 4-cas). */
export type SegmentModeMaj =
  | 'no_op'
  | 'in_place_est_actif'
  | 'ecrasement_intra_jour'
  | 'nouvelle_version';

export interface CreateSegmentDto {
  codeSegment: string;
  libelle: string;
  /** Code business du référentiel ref_categorie_segment. */
  categorie: string;
}

export interface UpdateSegmentDto {
  libelle?: string;
  categorie?: string;
  estActif?: boolean;
}

/** Réponse étendue avec modeMaj côté PATCH (cf. SegmentService backend). */
export interface SegmentUpdateResponse extends Segment {
  modeMaj?: SegmentModeMaj;
}

export async function createSegment(
  dto: CreateSegmentDto,
): Promise<Segment> {
  const { data } = await apiClient.post<Segment>(
    '/referentiels/segments',
    dto,
  );
  return data;
}

export async function updateSegment(
  codeSegment: string,
  dto: UpdateSegmentDto,
): Promise<SegmentUpdateResponse> {
  const { data } = await apiClient.patch<SegmentUpdateResponse>(
    `/referentiels/segments/par-code/${codeSegment}`,
    dto,
  );
  return data;
}

export async function deleteSegment(codeSegment: string): Promise<void> {
  await apiClient.delete(`/referentiels/segments/par-code/${codeSegment}`);
}
