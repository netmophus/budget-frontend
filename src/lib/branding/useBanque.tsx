/**
 * BanqueProvider (Lot B4) — branding banque chargé au RUNTIME.
 *
 * Au démarrage, fetch `GET /configuration-banque/public` (endpoint @Public,
 * sans auth) et expose l'identité + charte via le contexte défini dans
 * `banque-context.ts`.
 *
 *  - Splash minimal pendant le fetch initial.
 *  - Cache en mémoire (une seule requête au boot).
 *  - Fallback `DEFAULT_BANK_PUBLIC` (valeurs BSIC NIGER) si le fetch échoue.
 *  - `refresh()` pour re-fetcher après une modification admin.
 *
 * Le hook `useBanque` et `DEFAULT_BANK_PUBLIC` sont exportés depuis
 * `banque-context.ts` (ce fichier n'exporte qu'un composant — Fast Refresh).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import {
  getConfigurationPublique,
  type ConfigurationBanquePublique,
} from '@/lib/api/configurationBanque';
import { APP_NAME } from './bank';
import { BanqueContext, DEFAULT_BANK_PUBLIC } from './banque-context';

export function BanqueProvider({ children }: { children: ReactNode }) {
  const [banque, setBanque] =
    useState<ConfigurationBanquePublique>(DEFAULT_BANK_PUBLIC);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setBanque(await getConfigurationPublique());
    } catch {
      // Fallback silencieux — l'app doit démarrer même API indisponible.
      setBanque(DEFAULT_BANK_PUBLIC);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void load().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  // Titre navigateur synchronisé sur le nom de la banque.
  useEffect(() => {
    document.title = `${APP_NAME} — ${banque.nom}`;
  }, [banque.nom]);

  if (loading) return <BanqueSplash />;

  return (
    <BanqueContext.Provider value={{ banque, loading, refresh: load }}>
      {children}
    </BanqueContext.Provider>
  );
}

/** Splash minimal affiché pendant le fetch initial du branding. */
function BanqueSplash() {
  return (
    <div
      data-testid="banque-splash"
      className="flex h-screen w-screen items-center justify-center bg-white"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--primary) border-t-transparent" />
        <p className="text-sm text-(--muted-foreground)">
          MIZNAS — chargement…
        </p>
      </div>
    </div>
  );
}
