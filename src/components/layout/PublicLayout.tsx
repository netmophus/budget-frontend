/**
 * PublicLayout (Lot 7.3 V2 — refonte esthétique premium).
 *
 * Wrapper partagé pour les pages d'authentification publiques.
 * Layout split 50/50 sur desktop, stacked vertical sur mobile.
 *
 * Zone identité (gauche) :
 *  - Fond crème charte v1 + motif de points bleu nuit ~5 % opacité
 *    (signature graphique discrète, inspirée des grilles
 *    budgétaires UEMOA)
 *  - Wordmark MIZNAS XL (text-7xl mobile → text-8xl ≥xl) sur la
 *    /login ; par défaut taille xl pour les autres pages publiques.
 *  - Filet ambre court (12 px × 3 px) en signature sous le wordmark
 *  - Tagline + mention prudentielle BCEAO + footer version + sigle
 *  - Animations staggered au mount (fade-in + slide-in-from-bottom-1
 *    avec delays 0/100/200/300 ms) — discret, ~400 ms total
 *
 * Zone formulaire (droite) :
 *  - Fond standard, padding généreux, centre vertical strict
 *  - children rendus tels quels (la page consommatrice contrôle
 *    son layout interne)
 *
 * Responsive :
 *  - md+ (≥768 px) : split 50/50, min-h-screen sur chaque colonne
 *  - <md (mobile)  : stacked vertical, min-h-fit sur la zone
 *    identité (ne mange pas tout l'écran sur téléphone)
 *
 * Tokens shadcn utilisés (pas de tokens fantaisistes) :
 *  --muted-foreground, --border, --background
 * Plus :
 *  --miznas-creme (fond identité), --miznas-bleu-nuit (motif points,
 *  wordmark), --miznas-ambre (filet signature).
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

const ANIM_BASE =
  'animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both';

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className="min-h-screen grid grid-cols-1 md:grid-cols-2"
      data-testid="public-layout"
    >
      {/* ─── Zone identité (gauche) ────────────────────────────────── */}
      <aside
        className="relative bg-(--miznas-creme) px-10 py-12 flex flex-col justify-between min-h-fit md:min-h-screen overflow-hidden"
        data-testid="public-layout-identite"
        // Motif de points bleu nuit ~5 % opacité — signature visuelle
        // discrète, inspirée des grilles comptables. `color-mix` permet
        // de garder le token --miznas-bleu-nuit comme source unique de
        // vérité couleur.
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in oklab, #0C447C 6%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Header — nom légal banque en small-caps */}
        <header className={`${ANIM_BASE} delay-0`}>
          <div className="text-[11px] uppercase tracking-[0.08em] text-(--muted-foreground)">
            {BANK_NAME}
          </div>
        </header>

        {/* Centre — wordmark + filet signature + tagline + mention */}
        <div className="relative">
          <div className={`${ANIM_BASE} delay-100`}>
            <MiznasWordmark
              size="xl"
              className="md:text-7xl xl:text-8xl"
            />
            {/* Filet ambre signature (Lot 7.3 V2) — accent discret
                directement sous le wordmark. */}
            <div
              className="h-[3px] w-12 bg-(--miznas-ambre) mt-4"
              data-testid="public-layout-filet-ambre"
              aria-hidden="true"
            />
          </div>
          <p
            className={`text-[15px] text-(--muted-foreground) mt-5 leading-relaxed ${ANIM_BASE} delay-200`}
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
