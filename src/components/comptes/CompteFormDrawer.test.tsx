import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listComptes: vi.fn(),
  createCompte: vi.fn(),
  updateCompte: vi.fn(),
}));

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
    info: (m: string) => toastInfo(m),
  },
}));

import {
  type Compte,
  createCompte,
  listComptes,
  updateCompte,
} from '@/lib/api/referentiels';
import { listRefSecondaires } from '@/lib/api/configuration';
import { __resetRefSecondaireCache } from '@/lib/hooks/useRefSecondaireOptions';
import { CompteFormDrawer } from './CompteFormDrawer';

const mockListComptes = listComptes as unknown as ReturnType<typeof vi.fn>;
const mockCreate = createCompte as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateCompte as unknown as ReturnType<typeof vi.fn>;
const mockListRef = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;

const REF_CLASSES = [
  { id: '1', code: '6', libelle: 'Classe 6 — Charges', description: null, ordre: 60, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
  { id: '2', code: '7', libelle: 'Classe 7 — Produits', description: null, ordre: 70, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
];
const REF_SENS = [
  { id: '1', code: 'D', libelle: 'Débit', description: null, ordre: 10, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
  { id: '2', code: 'C', libelle: 'Crédit', description: null, ordre: 20, estActif: true, estSysteme: true, dateCreation: '2026-01-01T00:00:00Z', utilisateurCreation: 'system', dateModification: null, utilisateurModification: null },
];

const COMPTE_RACINE: Compte = {
  id: '1',
  codeCompte: '6',
  libelle: 'CHARGES',
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
};

const COMPTE_FEUILLE: Compte = {
  ...COMPTE_RACINE,
  id: '2',
  codeCompte: '611100',
  libelle: 'Salaires bruts',
  niveau: 4,
  fkCompteParent: '1',
  parentCourant: { id: '1', codeCompte: '6', libelle: 'CHARGES' },
  sousClasse: '61',
  codePosteBudgetaire: 'MASSE_SALARIALE',
  estCompteCollectif: false,
};

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

function setupMocks(
  items: Compte[] = [COMPTE_RACINE, COMPTE_FEUILLE],
): void {
  mockListComptes.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    limit: 200,
  });
  mockListRef.mockImplementation((refKey: string) => {
    const items = refKey === 'classe-compte' ? REF_CLASSES : REF_SENS;
    return Promise.resolve({
      items,
      total: items.length,
      page: 1,
      limit: 200,
    });
  });
}

describe('CompteFormDrawer', () => {
  beforeEach(() => {
    __resetRefSecondaireCache();
    setupMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Création

  it('mode create : titre + champs vides + PAS de bandeau SCD2', () => {
    render(
      <CompteFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Nouveau compte')).toBeInTheDocument();
    expect(
      screen.queryByText(/SCD2 — Modification/i),
    ).not.toBeInTheDocument();
    const code = screen.getByLabelText(/Code compte/i) as HTMLInputElement;
    expect(code.disabled).toBe(false);
    expect(code.value).toBe('');
  });

  it('mode create : code compte numérique uniquement (filtrage onChange)', () => {
    render(
      <CompteFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/Code compte/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'abc601100xyz' } });
    expect(code.value).toBe('601100');
  });

  it('mode create : bouton Créer désactivé tant que requis manquants', () => {
    render(
      <CompteFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Créer/i })).toBeDisabled();
  });

  // ─── Édition

  it('mode edit : code grisé en lecture seule', () => {
    render(
      <CompteFormDrawer
        mode="edit"
        initial={COMPTE_RACINE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Modifier le compte')).toBeInTheDocument();
    const code = screen.getByLabelText(/Code compte/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('6');
  });

  it("mode edit : bandeau SCD2 jaune apparaît après modification libellé", async () => {
    render(
      <CompteFormDrawer
        mode="edit"
        initial={COMPTE_RACINE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/SCD2 — Modification d'attribut historisé/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'CHARGES (rénové)' },
    });
    await waitFor(() => {
      expect(
        screen.getByText(/SCD2 — Modification d'attribut historisé/i),
      ).toBeInTheDocument();
    });
  });

  it("mode edit : bandeau bleu si seul estActif modifié", () => {
    render(
      <CompteFormDrawer
        mode="edit"
        initial={COMPTE_RACINE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const checkbox = screen.getByLabelText(/^Actif$/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText(/Mise à jour en place/i)).toBeInTheDocument();
  });

  it("mode edit : modifier libellé → PATCH avec libelle, toast nouvelle_version", async () => {
    mockUpdate.mockResolvedValue({
      ...COMPTE_RACINE,
      libelle: 'CHARGES (rénové)',
      modeMaj: 'nouvelle_version',
    });
    const onSuccess = vi.fn();

    render(
      <CompteFormDrawer
        mode="edit"
        initial={COMPTE_RACINE}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'CHARGES (rénové)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('6', {
        libelle: 'CHARGES (rénové)',
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/Nouvelle version SCD2/i),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("mode edit : 422 incohérence niveau/parent → toast erreur", async () => {
    mockUpdate.mockRejectedValue(
      buildAxiosError(422, 'Niveau enfant incohérent avec parent'),
    );

    render(
      <CompteFormDrawer
        mode="edit"
        initial={COMPTE_RACINE}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Autre' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Niveau enfant incohérent/),
      );
    });
  });

  it('mode create : 409 doublon → branche d\'erreur testable', async () => {
    mockCreate.mockRejectedValue(buildAxiosError(409, 'Code existe déjà'));

    render(
      <CompteFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('Annuler appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <CompteFormDrawer
        mode="create"
        isOpen
        onClose={onClose}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
