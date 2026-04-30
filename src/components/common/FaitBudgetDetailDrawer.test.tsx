import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/budget', () => ({
  getFaitBudget: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (m: string) => toastError(m) },
}));

import { getFaitBudget, type FaitBudget } from '@/lib/api/budget';
import { FaitBudgetDetailDrawer } from './FaitBudgetDetailDrawer';

const mockGet = getFaitBudget as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: FaitBudget = {
  id: '99',
  fkTemps: '1',
  fkCompte: '2',
  fkStructure: '3',
  fkCentre: '4',
  fkLigneMetier: '5',
  fkProduit: '6',
  fkSegment: '7',
  fkDevise: '8',
  fkVersion: '9',
  fkScenario: '10',
  montantDevise: 1000,
  montantFcfa: 655957,
  tauxChangeApplique: 655.957,
  dateCreation: '2026-04-30T10:00:00Z',
  utilisateurCreation: 'admin@miznas.local',
  dateModification: null,
  utilisateurModification: null,
  temps: { id: '1', date: '2026-04-01', mois: 4, annee: 2026 },
  compte: { id: '2', code: '611100', libelle: 'Salaires bruts' },
  structure: { id: '3', code: 'AG_TEST', libelle: 'Agence Test' },
  centre: { id: '4', code: 'CR_TEST', libelle: 'CR Test' },
  ligneMetier: { id: '5', code: 'RETAIL', libelle: 'Retail' },
  produit: { id: '6', code: 'DEPOT_VUE', libelle: 'Dépôts à vue' },
  segment: { id: '7', code: 'PARTICULIER', libelle: 'Particuliers' },
  devise: { id: '8', code: 'EUR', libelle: 'Euro' },
  version: { id: '9', code: 'BUDGET_INITIAL_2026', libelle: 'Budget 2026' },
  scenario: { id: '10', code: 'CENTRAL', libelle: 'Central' },
};

describe('FaitBudgetDetailDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rend les axes dimensionnels avec leurs libellés', async () => {
    mockGet.mockResolvedValue(SAMPLE);

    render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('611100').length).toBeGreaterThan(0);
    });
    // Au moins une occurrence visible pour chaque axe
    expect(screen.getAllByText(/Salaires bruts/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('AG_TEST').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CR_TEST').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RETAIL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEPOT_VUE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PARTICULIER').length).toBeGreaterThan(0);
    // EUR / CENTRAL apparaissent dans les libellés des axes
    expect(screen.getAllByText('EUR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CENTRAL').length).toBeGreaterThan(0);
  });

  it('affiche les mesures formatées', async () => {
    mockGet.mockResolvedValue(SAMPLE);

    const { container } = render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => {
      // Le drawer est rendu en portail → on doit chercher dans
      // document.body, pas seulement dans `container`.
      const text = document.body.textContent ?? '';
      expect(text).toMatch(/655[\s  .]957/); // 655 957 FCFA
      expect(text).toMatch(/655,957000/); // taux à 6 décimales
    });
    expect(container).toBeTruthy();
  });

  it('bouton Modifier ouvre la modale d\'édition', async () => {
    mockGet.mockResolvedValue(SAMPLE);

    render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier les mesures/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Modifier les mesures/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(
          /Seules les 3 mesures sont modifiables/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('Modifier mesures → onPatch appelée avec le diff uniquement', async () => {
    mockGet.mockResolvedValue(SAMPLE);
    const onPatch = vi.fn().mockResolvedValue(undefined);

    render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={onPatch}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier les mesures/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Modifier les mesures/i }),
    );

    const inputDevise = await screen.findByLabelText('Montant devise');
    fireEvent.change(inputDevise, { target: { value: '2000' } });

    fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/i }));

    await waitFor(() => {
      expect(onPatch).toHaveBeenCalledWith('99', { montantDevise: 2000 });
    });
  });

  it('cache le bouton Modifier si canEditMesures=false', async () => {
    mockGet.mockResolvedValue(SAMPLE);

    render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={false}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/CENTRAL/)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Modifier les mesures/i }),
    ).not.toBeInTheDocument();
  });

  it('Supprimer ouvre la modale de confirmation puis appelle onDelete', async () => {
    mockGet.mockResolvedValue(SAMPLE);
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <FaitBudgetDetailDrawer
        id="99"
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Supprimer$/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^Supprimer$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Voulez-vous vraiment supprimer/i),
      ).toBeInTheDocument();
    });
    // 2 boutons "Supprimer" maintenant : celui d'origine + celui de la
    // modale. On clique le second (celui de la modale, le dernier rendu).
    const supprimerBtns = screen.getAllByRole('button', {
      name: /^Supprimer$/i,
    });
    fireEvent.click(supprimerBtns[supprimerBtns.length - 1]!);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('99');
    });
  });

  it('id=null → drawer fermé, pas d\'appel API', () => {
    render(
      <FaitBudgetDetailDrawer
        id={null}
        onClose={() => {}}
        canEditMesures={true}
        canDelete={true}
        onPatch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(mockGet).not.toHaveBeenCalled();
  });
});
