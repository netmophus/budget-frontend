/**
 * Tests MiznasAiAnalysePanel (Lot 8.6.A frontend). Couvre les 3 états
 * (loading / error / success), les 2 callbacks (onFermer, onRetry) et
 * le badge dry-run conditionnel.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AnalyseAiResponse } from '@/lib/api/ai-analyse';
import { MiznasAiAnalysePanel } from './MiznasAiAnalysePanel';

function makeAnalyse(over: Partial<AnalyseAiResponse> = {}): AnalyseAiResponse {
  return {
    analyse:
      '## Synthèse\n\nÉcart total : 132 195 500 FCFA. 6 écarts CRITIQUE détectés.',
    model: 'claude-sonnet-4-6',
    tokensInput: 1234,
    tokensOutput: 567,
    dureeMs: 8420,
    dryRun: false,
    ...over,
  };
}

describe('MiznasAiAnalysePanel', () => {
  afterEach(() => cleanup());

  it('loading → affiche le skeleton avec le message "MIZNAS AI analyse"', () => {
    render(
      <MiznasAiAnalysePanel
        analyse={null}
        loading={true}
        error={null}
        onFermer={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('ai-panel-loading')).toBeInTheDocument();
    expect(screen.getByText(/MIZNAS AI analyse vos écarts/)).toBeInTheDocument();
  });

  it('error → affiche le message + bouton Réessayer qui appelle onRetry', () => {
    const onRetry = vi.fn();
    render(
      <MiznasAiAnalysePanel
        analyse={null}
        loading={false}
        error="Quota d'analyses atteint. Réessayez plus tard."
        onFermer={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId('ai-panel-error')).toBeInTheDocument();
    expect(screen.getByText(/Quota d'analyses atteint/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-panel-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('success → markdown rendu (heading H2), métadonnées affichées, X appelle onFermer', () => {
    const onFermer = vi.fn();
    render(
      <MiznasAiAnalysePanel
        analyse={makeAnalyse()}
        loading={false}
        error={null}
        onFermer={onFermer}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('ai-panel-success')).toBeInTheDocument();
    // Markdown rendu : H2 "Synthèse"
    expect(
      screen.getByRole('heading', { level: 2, name: /Synthèse/ }),
    ).toBeInTheDocument();
    // Métadonnées
    const meta = screen.getByTestId('ai-panel-meta');
    expect(meta.textContent).toMatch(/claude-sonnet-4-6/);
    expect(meta.textContent).toMatch(/8420/); // dureeMs
    expect(meta.textContent).toMatch(/1234/); // tokensInput
    expect(meta.textContent).toMatch(/567/); // tokensOutput
    // Disclaimer
    expect(
      screen.getByText(/doit être validée par un humain/),
    ).toBeInTheDocument();
    // Fermer
    fireEvent.click(screen.getByTestId('ai-panel-close'));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });

  it('success dryRun=true → badge "Mode test" visible', () => {
    render(
      <MiznasAiAnalysePanel
        analyse={makeAnalyse({ dryRun: true })}
        loading={false}
        error={null}
        onFermer={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('ai-panel-badge-dry-run')).toBeInTheDocument();
    expect(screen.getByText(/Mode test/)).toBeInTheDocument();
  });

  it('success dryRun=false → badge "Mode test" absent', () => {
    render(
      <MiznasAiAnalysePanel
        analyse={makeAnalyse({ dryRun: false })}
        loading={false}
        error={null}
        onFermer={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId('ai-panel-badge-dry-run'),
    ).not.toBeInTheDocument();
  });
});
