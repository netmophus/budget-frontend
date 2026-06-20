/** Tests EnteteImpression (palier 7.4). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnteteImpression } from './EnteteImpression';

describe('EnteteImpression', () => {
  it('affiche logo + titre + référence version + date', () => {
    render(
      <EnteteImpression
        titre="Détail du Centre de Responsabilité"
        version={{ codeVersion: 'BUDGET_2027_V1', libelle: 'Budget 2027' }}
        dateGeneration="20/06/2026 10:30"
      />,
    );
    expect(screen.getByText('BSIC NIGER')).toBeInTheDocument();
    expect(
      screen.getByText('Détail du Centre de Responsabilité'),
    ).toBeInTheDocument();
    expect(screen.getByText('BUDGET_2027_V1')).toBeInTheDocument();
    expect(screen.getByText(/Budget 2027/)).toBeInTheDocument();
    expect(screen.getByText(/20\/06\/2026 10:30/)).toBeInTheDocument();
    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', '/assets/logo-fictif.svg');
  });
});
