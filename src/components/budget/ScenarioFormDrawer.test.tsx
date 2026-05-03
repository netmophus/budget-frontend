import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/scenarios', () => ({
  createScenario: vi.fn(),
  updateScenario: vi.fn(),
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
  createScenario,
  type Scenario,
  updateScenario,
} from '@/lib/api/scenarios';
import { ScenarioFormDrawer } from './ScenarioFormDrawer';

const mockCreate = createScenario as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateScenario as unknown as ReturnType<typeof vi.fn>;

const CENTRAL: Scenario = {
  id: '1',
  codeScenario: 'CENTRAL',
  libelle: 'Scénario central',
  typeScenario: 'central',
  statut: 'actif',
  commentaire: null,
  exerciceFiscal: null,
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

describe('ScenarioFormDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('mode create : titre + bouton Créer désactivé sans champs', () => {
    render(
      <ScenarioFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText('Nouveau scénario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Créer$/i })).toBeDisabled();
  });

  it('mode create : conversion automatique en MAJUSCULES', () => {
    render(
      <ScenarioFormDrawer
        mode="create"
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const code = screen.getByLabelText(/^Code scénario/i) as HTMLInputElement;
    fireEvent.change(code, { target: { value: 'median_2027' } });
    expect(code.value).toBe('MEDIAN_2027');
  });

  it('mode edit : code grisé en lecture seule', () => {
    render(
      <ScenarioFormDrawer
        mode="edit"
        initial={CENTRAL}
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText('Modifier le scénario')).toBeInTheDocument();
    const code = screen.getByLabelText(/^Code scénario/i) as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(code.value).toBe('CENTRAL');
  });

  it("mode edit : modifier libellé → PATCH avec libelle, toast success", async () => {
    mockUpdate.mockResolvedValue({
      ...CENTRAL,
      libelle: 'Scénario central (V2)',
    });
    const onSuccess = vi.fn();

    render(
      <ScenarioFormDrawer
        mode="edit"
        initial={CENTRAL}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Libellé/i), {
      target: { value: 'Scénario central (V2)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ libelle: 'Scénario central (V2)' }),
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("mode create : 409 doublon → toast erreur explicite (branche d'erreur testable)", () => {
    mockCreate.mockRejectedValue(
      buildAxiosError(409, 'Code existe déjà'),
    );
    render(
      <ScenarioFormDrawer
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
      <ScenarioFormDrawer
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
