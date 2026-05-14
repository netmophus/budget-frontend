/**
 * PublicLayout (Lot 7.3 V4 — refonte selon maquette validée).
 *
 * Wrapper partagé pour les pages d'authentification publiques.
 * Layout split 50/50 sur desktop, stacked vertical sur mobile.
 *
 * Zone identité (gauche) — fond gradient bleu nuit + identité riche :
 *  - Gradient `linear-gradient(135deg, dark → light)` sur les tokens
 *    `--miznas-bleu-nuit-dark` (#0A1F44) → `--miznas-bleu-nuit-light`
 *    (#133869). Texte blanc sur l'ensemble.
 *  - Header : losange ambre (rotation 45°) contenant un « B » contra-
 *    rotaté, + nom légal banque sur 2 lignes (titre + sous-titre).
 *  - Centre : wordmark MIZNAS 52 px + sous-titre "Pilotage Budgétaire"
 *    28 px en ambre, filet ambre signature, slogan sur 2 lignes,
 *    badge "Conforme normes prudentielles BCEAO" (bouclier).
 *  - Footer : version + sigle + année, très discret.
 *  - SVG BackgroundChart en absolute bottom (opacity ~12 %) — ligne
 *    + barres ascendantes ambre, signature graphique du métier.
 *
 * Zone formulaire (droite) :
 *  - Fond blanc, padding généreux, centre vertical strict
 *  - children rendus tels quels (LoginPage gère sa propre mise en page).
 */
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  APP_TAGLINE_LINE_1,
  APP_TAGLINE_LINE_2,
  APP_VERSION,
  BANK_SIGLE,
  BANK_YEAR,
} from '@/lib/branding/bank';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white"
      data-testid="public-layout"
    >
      <IdentityZone />
      <main
        className="bg-white px-12 py-14 flex flex-col justify-center min-h-fit md:min-h-screen"
        data-testid="public-layout-form"
      >
        {children}
      </main>
    </div>
  );
}

function IdentityZone() {
  return (
    <aside
      className="relative overflow-hidden px-12 py-14 flex flex-col justify-between min-h-fit md:min-h-screen text-white"
      style={{
        background:
          'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
      }}
      data-testid="public-layout-identite"
    >
      <BackgroundChart />

      {/* ─── Header — losange ambre + nom banque (2 lignes) ──────── */}
      <header className="relative z-10 flex items-center gap-3">
        <div
          className="w-8 h-8 bg-(--miznas-ambre) rounded flex items-center justify-center"
          style={{ transform: 'rotate(45deg)' }}
          aria-hidden="true"
          data-testid="public-layout-losange"
        >
          <span
            className="text-sm font-bold text-(--miznas-bleu-nuit-dark)"
            style={{ transform: 'rotate(-45deg)' }}
          >
            B
          </span>
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">
            Banque sahélo-saharienne
          </div>
          <div className="text-[10px] opacity-55 leading-tight mt-0.5">
            pour l&apos;investissement et le commerce
          </div>
        </div>
      </header>

      {/* ─── Centre — wordmark + sous-titre + filet + slogan + bouclier ── */}
      <div className="relative z-10">
        <div
          className="text-[52px] font-bold tracking-[-0.035em] leading-none mb-1"
          data-testid="public-layout-wordmark"
        >
          MIZNAS
        </div>
        <div
          className="text-[28px] font-bold text-(--miznas-ambre) tracking-[-0.02em] leading-none mb-7"
          data-testid="public-layout-sous-titre"
        >
          Pilotage Budgétaire
        </div>

        <div
          className="w-16 h-[3px] bg-(--miznas-ambre) mb-6"
          aria-hidden="true"
          data-testid="public-layout-filet-ambre"
        />

        <p
          className="text-[17px] opacity-90 leading-snug mb-6 max-w-[360px]"
          data-testid="public-layout-slogan"
        >
          {APP_TAGLINE_LINE_1}
          <br />
          {APP_TAGLINE_LINE_2}
        </p>

        <div className="inline-flex items-center gap-2 bg-white/[0.06] px-3 py-2 rounded-md">
          <ShieldCheck
            className="w-4 h-4 text-(--miznas-ambre)"
            aria-hidden="true"
          />
          <span className="text-xs opacity-80">
            Conforme aux normes prudentielles BCEAO.
          </span>
        </div>
      </div>

      {/* ─── Footer — version + sigle + année ───────────────────── */}
      <footer
        className="relative z-10 text-[10px] opacity-40 tracking-wider"
        data-testid="public-layout-footer"
      >
        v{APP_VERSION} · {BANK_SIGLE} {BANK_YEAR}
      </footer>
    </aside>
  );
}

/**
 * SVG décoratif posé en bas de la zone identité — ligne + barres
 * ascendantes ambre, opacity ~12 %. Évoque la croissance budgétaire
 * sans capter l'attention.
 *
 * `aria-hidden` strict : c'est purement décoratif, les lecteurs
 * d'écran doivent l'ignorer.
 */
function BackgroundChart() {
  return (
    <svg
      className="absolute bottom-[-20px] left-0 right-0 opacity-[0.12] pointer-events-none"
      viewBox="0 0 500 200"
      preserveAspectRatio="none"
      width="100%"
      height="200"
      aria-hidden="true"
      data-testid="public-layout-background-chart"
    >
      <polyline
        points="0,180 50,165 100,150 150,140 200,120 250,100 300,75 350,55 400,40 450,25 500,15"
        stroke="#BA7517"
        strokeWidth="2"
        fill="none"
      />
      <g fill="#BA7517">
        <rect x="40" y="165" width="20" height="20" />
        <rect x="90" y="150" width="20" height="35" />
        <rect x="140" y="138" width="20" height="47" />
        <rect x="190" y="118" width="20" height="67" />
        <rect x="240" y="98" width="20" height="87" />
        <rect x="290" y="73" width="20" height="112" />
        <rect x="340" y="53" width="20" height="132" />
        <rect x="390" y="38" width="20" height="147" />
        <rect x="440" y="23" width="20" height="162" />
      </g>
    </svg>
  );
}
