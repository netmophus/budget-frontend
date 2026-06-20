/** Tests TableauConsolideD2Impression (palier 7.4). */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableauConsolideD2Impression } from './TableauConsolideD2Impression';

describe('TableauConsolideD2Impression', () => {
  it('PNB consolidé affiché, RN/CE/CR/Zinder non consolidables → « — »', () => {
    // PNB réel = 1 600 000 000 (≥ cible 1,57 Md → atteint).
    render(<TableauConsolideD2Impression pnbConsolide={1_600_000_000} />);
    const table = screen.getByTestId('impression-consolide');

    // Ligne PNB : un écart chiffré présent (réel consolidé connu).
    expect(within(table).getByText('PNB')).toBeInTheDocument();
    expect(within(table).getByText(/▲ \+1\.9 %/)).toBeInTheDocument();

    // 5 indicateurs ; 4 non consolidables → au moins 4 cellules « — ».
    const tirets = within(table).getAllByText('—');
    expect(tirets.length).toBeGreaterThanOrEqual(4);

    // Les libellés des 4 indicateurs non consolidés sont présents.
    expect(within(table).getByText('Résultat net')).toBeInTheDocument();
    expect(within(table).getByText(/Coefficient d’exploitation/)).toBeInTheDocument();
    expect(within(table).getByText('Coût du risque')).toBeInTheDocument();
    expect(within(table).getByText('Contribution Zinder')).toBeInTheDocument();
  });
});
