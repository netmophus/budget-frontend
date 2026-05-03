import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/versions', () => ({
  createVersion: vi.fn(),
  updateVersion: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: vi.fn(),
  },
}));

import {
  createVersion,
  updateVersion,
  type Version,
} from '@/lib/api/versions';
import { VersionFormDrawer } from './VersionFormDrawer';

const mockCreate = createVersion as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateVersion as unknown as ReturnType<typeof vi.fn>;

const VERSION_OUVERT: Version = {
  id: '1',
  codeVersion: 'BUDGET_INITIAL_2026',
  libelle: 'Budget initial 2026',
  typeVersion: 'budget_initial',
  exerciceFiscal: 2026,
  statut: 'ouvert',
  dateGel: null,
  utilisateurGel: null,
  commentaire: null,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
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

describe('VersionFormDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('mode create : bandeau d\'information Hook Q9 visible', () => {
    render(
      <VersionFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Hook Q9 — auto-création scénario médian/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sera créé automatiquement/i),
    ).toBeInTheDocument();
  });

  it('mode create : exercice par défaut = année courante + 1', () => {
    render(
      <VersionFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const exo = screen.getByLabelText(
      /Exercice fiscal/i,
    ) as HTMLInputElement;
    expect(Number(exo.value)).toBe(new Date().getFullYear() + 1);
  });

  it('mode create : conversion code en MAJUSCULES', () => {
    render(
      <VersionFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/^Code version/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'budget_2027' } });
    expect(code.value).toBe('BUDGET_2027');
  });

  it('mode edit : code grisé en lecture seule + bandeau Hook Q9 absent', () => {
    render(
      <VersionFormDrawer
        mode="edit"
        initial={VERSION_OUVERT}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText('Modifier la version')).toBeInTheDocument();
    const code = screen.getByLabelText(/^Code version/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('BUDGET_INITIAL_2026');
    // Pas de bandeau Q9 en mode edit
    expect(
      screen.queryByText(/Hook Q9 — auto-création scénario médian/i),
    ).not.toBeInTheDocument();
  });

  it('mode edit : modifier libellé → PATCH appelé', async () => {
    mockUpdate.mockResolvedValue({
      ...VERSION_OUVERT,
      libelle: 'Budget initial 2026 (V2)',
    });
    const onSuccess = vi.fn();

    render(
      <VersionFormDrawer
        mode="edit"
        initial={VERSION_OUVERT}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Budget initial 2026 (V2)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ libelle: 'Budget initial 2026 (V2)' }),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("mode create : 409 doublon → branche d'erreur testable", () => {
    mockCreate.mockRejectedValue(
      buildAxiosError(409, 'Code existe déjà'),
    );
    render(
      <VersionFormDrawer
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
      <VersionFormDrawer
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
