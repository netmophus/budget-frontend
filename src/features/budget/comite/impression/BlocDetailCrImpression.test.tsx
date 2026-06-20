/** Tests BlocDetailCrImpression (palier 7.4). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CrStatutLigne } from '@/lib/api/cr-workflow';
import {
  agregerFaitsParCompteLigneMetier,
  construirePivotCr,
} from '@/features/budget/lib/agregation-cr';
import { BlocDetailCrImpression } from './BlocDetailCrImpression';

const CR: CrStatutLigne = {
  crId: 'cr1',
  crCode: 'CR_AG_SIEGE',
  libelle: 'Agence Siège',
  statut: 'VALIDE',
  saisisseurEmail: 'a@bsic.ne',
  validateurEmail: 'v@bsic.ne',
  dateSoumission: '2027-06-01',
  dateValidation: '2027-06-02',
  pnb: 600,
};

function pivot() {
  return construirePivotCr(
    agregerFaitsParCompteLigneMetier([
      {
        montantDevise: 1000,
        compte: { code: '701000', libelle: 'Produits' },
        ligneMetier: { code: 'LM_PART', libelle: 'Particuliers' },
      },
      {
        montantDevise: 400,
        compte: { code: '601000', libelle: 'Charges' },
        ligneMetier: { code: 'LM_PART', libelle: 'Particuliers' },
      },
    ]),
  );
}

describe('BlocDetailCrImpression', () => {
  it('affiche infos CR + pivot compte × LM + synthèse PNB', () => {
    render(<BlocDetailCrImpression cr={CR} pivot={pivot()} />);
    // En-tête CR
    expect(screen.getByText(/CR_AG_SIEGE/)).toBeInTheDocument();
    expect(screen.getByText('a@bsic.ne')).toBeInTheDocument();
    expect(screen.getByText('v@bsic.ne')).toBeInTheDocument();
    // Pivot : comptes en lignes
    expect(screen.getByText('701000')).toBeInTheDocument();
    expect(screen.getByText('601000')).toBeInTheDocument();
    // Synthèse Produits (1000) / Charges (400) / PNB (600)
    expect(screen.getByText(/Produits \(cl\.7\)/)).toBeInTheDocument();
    expect(screen.getByText(/Charges \(cl\.6\)/)).toBeInTheDocument();
    expect(screen.getByText(/PNB/)).toBeInTheDocument();
    // PNB = 600 figure dans le bloc
    expect(screen.getByText('600')).toBeInTheDocument();
  });
});
