/**
 * MiznasAiAnalysePanel (Lot 8.6.A frontend) — panneau inline
 * affichant l'analyse markdown produite par MIZNAS AI sur le
 * dashboard Budget vs Réalisé.
 *
 * 3 états visuels mutuellement exclusifs :
 *  - Loading : skeleton avec icône Sparkles animée + message
 *    « MIZNAS AI analyse vos écarts… ». L'utilisateur peut attendre
 *    8-15 s (appel synchrone Anthropic). Pas de cancel pour MVP.
 *  - Error : encadré rouge + bouton « Réessayer » qui rappelle
 *    `onRetry` (utile pour 429 transitoires ou 502 SDK).
 *  - Success : carte blanche bordée violet REALISE (#5B4E91) avec
 *    header (icône + titre + close X), body markdown rendu via
 *    react-markdown + remark-gfm (tables, listes, gras), footer
 *    métadonnées (modèle, tokens, durée, date) + badge « Mode test »
 *    si dryRun + disclaimer « doit être validée par un humain ».
 *
 * Pattern conteneur projet : `<div className="bg-white border …
 * rounded-md">` (pas de shadcn Card). Cohérent avec les autres
 * composants du tableau de bord (KpiCardsRow, EcartsDonutNiveaux…).
 */
import { AlertCircle, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import type { AnalyseAiResponse } from '@/lib/api/ai-analyse';

interface Props {
  analyse: AnalyseAiResponse | null;
  loading: boolean;
  error: string | null;
  onFermer: () => void;
  onRetry: () => void;
}

const COULEUR_REALISE = '#5B4E91'; // --miznas-cat-realise

function formatDateNow(): string {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MiznasAiAnalysePanel({
  analyse,
  loading,
  error,
  onFermer,
  onRetry,
}: Props): JSX.Element | null {
  if (loading) {
    return (
      <div
        className="bg-white border-2 rounded-md p-6 mb-4"
        style={{ borderColor: `${COULEUR_REALISE}40` }}
        data-testid="ai-panel-loading"
      >
        <div className="flex items-center gap-3">
          <Sparkles
            className="w-5 h-5 animate-pulse"
            style={{ color: COULEUR_REALISE }}
            aria-hidden="true"
          />
          <div className="flex-1">
            <div
              className="text-sm font-semibold"
              style={{ color: COULEUR_REALISE }}
            >
              MIZNAS AI analyse vos écarts…
            </div>
            <p className="text-xs text-(--muted-foreground) mt-1">
              Cela peut prendre 8 à 15 secondes selon la taille du
              périmètre.
            </p>
          </div>
        </div>
        {/* Skeleton lignes */}
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-(--muted) rounded animate-pulse w-3/4" />
          <div className="h-3 bg-(--muted) rounded animate-pulse w-full" />
          <div className="h-3 bg-(--muted) rounded animate-pulse w-5/6" />
          <div className="h-3 bg-(--muted) rounded animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        className="rounded-md border p-4 mb-4 flex items-start gap-3"
        style={{
          borderColor: '#DC262640',
          backgroundColor: '#DC26260D',
        }}
        data-testid="ai-panel-error"
      >
        <AlertCircle
          className="w-5 h-5 mt-0.5 shrink-0"
          style={{ color: '#DC2626' }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>
            MIZNAS AI — erreur
          </div>
          <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
            {error}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              data-testid="ai-panel-retry"
            >
              Réessayer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onFermer}
              data-testid="ai-panel-error-close"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (analyse === null) return null;

  return (
    <div
      className="bg-white border-2 rounded-md mb-4"
      style={{ borderColor: `${COULEUR_REALISE}40` }}
      data-testid="ai-panel-success"
    >
      {/* ─── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-(--border)"
        style={{ backgroundColor: `${COULEUR_REALISE}0D` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className="w-4 h-4"
            style={{ color: COULEUR_REALISE }}
            aria-hidden="true"
          />
          <h4
            className="text-sm font-semibold m-0"
            style={{ color: COULEUR_REALISE }}
          >
            Analyse MIZNAS AI
          </h4>
          {analyse.dryRun && (
            <span
              className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-sm"
              style={{
                backgroundColor: '#BA751714',
                color: '#BA7517',
              }}
              data-testid="ai-panel-badge-dry-run"
            >
              Mode test (DRY_RUN)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          className="p-1 rounded-md hover:bg-(--muted)"
          aria-label="Fermer le panneau MIZNAS AI"
          data-testid="ai-panel-close"
        >
          <X className="w-4 h-4 text-(--muted-foreground)" />
        </button>
      </div>

      {/* ─── Body markdown ───────────────────────────────────── */}
      <div className="px-4 py-4 prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {analyse.analyse}
        </ReactMarkdown>
      </div>

      {/* ─── Footer métadonnées ──────────────────────────────── */}
      <div className="px-4 py-3 border-t border-(--border) bg-(--secondary)/40">
        <div
          className="text-[10px] text-(--muted-foreground) tabular-nums flex flex-wrap gap-x-3 gap-y-1"
          data-testid="ai-panel-meta"
        >
          <span>
            Modèle : <strong>{analyse.model}</strong>
          </span>
          <span>·</span>
          <span>
            Durée : <strong>{analyse.dureeMs}</strong> ms
          </span>
          <span>·</span>
          <span>
            Tokens : <strong>{analyse.tokensInput}</strong> in /{' '}
            <strong>{analyse.tokensOutput}</strong> out
          </span>
          <span>·</span>
          <span>
            Généré le <strong>{formatDateNow()}</strong>
          </span>
        </div>
        <p className="text-[10px] italic text-(--muted-foreground) mt-2 leading-relaxed">
          Cette analyse est générée automatiquement et doit être validée
          par un humain. MIZNAS AI ne remplace pas l&apos;expertise
          d&apos;un contrôleur de gestion.
        </p>
      </div>
    </div>
  );
}
