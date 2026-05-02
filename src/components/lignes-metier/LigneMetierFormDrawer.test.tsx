import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listLignesMetier: vi.fn(),
  createLigneMetier: vi.fn(),
  updateLigneMetier: vi.fn(),
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
  createLigneMetier,
  type LigneMetier,
  listLignesMetier,
  updateLigneMetier,
} from '@/lib/api/referentiels';
import { LigneMetierFormDrawer } from './LigneMetierFormDrawer';

const mockListLignes = listLignesMetier as unknown as ReturnType<typeof vi.fn>;
const mockCreate = createLigneMetier as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateLigneMetier as unknown as ReturnType<typeof vi.fn>;

const RETAIL: LigneMetier = {
  id: '1',
  codeLigneMetier: 'RETAIL',
  libelle: 'Banque de détail',
  fkLigneMetierParent: null,
  niveau: 1,
  versionCourante: true,
  dateDebutValidite: '2026-01-01',
  dateFinValidite: null,
  estActif: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

const RETAIL_PARTICULIERS: LigneMetier = {
  ...RETAIL,
  id: '2',
  codeLigneMetier: 'RETAIL_PARTICULIERS',
  libelle: 'Particuliers',
  niveau: 2,
  fkLigneMetierParent: '1',
  parentCourant: {
    id: '1',
    codeLigneMetier: 'RETAIL',
    libelle: 'Banque de détail',
  },
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

function setupMocks(items: LigneMetier[] = [RETAIL, RETAIL_PARTICULIERS]): void {
  mockListLignes.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    limit: 200,
  });
}

describe('LigneMetierFormDrawer', () => {
  beforeEach(() => {
    setupMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Création

  it('mode create : titre + champs vides + PAS de bandeau SCD2', async () => {
    render(
      <LigneMetierFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Nouvelle ligne métier')).toBeInTheDocument();
    expect(
      screen.queryByText(/SCD2 — Modification/i),
    ).not.toBeInTheDocument();
    const code = screen.getByLabelText(/Code ligne métier/i) as HTMLInputElement;
    expect(code.disabled).toBe(false);
    expect(code.value).toBe('');
  });

  it('mode create : conversion automatique en MAJUSCULES', () => {
    render(
      <LigneMetierFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/Code ligne métier/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'treasury' } });
    expect(code.value).toBe('TREASURY');
  });

  it('mode create : bouton Créer désactivé tant que requis manquants', () => {
    render(
      <LigneMetierFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Créer/i })).toBeDisabled();
  });

  it('mode create : POST avec libellé + niveau 1 (racine)', async () => {
    mockCreate.mockResolvedValue({
      ...RETAIL,
      codeLigneMetier: 'TREASURY',
      libelle: 'Trésorerie',
    });
    const onSuccess = vi.fn();

    render(
      <LigneMetierFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Code ligne métier/i), {
      target: { value: 'TREASURY' },
    });
    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Trésorerie' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        codeLigneMetier: 'TREASURY',
        libelle: 'Trésorerie',
        niveau: 1,
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  // ─── Édition

  it('mode edit : code grisé en lecture seule', () => {
    render(
      <LigneMetierFormDrawer
        mode="edit"
        initial={RETAIL}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Modifier la ligne métier')).toBeInTheDocument();
    const code = screen.getByLabelText(/Code ligne métier/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('RETAIL');
  });

  it("mode edit : bandeau SCD2 jaune apparaît après modification libellé", async () => {
    render(
      <LigneMetierFormDrawer
        mode="edit"
        initial={RETAIL}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/SCD2 — Modification d'attribut historisé/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Banque de détail (rénové)' },
    });
    await waitFor(() => {
      expect(
        screen.getByText(/SCD2 — Modification d'attribut historisé/i),
      ).toBeInTheDocument();
    });
  });

  it("mode edit : bandeau bleu si seul estActif modifié", () => {
    render(
      <LigneMetierFormDrawer
        mode="edit"
        initial={RETAIL}
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
      ...RETAIL,
      libelle: 'Banque de détail (rénové)',
      modeMaj: 'nouvelle_version',
    });
    const onSuccess = vi.fn();

    render(
      <LigneMetierFormDrawer
        mode="edit"
        initial={RETAIL}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Banque de détail (rénové)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('RETAIL', {
        libelle: 'Banque de détail (rénové)',
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/Nouvelle version SCD2/i),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("mode edit : 422 anti-cycle backend → toast erreur", async () => {
    mockUpdate.mockRejectedValue(
      buildAxiosError(422, 'Cycle hiérarchique détecté'),
    );

    render(
      <LigneMetierFormDrawer
        mode="edit"
        initial={RETAIL}
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
        expect.stringMatching(/Cycle hiérarchique/),
      );
    });
  });

  it('Annuler appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <LigneMetierFormDrawer
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
