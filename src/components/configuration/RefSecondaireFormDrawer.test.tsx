import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/configuration', () => ({
  createRefSecondaire: vi.fn(),
  updateRefSecondaire: vi.fn(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
  },
}));

import {
  createRefSecondaire,
  type RefSecondaire,
  updateRefSecondaire,
} from '@/lib/api/configuration';
import { RefSecondaireFormDrawer } from './RefSecondaireFormDrawer';

const mockCreate = createRefSecondaire as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateRefSecondaire as unknown as ReturnType<typeof vi.fn>;

const VALEUR_SYSTEME: RefSecondaire = {
  id: '1',
  code: 'agence',
  libelle: 'Agence',
  description: 'Point de vente.',
  ordre: 50,
  estActif: true,
  estSysteme: true,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
};

const VALEUR_CUSTOM: RefSecondaire = {
  ...VALEUR_SYSTEME,
  id: '99',
  code: 'succursale',
  libelle: 'Succursale',
  estSysteme: false,
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

describe('RefSecondaireFormDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mode create : titre + bandeau absent + code éditable', () => {
    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Nouvelle valeur — Types de structure/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Valeur système/i)).not.toBeInTheDocument();
    const code = screen.getByLabelText(/Code/i) as HTMLInputElement;
    expect(code.disabled).toBe(false);
  });

  it('mode edit valeur système : bandeau "Valeur système" + code disabled', () => {
    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="edit"
        initial={VALEUR_SYSTEME}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    // Le bandeau "Valeur système" rend du texte split par <strong>
    expect(screen.getByText(/Valeur système/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ne peut pas être modifié/i),
    ).toBeInTheDocument();
    const code = screen.getByLabelText(/Code/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('agence');
  });

  it('mode edit valeur custom : bandeau "Modification d\'une valeur custom" + code éditable', () => {
    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="edit"
        initial={VALEUR_CUSTOM}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Modification d'une valeur custom/i),
    ).toBeInTheDocument();
    const code = screen.getByLabelText(/Code/i) as HTMLInputElement;
    expect(code.disabled).toBe(false);
  });

  it('refKey=pays : auto-uppercase du code', () => {
    render(
      <RefSecondaireFormDrawer
        refKey="pays"
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/Code/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'civ' } });
    expect(code.value).toBe('CIV');
  });

  it('mode create : submit OK → toast succès + onSuccess', async () => {
    mockCreate.mockResolvedValue({
      ...VALEUR_CUSTOM,
      code: 'succursale',
      libelle: 'Succursale',
    });
    const onSuccess = vi.fn();

    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Code/i), {
      target: { value: 'succursale' },
    });
    fireEvent.change(screen.getByLabelText(/Libellé/i), {
      target: { value: 'Succursale' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('type-structure', {
        code: 'succursale',
        libelle: 'Succursale',
        ordre: 0,
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/succursale.*créée/i),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('mode create : 409 doublon → toast erreur explicite', async () => {
    mockCreate.mockRejectedValue(
      buildAxiosError(409, 'Le code existe déjà'),
    );

    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Code/i), {
      target: { value: 'agence' },
    });
    fireEvent.change(screen.getByLabelText(/Libellé/i), {
      target: { value: 'Agence' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/'agence' existe déjà/i),
      );
    });
  });

  it("mode edit système : modifier libellé envoie diff sans code", async () => {
    mockUpdate.mockResolvedValue({
      ...VALEUR_SYSTEME,
      libelle: 'Agence (renommée)',
    });
    const onSuccess = vi.fn();

    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
        mode="edit"
        initial={VALEUR_SYSTEME}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Libellé/i), {
      target: { value: 'Agence (renommée)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('type-structure', '1', {
        libelle: 'Agence (renommée)',
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('Annuler appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <RefSecondaireFormDrawer
        refKey="type-structure"
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
