/**
 * Tests Vitest LancerReforecastDialog (Lot 5.3.B).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/reforecast', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reforecast')>(
    '@/lib/api/reforecast',
  );
  return {
    ...actual,
    chercherReforecastExistant: vi.fn(),
    lancerReforecast: vi.fn(),
    listerReforecasts: vi.fn().mockResolvedValue([]),
  };
});
vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'v1',
        codeVersion: 'BI_2027',
        libelle: 'Budget initial 2027',
        typeVersion: 'budget_initial',
        statut: 'gele',
        exerciceFiscal: 2027,
      },
    ],
  }),
}));
vi.mock('@/lib/api/scenarios', () => ({
  listScenarios: vi.fn().mockResolvedValue({
    items: [
      {
        id: 's1',
        codeScenario: 'OPT',
        libelle: 'Optimiste',
        typeScenario: 'central',
        statut: 'actif',
      },
    ],
  }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  type LancerReforecastPayload,
  chercherReforecastExistant,
  lancerReforecast,
} from '@/lib/api/reforecast';
import { useReforecastStore } from '@/lib/stores/reforecast-store';
import { LancerReforecastDialog } from './LancerReforecastDialog';

const mockChercher = chercherReforecastExistant as unknown as ReturnType<
  typeof vi.fn
>;
const mockLancer = lancerReforecast as unknown as ReturnType<typeof vi.fn>;

function renderDialog() {
  return render(
    <MemoryRouter>
      <LancerReforecastDialog isOpen={true} onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe('LancerReforecastDialog', () => {
  beforeEach(() => {
    // Reset store volatile
    useReforecastStore.setState({
      liste: [],
      loading: false,
      error: null,
    });
    mockChercher.mockReset();
    mockChercher.mockResolvedValue(null);
    mockLancer.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le formulaire avec les sélecteurs principaux', async () => {
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-lancer-form')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rf-l-version')).toBeInTheDocument();
    expect(screen.getByTestId('rf-l-scenario')).toBeInTheDocument();
    expect(screen.getByTestId('rf-l-trim-1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-l-trim-4')).toBeInTheDocument();
    expect(screen.getByTestId('rf-l-annee')).toBeInTheDocument();
  });

  it('pré-remplit le libellé avec "Reforecast T{N} {ANNEE}"', async () => {
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-l-libelle')).toBeInTheDocument(),
    );
    const libelle = screen.getByTestId('rf-l-libelle') as HTMLInputElement;
    expect(libelle.value).toMatch(/^Reforecast T\d \d{4}$/);
  });

  it('change le libellé quand le trimestre change', async () => {
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-l-trim-3')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('rf-l-trim-3'));
    const libelle = screen.getByTestId('rf-l-libelle') as HTMLInputElement;
    expect(libelle.value).toContain('T3');
  });

  it('affiche avertissement OBSOLETE si reforecast existant trouvé', async () => {
    mockChercher.mockResolvedValue({
      id: '99',
      codeVersion: 'OLD_CODE',
      libelle: 'Ancien reforecast',
      statut: 'ouvert',
    });
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-l-warning-obsolete')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rf-l-confirm-ecrasement')).toBeInTheDocument();
    // Bouton submit désactivé tant que case non cochée
    const submit = screen.getByTestId('rf-l-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("active le bouton après cochage de la confirmation d'écrasement", async () => {
    mockChercher.mockResolvedValue({
      id: '99',
      codeVersion: 'OLD',
      libelle: 'Old',
      statut: 'ouvert',
    });
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-l-confirm-ecrasement')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('rf-l-confirm-ecrasement'));
    const submit = screen.getByTestId('rf-l-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('soumet avec le bon payload sur clic Lancer (pas d\'existant)', async () => {
    mockChercher.mockResolvedValue(null);
    mockLancer.mockResolvedValue({
      id: '42',
      codeVersion: 'REFORECAST_T1_2027_42',
    });
    renderDialog();
    await waitFor(() =>
      expect(screen.getByTestId('rf-l-submit')).toBeInTheDocument(),
    );
    // Wait pour que le useEffect ait peuplé fkVersionSource etc.
    await waitFor(() => {
      const submit = screen.getByTestId('rf-l-submit') as HTMLButtonElement;
      expect(submit.disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('rf-l-submit'));
    await waitFor(() => expect(mockLancer).toHaveBeenCalled());
    const payload = mockLancer.mock.calls[0]![0] as LancerReforecastPayload;
    expect(payload.fkVersionSource).toBe('v1');
    expect(payload.fkScenarioSource).toBe('s1');
    expect(payload.trimestreConsolide).toBe(1);
    expect(payload.methodeExtrapolation).toBe('MOYENNE_TRIMESTRE');
  });
});
