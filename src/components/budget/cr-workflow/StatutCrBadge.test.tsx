import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatutCrBadge } from './StatutCrBadge';

describe('StatutCrBadge', () => {
  it('affiche le libellé et la couleur selon le statut', () => {
    const { rerender } = render(<StatutCrBadge statut="EN_SAISIE" />);
    expect(screen.getByTestId('statut-cr-badge').textContent).toBe(
      'En cours de saisie',
    );
    expect(screen.getByTestId('statut-cr-badge').className).toContain(
      'bg-gray-200',
    );

    rerender(<StatutCrBadge statut="SOUMIS" />);
    expect(screen.getByTestId('statut-cr-badge').textContent).toBe(
      'Soumis au validateur',
    );
    expect(screen.getByTestId('statut-cr-badge').className).toContain(
      'bg-orange-500',
    );

    rerender(<StatutCrBadge statut="VALIDE" />);
    expect(screen.getByTestId('statut-cr-badge').textContent).toBe('Validé');
    expect(screen.getByTestId('statut-cr-badge').className).toContain(
      'bg-green-600',
    );
  });
});
