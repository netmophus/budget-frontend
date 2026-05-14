/**
 * Tests PublicLayout (Lot 7.3).
 *
 * Couvre :
 *  - rendu zone identité gauche (BANK_NAME + MiznasWordmark + tagline
 *    + mention prudentielle + footer version/sigle/année)
 *  - rendu des children dans la zone droite
 *  - classes responsive (grid-cols-1 md:grid-cols-2 + min-h-fit md:min-h-screen)
 *  - fond crème charte v1 sur la zone identité
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  APP_VERSION,
  BANK_NAME,
  BANK_SIGLE,
  BANK_YEAR,
} from '@/lib/branding/bank';

import { PublicLayout } from './PublicLayout';

describe('PublicLayout (Lot 7.3)', () => {
  afterEach(() => cleanup());

  it('rend le nom légal complet de la banque dans le header identité', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    expect(screen.getByText(BANK_NAME)).toBeInTheDocument();
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

  it('rend le wordmark MIZNAS dans la zone identité', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    const wordmark = screen.getByTestId('miznas-wordmark');
    expect(wordmark.textContent).toBe('MIZNAS');
    // Taille md (text-3xl, ~30 px) base — Lot 7.3 V3 a re-équilibré
    // la hiérarchie typographique de la zone identité (auparavant
    // text-6xl en V2). Override responsive md:text-4xl (~36 px)
    // appliqué depuis PublicLayout via className.
    expect(wordmark.className).toContain('text-3xl');
    expect(wordmark.className).toContain('md:text-4xl');
  });

  it('rend la tagline « Module Budgétaire Bancaire UEMOA » et la mention BCEAO', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    expect(
      screen.getByText('Module Budgétaire Bancaire UEMOA'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/normes prudentielles BCEAO/i),
    ).toBeInTheDocument();
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
    expect(child.textContent).toBe('contenu formulaire');
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

  it('applique le fond crème charte v1 sur la zone identité', () => {
    render(
      <PublicLayout>
        <span>form</span>
      </PublicLayout>,
    );
    expect(
      screen.getByTestId('public-layout-identite').className,
    ).toContain('bg-(--miznas-creme)');
  });
});
