/**
 * Tests MiznasWordmark (Lot 7.3).
 *
 * Couvre :
 *  - rendu du texte « MIZNAS »
 *  - classes charte v1 (font-bold, tracking serré, leading-none,
 *    couleur token --miznas-bleu-nuit)
 *  - taille par défaut `md` (text-3xl)
 *  - variations de taille `sm`/`lg`/`xl`
 *  - propagation de `className` additionnelle
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MiznasWordmark } from './MiznasWordmark';

describe('MiznasWordmark (Lot 7.3)', () => {
  afterEach(() => cleanup());

  it('rend le texte « MIZNAS »', () => {
    render(<MiznasWordmark />);
    expect(screen.getByTestId('miznas-wordmark').textContent).toBe('MIZNAS');
  });

  it('applique les classes charte v1 (font-bold, tracking serré, leading-none, couleur token)', () => {
    render(<MiznasWordmark />);
    const el = screen.getByTestId('miznas-wordmark');
    expect(el.className).toContain('font-bold');
    expect(el.className).toContain('tracking-[-0.03em]');
    expect(el.className).toContain('leading-none');
    expect(el.className).toContain('text-(--miznas-bleu-nuit)');
  });

  it('utilise la taille `md` (text-3xl) par défaut', () => {
    render(<MiznasWordmark />);
    expect(screen.getByTestId('miznas-wordmark').className).toContain(
      'text-3xl',
    );
  });

  it.each([
    ['sm', 'text-xl'],
    ['md', 'text-3xl'],
    ['lg', 'text-5xl'],
    ['xl', 'text-6xl'],
    ['2xl', 'text-8xl'],
  ] as const)('applique la classe attendue pour size=%s', (size, expected) => {
    render(<MiznasWordmark size={size} />);
    expect(screen.getByTestId('miznas-wordmark').className).toContain(expected);
  });

  it('propage la prop `className` additionnelle', () => {
    render(<MiznasWordmark className="mb-4 custom-marker" />);
    const cls = screen.getByTestId('miznas-wordmark').className;
    expect(cls).toContain('mb-4');
    expect(cls).toContain('custom-marker');
    // Les classes par défaut restent appliquées (cn ne les écrase pas).
    expect(cls).toContain('font-bold');
  });
});
