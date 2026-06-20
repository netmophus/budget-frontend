/** Tests TableauRecapCrsImpression (palier 7.4). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CrStatutLigne } from '@/lib/api/cr-workflow';
import { TableauRecapCrsImpression } from './TableauRecapCrsImpression';

const CRS: CrStatutLigne[] = [
  {
    crId: 'cr1',
    crCode: 'CR_A',
    libelle: 'CR A',
    statut: 'VALIDE',
    saisisseurEmail: 'a@bsic.ne',
    validateurEmail: 'v@bsic.ne',
    dateSoumission: '2027-06-01',
    dateValidation: '2027-06-02',
    pnb: 300,
  },
  {
    crId: 'cr2',
    crCode: 'CR_B',
    libelle: 'CR B',
    statut: 'SOUMIS',
    saisisseurEmail: 'b@bsic.ne',
    validateurEmail: null,
    dateSoumission: '2027-06-03',
    dateValidation: null,
    pnb: 200,
  },
];

describe('TableauRecapCrsImpression', () => {
  it('affiche les CR, les statuts et les totaux (PNB consolidé)', () => {
    render(<TableauRecapCrsImpression crs={CRS} />);
    expect(screen.getByText('CR_A')).toBeInTheDocument();
    expect(screen.getByText('CR_B')).toBeInTheDocument();
    // Compteurs par statut + PNB consolidé (300 + 200 = 500)
    expect(
      screen.getByText(/2 CR — 1 validé\(s\) · 1 soumis · 0 en saisie/),
    ).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('PNB consolidé')).toBeInTheDocument();
  });
});
