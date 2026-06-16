/**
 * Tests JourFormDrawer (Lot 8.7.A).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  updateJourTemps: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import { updateJourTemps, type JourTemps } from '@/lib/api/referentiels';
import type { EffectivePermission } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/auth-store';
import { JourFormDrawer } from './JourFormDrawer';

const mockUpdate = updateJourTemps as unknown as ReturnType<typeof vi.fn>;

function setPermissions(codes: string[]): void {
  useAuthStore.setState({
    permissions: codes.map(
      (c) => ({ code_permission: c }) as EffectivePermission,
    ),
  });
}

const JOUR: JourTemps = {
  id: '897',
  date: '2027-06-16',
  annee: 2027,
  trimestre: 2,
  mois: 6,
  jour: 16,
  semaineIso: 24,
  jourOuvre: false,
  estFinDeMois: false,
  estFinDeTrimestre: false,
  estFinDAnnee: false,
  exerciceFiscal: 2027,
  libelleMois: 'Juin 2027',
  libelleJour: null,
};

describe('JourFormDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
    setPermissions([]);
  });

  it('affiche les champs éditables et les infos en lecture seule', () => {
    setPermissions(['REFERENTIEL.GERER']);
    render(<JourFormDrawer jour={JOUR} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByTestId('jour-form-ouvre')).toBeInTheDocument();
    expect(screen.getByTestId('jour-form-libelle')).toBeInTheDocument();
    expect(screen.getByTestId('jour-form-fin-mois')).toBeInTheDocument();
    // Lecture seule : la date métier est affichée
    expect(screen.getByText('16/06/2027')).toBeInTheDocument();
  });

  it('désactive le champ libellé quand le jour est ouvré', () => {
    setPermissions(['REFERENTIEL.GERER']);
    render(<JourFormDrawer jour={JOUR} onClose={vi.fn()} onSaved={vi.fn()} />);

    const libelle = screen.getByTestId('jour-form-libelle');
    // JOUR.jourOuvre = false → champ actif
    expect(libelle).not.toBeDisabled();

    // On coche « Jour ouvré » → le libellé se désactive
    fireEvent.click(screen.getByTestId('jour-form-ouvre'));
    expect(libelle).toBeDisabled();
  });

  it('Enregistrer appelle updateJourTemps avec les bons paramètres', async () => {
    setPermissions(['REFERENTIEL.GERER']);
    mockUpdate.mockResolvedValue({ ...JOUR, libelleJour: 'Tabaski 2027' });
    const onSaved = vi.fn();
    render(<JourFormDrawer jour={JOUR} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByTestId('jour-form-libelle'), {
      target: { value: 'Tabaski 2027' },
    });
    fireEvent.click(screen.getByTestId('jour-form-save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith('897', {
      jourOuvre: false,
      estFinDeMois: false,
      estFinDeTrimestre: false,
      estFinDAnnee: false,
      libelleJour: 'Tabaski 2027',
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});
