/**
 * Tests PublicLayout (Lot 7.3 V5 — retrait du header banque).
 *
 * Couvre :
 *  - Rendu wordmark MIZNAS + sous-titre "Pilotage Budgétaire" ambre
 *  - Filet ambre signature présent
 *  - Slogan 2 lignes (APP_TAGLINE_LINE_1 + LINE_2)
 *  - Badge BCEAO "Conforme aux normes prudentielles BCEAO."
 *  - Footer version + sigle + année
 *  - SVG BackgroundChart rendu en arrière-plan
 *  - Gradient bleu nuit appliqué via style inline
 *  - children rendus dans la zone formulaire droite
 *  - Layout responsive (grid-cols-1 md:grid-cols-2)
 *
 * NB : les tests V4 du header (losange ambre + nom banque sur
 * 2 lignes) ont été retirés en V5 — le header n'existe plus dans
 * la zone identité après décision UX 2026-05-14.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  APP_TAGLINE_LINE_1,
  APP_TAGLINE_LINE_2,
  APP_VERSION,
  BANK_SIGLE,
  BANK_YEAR,
} from '@/lib/branding/bank';

import { PublicLayout } from './PublicLayout';

describe('PublicLayout (Lot 7.3 V4)', () => {
  afterEach(() => cleanup());

  it('rend le wordmark MIZNAS à 52 px (text-[52px])', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const wordmark = screen.getByTestId('public-layout-wordmark');
    expect(wordmark.textContent).toBe('MIZNAS');
    expect(wordmark.className).toContain('text-[52px]');
    expect(wordmark.className).toContain('font-bold');
  });

  it('rend le sous-titre « Pilotage Budgétaire » en couleur ambre', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const sousTitre = screen.getByTestId('public-layout-sous-titre');
    expect(sousTitre.textContent).toBe('Pilotage Budgétaire');
    expect(sousTitre.className).toContain('text-(--miznas-ambre)');
  });

  it('rend le filet ambre signature sous le wordmark', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const filet = screen.getByTestId('public-layout-filet-ambre');
    expect(filet).toBeInTheDocument();
    expect(filet.className).toContain('bg-(--miznas-ambre)');
  });

  it('rend le slogan sur 2 lignes (LINE_1 + <br /> + LINE_2)', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const slogan = screen.getByTestId('public-layout-slogan');
    expect(slogan.textContent).toContain(APP_TAGLINE_LINE_1);
    expect(slogan.textContent).toContain(APP_TAGLINE_LINE_2);
    // Présence d'un <br /> entre les 2 lignes — vérifiée via le DOM
    // (la maîtrise du retour à la ligne est volontaire, cf. bank.ts).
    expect(slogan.querySelector('br')).not.toBeNull();
  });

  it('rend le badge BCEAO "Conforme aux normes prudentielles BCEAO."', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    expect(
      screen.getByText('Conforme aux normes prudentielles BCEAO.'),
    ).toBeInTheDocument();
  });

  it('rend le footer avec version, sigle et année', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const footer = screen.getByTestId('public-layout-footer');
    expect(footer.textContent).toContain(`v${APP_VERSION}`);
    expect(footer.textContent).toContain(BANK_SIGLE);
    expect(footer.textContent).toContain(BANK_YEAR);
  });

  it('rend le SVG BackgroundChart décoratif (aria-hidden)', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const svg = screen.getByTestId('public-layout-background-chart');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applique le gradient bleu nuit (style inline) sur la zone identité', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const identite = screen.getByTestId('public-layout-identite');
    // Le gradient est appliqué via `style.background` inline pour
    // pouvoir interpoler les tokens CSS. JSDom expose les styles
    // inline tels quels.
    const bg = identite.style.background;
    expect(bg).toContain('linear-gradient');
    expect(bg).toContain('var(--miznas-bleu-nuit-dark)');
    expect(bg).toContain('var(--miznas-bleu-nuit-light)');
  });

  it('rend les children dans la zone formulaire droite', () => {
    render(
      <PublicLayout>
        <div data-testid="form-child">contenu formulaire</div>
      </PublicLayout>,
    );
    const main = screen.getByTestId('public-layout-form');
    const child = screen.getByTestId('form-child');
    expect(main).toContainElement(child);
  });

  it('applique le layout split responsive (stacked sur mobile, 50/50 sur desktop)', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const root = screen.getByTestId('public-layout');
    expect(root.className).toContain('grid-cols-1');
    expect(root.className).toContain('md:grid-cols-2');
    expect(root.className).toContain('min-h-screen');
  });
});
