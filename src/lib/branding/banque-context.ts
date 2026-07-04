/**
 * Contexte branding banque (Lot B4) — séparé du provider pour respecter
 * `react-refresh/only-export-components` (le provider JSX est dans
 * `useBanque.tsx`, qui n'exporte qu'un composant).
 */
import { createContext, useContext } from 'react';

import type { ConfigurationBanquePublique } from '@/lib/api/configurationBanque';

/** Valeurs de repli (BSIC NIGER) — identiques au DEFAULT_BANK_BRANDING backend. */
export const DEFAULT_BANK_PUBLIC: ConfigurationBanquePublique = {
  nom: 'BSIC NIGER',
  sigle: 'BSIC',
  nomCommercialComplet:
    "Banque Sahélo-Saharienne pour l'Investissement et le Commerce",
  villeSiege: 'Niamey',
  pays: 'Niger',
  couleurPrimaire: '#1B2A4E',
  couleurPrimaireDark: '#0F1B33',
  couleurSecondaire: '#C49B3F',
  logoRef: null,
};

export interface BanqueContextValue {
  banque: ConfigurationBanquePublique;
  loading: boolean;
  /** Re-fetch (après une modification admin). */
  refresh: () => Promise<void>;
}

// Défaut = repli BSIC : `useBanque()` reste utilisable hors provider (tests
// unitaires de composants isolés) sans throw.
export const BanqueContext = createContext<BanqueContextValue>({
  banque: DEFAULT_BANK_PUBLIC,
  loading: false,
  refresh: async () => {},
});

export function useBanque(): BanqueContextValue {
  return useContext(BanqueContext);
}
