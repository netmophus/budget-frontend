/** Tests ParentCompteCombobox (dropdown Compte parent avec recherche). */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Compte } from '@/lib/api/referentiels';
import { ParentCompteCombobox } from './ParentCompteCombobox';

function compte(over: Partial<Compte>): Compte {
  return {
    id: '1',
    codeCompte: '6',
    libelle: 'Charges',
    classe: '6',
    sousClasse: null,
    fkCompteParent: null,
    niveau: 1,
    sens: 'D',
    codePosteBudgetaire: null,
    estCompteCollectif: true,
    estPorteurInterets: false,
    versionCourante: true,
    dateDebutValidite: '2026-01-01',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    ...over,
  };
}

const OPTIONS: Compte[] = [
  compte({ id: '10', codeCompte: '6', libelle: 'Charges', niveau: 1 }),
  compte({ id: '11', codeCompte: '63', libelle: 'Impôts et taxes', niveau: 2 }),
  compte({ id: '12', codeCompte: '631', libelle: 'Impôts directs', niveau: 3 }),
  compte({ id: '13', codeCompte: '6311', libelle: 'Patente', niveau: 4 }),
];

describe('ParentCompteCombobox', () => {
  it('propose la liste des comptes éligibles au focus', () => {
    render(
      <ParentCompteCombobox
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        autoriserRacine={false}
      />,
    );
    fireEvent.focus(screen.getByTestId('parent-combobox-input'));
    expect(screen.getByTestId('parent-combobox-list')).toBeInTheDocument();
    expect(screen.getByTestId('parent-option-6311')).toBeInTheDocument();
    expect(screen.getByTestId('parent-option-63')).toBeInTheDocument();
  });

  it('recherche par CODE « 6311 » → ne garde que le compte 6311', () => {
    render(
      <ParentCompteCombobox
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        autoriserRacine={false}
      />,
    );
    const input = screen.getByTestId('parent-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '6311' } });
    expect(screen.getByTestId('parent-option-6311')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-option-63')).not.toBeInTheDocument();
  });

  it('recherche par LIBELLÉ « Patente » → sélectionne via clic', () => {
    const onChange = vi.fn();
    render(
      <ParentCompteCombobox
        value=""
        onChange={onChange}
        options={OPTIONS}
        autoriserRacine={false}
      />,
    );
    const input = screen.getByTestId('parent-combobox-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Patente' } });
    fireEvent.click(screen.getByTestId('parent-option-6311'));
    expect(onChange).toHaveBeenCalledWith('13');
  });

  it('liste vide → message clair + input désactivé', () => {
    render(
      <ParentCompteCombobox
        value=""
        onChange={vi.fn()}
        options={[]}
        autoriserRacine={false}
      />,
    );
    expect(screen.getByTestId('parent-combobox-vide')).toBeInTheDocument();
    expect(screen.getByTestId('parent-combobox-input')).toBeDisabled();
  });
});
