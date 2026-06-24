/**
 * Tests Vitest CompteCombobox (UX A.1+A.2 Lot 3).
 *
 * Depuis le fix « recherche serveur » : le filtrage code/libellé est
 * délégué au backend (param `search`). Le mock `listComptes` simule ce
 * comportement (filtre classes + estCompteCollectif + search + limit)
 * afin que les tests reflètent les vraies requêtes.
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

import {
  listComptes,
  type Compte,
  type ListComptesQuery,
} from '@/lib/api/referentiels';
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

// Jeu de comptes simulant le PCB (classes 6 + 7). Inclut « 66 » et ses
// voisins qui, dans la vraie base, tombaient au-delà du 200ᵉ rang.
const ALL_COMPTES: Compte[] = [
  makeCompte({ id: '1', codeCompte: '611100', libelle: 'Salaires bruts', classe: '6' }),
  makeCompte({ id: '2', codeCompte: '611200', libelle: 'Primes et bonus', classe: '6' }),
  makeCompte({
    id: '3',
    codeCompte: '66',
    libelle: 'Dotations aux amortissements',
    classe: '6',
    niveau: 2,
    estCompteCollectif: false,
  }),
  makeCompte({
    id: '4',
    codeCompte: '661',
    libelle: 'Dotations amortissements immobilisations',
    classe: '6',
    niveau: 3,
  }),
  makeCompte({
    id: '5',
    codeCompte: '6412',
    libelle: 'Charges sociales diverses',
    classe: '6',
    niveau: 4,
  }),
  makeCompte({ id: '6', codeCompte: '701100', libelle: 'Intérêts sur prêts', classe: '7' }),
];

// Codes ramenés SANS terme de recherche (« 1ʳᵉ page »). Volontairement
// dépourvu de 66/661/6412 : reproduit le cas réel où ces comptes
// tombaient au-delà du rang limit et n'apparaissaient qu'à la recherche.
// Permet aussi des `waitFor` déterministes (l'apparition d'un compte
// hors page initiale prouve que la recherche serveur a bien narrowé).
const INITIAL_PAGE_CODES = ['611100', '701100'];

/**
 * Branche le mock pour simuler le backend `/referentiels/comptes` :
 * applique les filtres classes / estCompteCollectif / search puis limit.
 * Sans `search`, ne renvoie que la « 1ʳᵉ page » (INITIAL_PAGE_CODES).
 */
function mockBackend(data: Compte[] = ALL_COMPTES): void {
  mockList.mockImplementation((query: ListComptesQuery = {}) => {
    let items = [...data];
    if (query.classes && query.classes.length > 0) {
      items = items.filter((c) => query.classes!.includes(c.classe));
    }
    if (typeof query.estCompteCollectif === 'boolean') {
      items = items.filter((c) => c.estCompteCollectif === query.estCompteCollectif);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.codeCompte.toLowerCase().includes(s) ||
          c.libelle.toLowerCase().includes(s),
      );
    } else {
      items = items.filter((c) => INITIAL_PAGE_CODES.includes(c.codeCompte));
    }
    const limit = query.limit ?? 50;
    items = items.slice(0, limit);
    return Promise.resolve({ items, total: items.length, page: 1, limit });
  });
}

