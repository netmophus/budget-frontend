/**
 * Tests Vitest CompteCombobox (UX A.1+A.2 Lot 3).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/referentiels')
  >('@/lib/api/referentiels');
  return {
    ...actual,
    listComptes: vi.fn(),
  };
});

import { listComptes, type Compte } from '@/lib/api/referentiels';
import { CompteCombobox } from './CompteCombobox';

const mockList = listComptes as unknown as ReturnType<typeof vi.fn>;

function makeCompte(over: Partial<Compte>): Compte {
  return {
    id: '1',
    codeCompte: '611100',
    libelle: 'Salaires bruts',
    classe: '6',
    sousClasse: null,
    fkCompteParent: null,
    niveau: 4,
    sens: 'D',
    codePosteBudgetaire: null,
    estCompteCollectif: false,
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

const COMPTES: Compte[] = [
  makeCompte({ id: '1', codeCompte: '611100', libelle: 'Salaires bruts', classe: '6' }),
  makeCompte({ id: '2', codeCompte: '611200', libelle: 'Primes et bonus', classe: '6' }),
  makeCompte({ id: '3', codeCompte: '701100', libelle: 'Intérêts sur prêts', classe: '7' }),
];

describe('CompteCombobox', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("appelle listComptes avec classes=['6','7'] et estCompteCollectif=false", async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          classes: ['6', '7'],
          estCompteCollectif: false,
          versionCouranteUniquement: true,
        }),
      );
    });
  });

  it('focus → ouvre la liste et affiche les 3 comptes', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() =>
      expect(mockList).toHaveBeenCalled(),
    );
    const input = screen.getByTestId('compte-combobox-input');
    fireEvent.focus(input);
    expect(screen.getByTestId('compte-option-611100')).toBeInTheDocument();
    expect(screen.getByTestId('compte-option-611200')).toBeInTheDocument();
    expect(screen.getByTestId('compte-option-701100')).toBeInTheDocument();
  });

  it('saisie « 611 » filtre la liste sur les codes commençant par 611', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const input = screen.getByTestId('compte-combobox-input');
    fireEvent.change(input, { target: { value: '611' } });
    expect(screen.getByTestId('compte-option-611100')).toBeInTheDocument();
    expect(screen.getByTestId('compte-option-611200')).toBeInTheDocument();
    expect(screen.queryByTestId('compte-option-701100')).not.toBeInTheDocument();
  });

  it('saisie « salaires » (libellé) filtre la liste', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: 'salaires' },
    });
    expect(screen.getByTestId('compte-option-611100')).toBeInTheDocument();
    expect(screen.queryByTestId('compte-option-611200')).not.toBeInTheDocument();
  });

  it('clic sur option → onChange + fermeture liste', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    const handleChange = vi.fn();
    render(<CompteCombobox value="" onChange={handleChange} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByTestId('compte-combobox-input'));
    fireEvent.click(screen.getByTestId('compte-option-701100'));
    expect(handleChange).toHaveBeenCalledWith('701100');
    expect(screen.queryByTestId('compte-combobox-list')).not.toBeInTheDocument();
  });

  it('Enter sur input → sélectionne la 1ère option filtrée', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    const handleChange = vi.fn();
    render(<CompteCombobox value="" onChange={handleChange} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const input = screen.getByTestId('compte-combobox-input');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith('701100');
  });

  it('aucun match → message empty state', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: 'inexistant' },
    });
    expect(screen.getByTestId('compte-combobox-empty')).toBeInTheDocument();
  });

  it('valeur initiale → input affiche "code — libellé"', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="611100" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const input = screen.getByTestId('compte-combobox-input') as HTMLInputElement;
    await waitFor(() => {
      expect(input.value).toMatch(/611100.*Salaires bruts/);
    });
  });

  it('disabled=true → input désactivé', async () => {
    mockList.mockResolvedValue({ items: COMPTES, total: 3, page: 1, limit: 200 });
    render(<CompteCombobox value="" onChange={vi.fn()} disabled />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByTestId('compte-combobox-input')).toBeDisabled();
  });
});
