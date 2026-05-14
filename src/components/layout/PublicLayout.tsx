/**
 * PublicLayout (Lot 7.3 V3 — hiérarchie re-équilibrée).
 *
 * Wrapper partagé pour les pages d'authentification publiques.
 * Layout split 50/50 sur desktop, stacked vertical sur mobile.
 *
 * Zone identité (gauche) — hiérarchie typographique resserrée :
 *  - Nom légal banque       : 14 px, weight 500, bleu nuit lisible
 *  - Wordmark MIZNAS        : 30 px (mobile) → 36 px (≥md)
 *                              dominant mais pas écrasant
 *  - Tagline produit        : 14 px, muted, lisible
 *  - Mention prudentielle   : 12 px, muted, max-width contenu
 *  - Footer version+sigle   : 11 px, muted
 *  - Filet ambre signature  : 12 × 3 px sous le wordmark (charte v1)
 *  - Fond crème UNI (pas de motif décoratif — Lot 7.3 V3)
 *
 * Zone formulaire (droite) :
 *  - Fond standard, padding généreux, centre vertical strict
 *  - children rendus tels quels (la page consommatrice contrôle
 *    son layout interne — typiquement une Card encadrée)
 *
 * Responsive :
 *  - md+ (≥768 px) : split 50/50, min-h-screen sur chaque colonne
 *  - <md (mobile)  : stacked vertical, min-h-fit sur la zone identité
 *
 * Animations au mount : fade-in staggered (0/100/200/300 ms) sur les
 * 4 blocs de la zone identité — discret, ~300 ms total. Pas de
 * slide pour respecter le ton sobre.
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

const ANIM_BASE = 'animate-in fade-in duration-500 fill-mode-both';

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
        {/* Header — nom légal banque, lisible et sérieux */}
        <header className={`${ANIM_BASE} delay-0`}>
          <div className="text-sm font-medium text-(--miznas-bleu-nuit) leading-snug">
            {BANK_NAME}
          </div>
        </header>

        {/* Centre — wordmark + filet ambre + tagline + mention BCEAO */}
        <div>
          <div className={`${ANIM_BASE} delay-100`}>
            <MiznasWordmark size="md" className="md:text-4xl" />
            <div
              className="h-[3px] w-12 bg-(--miznas-ambre) mt-3"
              data-testid="public-layout-filet-ambre"
              aria-hidden="true"
            />
          </div>
          <p
            className={`text-sm text-(--muted-foreground) mt-5 leading-relaxed ${ANIM_BASE} delay-200`}
          >
            Module Budgétaire Bancaire UEMOA
          </p>
          <hr className="border-0 border-t border-(--border) w-16 my-6" />
          <p
            className={`text-xs text-(--muted-foreground) leading-relaxed max-w-xs ${ANIM_BASE} delay-300`}
          >
            Outil de pilotage budgétaire conforme aux normes
            prudentielles BCEAO.
          </p>
        </div>

        {/* Footer — version + sigle + année */}
        <footer
          className={`text-[11px] text-(--muted-foreground) ${ANIM_BASE} delay-300`}
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