describe('CompteCombobox', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("appelle listComptes avec classes=['6','7'] et estCompteCollectif=false", async () => {
    mockBackend();
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

  it('focus → ouvre la liste et affiche les comptes initiaux', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByTestId('compte-combobox-input'));
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-611100')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('compte-option-701100')).toBeInTheDocument();
  });

  it('saisie « 611 » → recherche serveur, ne garde que les codes 611x', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: '611' },
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '611' }),
      );
    });
    // 611200 est hors page initiale → son apparition prouve le narrowing.
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-611200')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('compte-option-611100')).toBeInTheDocument();
    expect(screen.queryByTestId('compte-option-701100')).not.toBeInTheDocument();
  });

  it('saisie « 66 » → trouve le compte 66 (bug initial corrigé)', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: '66' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-66')).toBeInTheDocument(),
    );
    // 661 contient aussi « 66 » → présent ; les autres non.
    expect(screen.getByTestId('compte-option-661')).toBeInTheDocument();
    expect(screen.queryByTestId('compte-option-611100')).not.toBeInTheDocument();
  });

  it('saisie « 661 » → trouve 661, pas 66', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: '661' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-661')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('compte-option-66')).not.toBeInTheDocument();
  });

  it('saisie « 6412 » → trouve le compte 6412', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: '6412' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-6412')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('compte-option-611100')).not.toBeInTheDocument();
  });

  it('saisie « amortissement » (libellé) → trouve 66 et 661', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: 'amortissement' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-66')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('compte-option-661')).toBeInTheDocument();
    expect(screen.queryByTestId('compte-option-611100')).not.toBeInTheDocument();
  });

  it('clic sur option → onChange + fermeture liste', async () => {
    mockBackend();
    const handleChange = vi.fn();
    render(<CompteCombobox value="" onChange={handleChange} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByTestId('compte-combobox-input'));
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-701100')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('compte-option-701100'));
    expect(handleChange).toHaveBeenCalledWith('701100');
    expect(screen.queryByTestId('compte-combobox-list')).not.toBeInTheDocument();
  });

  it('Enter sur input → sélectionne la 1ère option', async () => {
    mockBackend();
    const handleChange = vi.fn();
    render(<CompteCombobox value="" onChange={handleChange} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const input = screen.getByTestId('compte-combobox-input');
    // '661' est hors page initiale → la liste est forcément narrowée.
    fireEvent.change(input, { target: { value: '661' } });
    await waitFor(() =>
      expect(screen.getByTestId('compte-option-661')).toBeInTheDocument(),
    );
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith('661');
  });

  it('aucun match → message empty state', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('compte-combobox-input'), {
      target: { value: 'inexistant' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compte-combobox-empty')).toBeInTheDocument(),
    );
  });

  it('valeur initiale → input affiche "code — libellé"', async () => {
    mockBackend();
    render(<CompteCombobox value="611100" onChange={vi.fn()} />);
    const input = screen.getByTestId('compte-combobox-input') as HTMLInputElement;
    await waitFor(() => {
      expect(input.value).toMatch(/611100.*Salaires bruts/);
    });
  });

  it("B.1 — changement de classes → reset sélection si compte absent", async () => {
    mockBackend();
    const handleChange = vi.fn();
    const { rerender } = render(
      <CompteCombobox value="611100" onChange={handleChange} classes={['6']} />,
    );
    // Résolution initiale de 611100 (classe 6) — pas de reset.
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    // Bascule sur classe 7 : 611100 n'y existe pas → reset onChange('').
    rerender(
      <CompteCombobox value="611100" onChange={handleChange} classes={['7']} />,
    );
    await waitFor(() => expect(handleChange).toHaveBeenCalledWith(''));
  });

  it("B.1 — pas de reset si le compte reste valide après changement de classes", async () => {
    mockBackend();
    const handleChange = vi.fn();
    const { rerender } = render(
      <CompteCombobox
        value="701100"
        onChange={handleChange}
        classes={['6', '7']}
      />,
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    rerender(
      <CompteCombobox value="701100" onChange={handleChange} classes={['7']} />,
    );
    // 701100 toujours présent en classe 7 → aucun reset.
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(handleChange).not.toHaveBeenCalledWith('');
  });

  it('inclureCollectifs → ne filtre PAS estCompteCollectif', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} classes={['6']} inclureCollectifs />);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.not.objectContaining({ estCompteCollectif: expect.anything() }),
      );
    });
  });

  it('disabled=true → input désactivé', async () => {
    mockBackend();
    render(<CompteCombobox value="" onChange={vi.fn()} disabled />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByTestId('compte-combobox-input')).toBeDisabled();
  });
});
