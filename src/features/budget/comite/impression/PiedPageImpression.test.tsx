/** Tests PiedPageImpression (palier 7.4). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PiedPageImpression } from './PiedPageImpression';

describe('PiedPageImpression', () => {
  it('affiche « généré le X par Y » + mention usage interne', () => {
    render(
      <PiedPageImpression
        dateGeneration="20/06/2026 10:30"
        utilisateur="Halima Ousmane"
      />,
    );
    expect(
      screen.getByText(/Document généré le 20\/06\/2026 10:30 par Halima Ousmane/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Document à usage interne, pour examen en Comité Budget/),
    ).toBeInTheDocument();
  });
});
