/**
 * API client — Configuration banque (Lot B4, multi-banques).
 *
 *   GET    /configuration-banque          → config complète + membres (BANQUE.GERER)
 *   PUT    /configuration-banque          → mise à jour partielle    (BANQUE.GERER)
 *   POST   /configuration-banque/membres  → ajoute un membre Comité  (BANQUE.GERER)
 *   PUT    /configuration-banque/membres/:id → modifie un membre     (BANQUE.GERER)
 *   DELETE /configuration-banque/membres/:id → désactive un membre   (BANQUE.GERER)
 *   GET    /configuration-banque/public   → whitelist branding       (@Public, sans auth)
 */
import { apiClient } from './client';

export type FonctionComite = 'PRESIDENT' | 'MEMBRE' | 'SECRETAIRE' | 'DG';

export const FONCTIONS_COMITE: FonctionComite[] = [
  'PRESIDENT',
  'MEMBRE',
  'SECRETAIRE',
  'DG',
];

export const FONCTION_COMITE_LABEL: Record<FonctionComite, string> = {
  PRESIDENT: 'Président',
  MEMBRE: 'Membre',
  SECRETAIRE: 'Secrétaire',
  DG: 'Directeur Général',
};

export interface MembreComite {
  id: string;
  nomPrenom: string;
  titre: string | null;
  fonction: FonctionComite;
  ordreAffichage: number;
  estActif: boolean;
}

export interface ConfigurationBanque {
  nom: string;
  sigle: string;
  nomCommercialComplet: string | null;
  formeJuridique: string | null;
  groupe: string | null;
  siegeSocial: string | null;
  villeSiege: string | null;
  pays: string | null;
  telephone: string | null;
  emailContact: string | null;
  refReglementaireBceao: string | null;
  exerciceFiscalLibelle: string | null;
  couleurPrimaire: string;
  couleurPrimaireDark: string;
  couleurSecondaire: string;
  logoRef: string | null;
  contexteMarche: string | null;
  concurrents: string | null;
  positionnement: string | null;
  membres: MembreComite[];
}

/** Version publique (whitelist stricte) exposée sans auth pour le branding. */
export interface ConfigurationBanquePublique {
  nom: string;
  sigle: string;
  nomCommercialComplet: string | null;
  villeSiege: string | null;
  pays: string | null;
  couleurPrimaire: string;
  couleurPrimaireDark: string;
  couleurSecondaire: string;
  logoRef: string | null;
}

export interface UpdateConfigurationBanqueDto {
  nom?: string;
  sigle?: string;
  nomCommercialComplet?: string;
  formeJuridique?: string;
  groupe?: string;
  siegeSocial?: string;
  villeSiege?: string;
  pays?: string;
  telephone?: string;
  emailContact?: string;
  refReglementaireBceao?: string;
  exerciceFiscalLibelle?: string;
  couleurPrimaire?: string;
  couleurPrimaireDark?: string;
  couleurSecondaire?: string;
  logoRef?: string;
  contexteMarche?: string;
  concurrents?: string;
  positionnement?: string;
}

export interface CreateMembreComiteDto {
  nomPrenom: string;
  titre?: string;
  fonction: FonctionComite;
  ordreAffichage?: number;
}

export interface UpdateMembreComiteDto {
  nomPrenom?: string;
  titre?: string;
  fonction?: FonctionComite;
  ordreAffichage?: number;
  estActif?: boolean;
}

export async function getConfigurationBanque(): Promise<ConfigurationBanque> {
  const { data } = await apiClient.get<ConfigurationBanque>(
    '/configuration-banque',
  );
  return data;
}

export async function updateConfigurationBanque(
  dto: UpdateConfigurationBanqueDto,
): Promise<ConfigurationBanque> {
  const { data } = await apiClient.put<ConfigurationBanque>(
    '/configuration-banque',
    dto,
  );
  return data;
}

export async function createMembreComite(
  dto: CreateMembreComiteDto,
): Promise<MembreComite> {
  const { data } = await apiClient.post<MembreComite>(
    '/configuration-banque/membres',
    dto,
  );
  return data;
}

export async function updateMembreComite(
  id: string,
  dto: UpdateMembreComiteDto,
): Promise<MembreComite> {
  const { data } = await apiClient.put<MembreComite>(
    `/configuration-banque/membres/${id}`,
    dto,
  );
  return data;
}

export async function deleteMembreComite(id: string): Promise<MembreComite> {
  const { data } = await apiClient.delete<MembreComite>(
    `/configuration-banque/membres/${id}`,
  );
  return data;
}

export async function getConfigurationPublique(): Promise<ConfigurationBanquePublique> {
  const { data } = await apiClient.get<ConfigurationBanquePublique>(
    '/configuration-banque/public',
  );
  return data;
}
