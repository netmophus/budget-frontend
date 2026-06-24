/**
 * API client — toggle global du mode de saisie du réalisé (Palier 1).
 *   GET   /configuration/realise  → mode courant (CONFIGURATION.LIRE)
 *   PATCH /configuration/realise  → modifie le mode (CONFIGURATION.GERER)
 */
import { apiClient } from './client';

export type ModeSaisieRealise = 'CENTRALISE' | 'DECENTRALISE' | 'MIXTE';

export const MODES_SAISIE_REALISE: ModeSaisieRealise[] = [
  'CENTRALISE',
  'DECENTRALISE',
  'MIXTE',
];

export const MODE_SAISIE_REALISE_LABEL: Record<ModeSaisieRealise, string> = {
  CENTRALISE: 'Centralisé — Direction Finance (import)',
  DECENTRALISE: 'Décentralisé — saisie par CR',
  MIXTE: 'Mixte — saisie ET import',
};

export const MODE_SAISIE_REALISE_DESCRIPTION: Record<
  ModeSaisieRealise,
  string
> = {
  CENTRALISE:
    "Seul l'import (Direction Finance) alimente le réalisé. La saisie manuelle est désactivée.",
  DECENTRALISE:
    'Les saisisseurs saisissent le réalisé de leur centre de responsabilité.',
  MIXTE: 'Saisie manuelle et import sont autorisés simultanément.',
};

export async function getModeSaisieRealise(): Promise<ModeSaisieRealise> {
  const { data } = await apiClient.get<{ mode: ModeSaisieRealise }>(
    '/configuration/realise',
  );
  return data.mode;
}

export async function setModeSaisieRealise(
  mode: ModeSaisieRealise,
): Promise<ModeSaisieRealise> {
  const { data } = await apiClient.patch<{ mode: ModeSaisieRealise }>(
    '/configuration/realise',
    { mode },
  );
  return data.mode;
}
