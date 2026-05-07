/**
 * Utility partagée Lot 5.1.B-fix1 — résout un mois `YYYY-MM` vers
 * l'`id` de `dim_temps` correspondant au 1er du mois.
 *
 * Refactorée hors de RealiseSaisiePage pour être testable
 * unitairement et réutilisable.
 *
 * Stratégie :
 *  1. Validation locale stricte (regex YYYY-MM + mois 01..12).
 *     Évite tout appel API inutile pour un input mal formé.
 *  2. Cache local fourni par l'appelant (Map id → mois) pour éviter
 *     les requêtes répétées.
 *  3. Fallback API : `getJourByDate('YYYY-MM-01')` qui appelle
 *     l'endpoint dédié `GET /referentiels/temps/par-date/:date`.
 *     Pas le listing : le DTO `ListTempsQueryDto` ne supporte pas
 *     les params `date` ni `jour`, ce qui était la cause du bug
 *     initial Lot 5.1.B (le frontend tapait
 *     `/referentiels/temps?date=...&jour=1` qui se faisait stripper
 *     les params en silence par `whitelist: true` du ValidationPipe).
 *
 * Retourne `null` si :
 *  - format invalide
 *  - mois absent de dim_temps (404 sur l'endpoint par-date)
 *  - tout autre échec API (réseau, etc.).
 */
import { AxiosError } from 'axios';

import { getJourByDate } from '@/lib/api/referentiels';

export interface CacheTemps {
  [id: string]: { mois: string };
}

export async function resolveFkTemps(
  mois: string,
  cache: CacheTemps = {},
): Promise<string | null> {
  // 1. Validation locale (regex YYYY-MM + mois ∈ [01..12])
  const m = /^(\d{4})-(\d{2})$/.exec(mois);
  if (!m) return null;
  const moisNum = Number(m[2]);
  if (moisNum < 1 || moisNum > 12) return null;

  // 2. Cache local
  for (const [id, t] of Object.entries(cache)) {
    if (t.mois === mois) return id;
  }

  // 3. API : endpoint dédié par-date/:date
  try {
    const jour = await getJourByDate(`${mois}-01`);
    return jour.id;
  } catch (err) {
    // 404 = jour absent de dim_temps (calendrier non seedé pour ce mois)
    // — on retourne null silencieusement. Toute autre erreur bubble.
    if (err instanceof AxiosError && err.response?.status === 404) {
      return null;
    }
    if (err instanceof AxiosError) {
      // Erreur réseau / 5xx : on retourne null pour ne pas casser l'UI,
      // l'appelant gère via un toast. (Diagnostic remontable via console.)
      return null;
    }
    return null;
  }
}
