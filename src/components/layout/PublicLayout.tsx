/**
 * PublicLayout (Lot 7.3) — wrapper partagé pour les pages
 * d'authentification publiques (LoginPage cible Lot 7.3 ;
 * ForgotPasswordPage / ResetPasswordPage / ForceChangePasswordPage
 * suivront en Lot 7.4).
 *
 * Layout split 50/50 sur desktop (≥768 px) :
 *  - Zone identité gauche (crème charte v1) : wordmark MIZNAS,
 *    nom légal banque, tagline, filet, mention prudentielle,
 *    version + sigle + année en footer.
 *  - Zone formulaire droite (fond standard) : `children` (formulaire
 *    de la page consommatrice).
 *
 * Sur mobile (<768 px), bascule en stacked vertical : zone identité
 * en haut avec hauteur naturelle (pas de plein écran imposé), zone
 * formulaire dessous.
 *
 * Charte v1 stricte :
 *  - Fond identité : `--miznas-creme`
 *  - Wordmark via <MiznasWordmark size="xl"> (60 px desktop)
 *  - Pas de gradient, pas d'ombre portée, pas de glow
 *
 * Tokens shadcn utilisés (pas de tokens fantaisistes) :
 *  - --muted-foreground   pour le nom légal banque + mention + footer
 *  - --border             pour le filet décoratif
 *  - --background         pour la zone formulaire
 */
import type { ReactNode } from 'react';

import { MiznasWordmark } from '@/components/branding/MiznasWordmark';
import {
  APP_VERSION,
  BANK_NAME,
  BANK_SIGLE,
  BANK_YEAR,
} from '@/lib/branding/bank';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className="min-h-screen grid grid-cols-1 md:grid-cols-2"
      data-testid="public-layout"
    >
      {/* ─── Zone identité (gauche) ────────────────────────────────── */}
      <aside
        className="bg-(--miznas-creme) px-10 py-12 flex flex-col justify-between min-h-fit md:min-h-screen"
        data-testid="public-layout-identite"
      >
        {/* Header — nom légal banque en small-caps */}
        <header>
          <div className="text-[11px] uppercase tracking-[0.08em] text-(--muted-foreground)">
            {BANK_NAME}
          </div>
        </header>

        {/* Centre — wordmark + tagline + filet + mention prudentielle */}
        <div>
          <MiznasWordmark size="xl" />
          <p className="text-[15px] text-(--muted-foreground) mt-3 leading-relaxed">
            Module Budgétaire Bancaire UEMOA
          </p>
          <hr className="border-0 border-t border-(--border) w-16 my-6" />
          <p className="text-xs text-(--muted-foreground) leading-relaxed">
            Outil de pilotage budgétaire conforme aux normes
            prudentielles BCEAO.
          </p>
        </div>

        {/* Footer — version + sigle + année */}
        <footer
          className="text-[11px] text-(--muted-foreground)"
          data-testid="public-layout-footer"
        >
          v{APP_VERSION} · {BANK_SIGLE} {BANK_YEAR}
        </footer>
      </aside>

      {/* ─── Zone formulaire (droite) ──────────────────────────────── */}
      <main
        className="bg-(--background) px-10 py-12 flex flex-col justify-center min-h-fit md:min-h-screen"
        data-testid="public-layout-form"
      >
        {children}
      </main>
    </div>
  );
}
