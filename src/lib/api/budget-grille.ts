/**
 * Client API pour la grille de saisie budgétaire (Lot 3.4).
 *
 * Aligné sur les DTOs backend `src/budget/dto/grille-saisie.dto.ts`
 * livrés au Lot 3.3 (endpoints GET et POST /api/v1/budget/grille).
 */
import { apiClient } from './client';

export type ModeSaisie = 'MONTANT' | 'ENCOURS_TIE';

// ─── Types lecture (GET /budget/grille) ───────────────────────────

export interface GrilleCellule {
  /** Format YYYY-MM-01 (1er du mois — maille mensuelle stricte). */
  mois: string;
  /** Montant en devise (XOF par défaut). 0 si cellule vide. */
  montant: number;
  /** Mode de saisie. null en cellule jamais saisie. */
  modeSaisie: ModeSaisie | null;
  encoursMoyen: number | null;
  tie: number | null;
  commentaire: string | null;
  /** id du fait_budget existant ; null si cellule vide. */
  ligneId: string | null;
}

export interface CompteEligible {
  id: string;
  codeCompte: string;
  libelle: string;
  classe: string;
  sens: string | null;
  estPorteurInterets: boolean;
}

export interface LigneMetierResume {
  id: string;
  codeLigneMetier: string;
  libelle: string;
}

export interface GrilleLigne {
  compte: CompteEligible;
  ligneMetier: LigneMetierResume;
  cellules: GrilleCellule[];
  totalAnnee: number;
}

export interface GrilleVersionRef {
  id: string;
  codeVersion: string;
  libelle: string;
  /** 'ouvert' (Brouillon) | 'soumis' | 'valide' | 'gele'. */
  statut: string;
}

export interface GrilleScenarioRef {
  id: string;
  codeScenario: string;
  libelle: string;
  /** 'central' (Médian) | 'optimiste' | 'pessimiste' | 'alternatif'. */
  typeScenario: string;
}

export interface GrilleStructureRef {
  codeStructure: string;
  libelle: string;
}

export interface GrilleCrRef {
  id: string;
  codeCr: string;
  libelle: string;
  structureRattachee: GrilleStructureRef | null;
}

export interface TotalMensuel {
  mois: string;
  total: number;
}

export interface GrilleSaisie {
  version: GrilleVersionRef;
  scenario: GrilleScenarioRef;
  cr: GrilleCrRef;
  exerciceFiscal: number;
  /** ['Janvier 2027', 'Février 2027', ...] — 12 entrées. */
  moisLabels: string[];
  comptesFeuillesEligibles: CompteEligible[];
  lignes: GrilleLigne[];
  totauxMensuels: TotalMensuel[];
  totalAnneeCr: number;
}

export interface GetGrilleSaisieQuery {
  versionId: string;
  scenarioId: string;
  crId: string;
  exerciceFiscal: number;
  /** Filtre classe PCB (ex. '6' pour charges, '7' pour produits). */
  classeCompte?: string;
}

export async function getGrilleSaisie(
  query: GetGrilleSaisieQuery,
): Promise<GrilleSaisie> {
  const { data } = await apiClient.get<GrilleSaisie>('/budget/grille', {
    params: query,
  });
  return data;
}

// ─── Types écriture (POST /budget/grille) ─────────────────────────

export interface CelluleGrilleEntree {
  /** Format YYYY-MM-01. */
  mois: string;
  montant: number;
  modeSaisie?: ModeSaisie;
  encoursMoyen?: number | null;
  tie?: number | null;
  commentaire?: string | null;
}

export interface LigneGrilleEntree {
  compteId: string;
  ligneMetierId: string;
  cellules: CelluleGrilleEntree[];
}

export interface GrilleSaveRequest {
  versionId: string;
  scenarioId: string;
  crId: string;
  lignes: LigneGrilleEntree[];
}

export interface ErreurCellule {
  ligneIndex: number;
  mois: string;
  message: string;
  /** Code d'erreur normalisé (COMPTE_AGREGE, COMPTE_NON_PORTEUR, …). */
  code: string;
}

export interface GrilleSaveResponse {
  totalCellules: number;
  inserees: number;
  modifiees: number;
  supprimees: number;
  ignorees: number;
  erreurs: ErreurCellule[];
  dureeMs: number;
}

export async function saveGrilleSaisie(
  request: GrilleSaveRequest,
): Promise<GrilleSaveResponse> {
  const { data } = await apiClient.post<GrilleSaveResponse>(
    '/budget/grille',
    request,
  );
  return data;
}
