/**
 * Tests CalendrierPage (Lot 4 + Lot 7.3 V10 refonte Charte v1).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listJoursTemps: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import { listJoursTemps, type JourTemps } from '@/lib/api/referentiels';
import { CalendrierPage } from './CalendrierPage';

const mockListJoursTemps = listJoursTemps as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: JourTemps[] = [
  {
    id: '1',
    date: '2026-05-01', // vendredi férié (May Day) → FERIE
    annee: 2026,
    trimestre: 2,
    mois: 5,
    jour: 1,
    semaineIso: 18,
    jourOuvre: false,
    estFinDeMois: false,
    estFinDeTrimestre: false,
    estFinDAnnee: false,
    exerciceFiscal: 2026,
    libelleMois: 'Mai 2026',
  },
  {
    id: '2',
    date: '2026-01-31', // samedi → WEEKEND, mais aussi fin de mois
    annee: 2026,
    trimestre: 1,
    mois: 1,
    jour: 31,
    semaineIso: 5,
    jourOuvre: false,
    estFinDeMois: true,
    estFinDeTrimestre: false,
    estFinDAnnee: false,
    exerciceFiscal: 2026,
    libelleMois: 'Janv. 2026',
  },
  {
    id: '3',
    date: '2026-05-04', // lundi ouvré
    annee: 2026,
    trimestre: 2,
    mois: 5,
    jour: 4,
    semaineIso: 19,
    jourOuvre: true,
    estFinDeMois: false,
    estFinDeTrimestre: false,
    estFinDAnnee: false,
    exerciceFiscal: 2026,
    libelleMois: 'Mai 2026',
  },
];

describe('CalendrierPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and renders the days returned by listJoursTemps', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: SAMPLE.length,
      page: 1,
      limit: 366,
    });

    render(<CalendrierPage />);

    await waitFor(() => {
      expect(screen.getByText('01/05/2026')).toBeInTheDocument();
    });
    // Le 1er mai 2026 (vendredi) est férié → badge FERIE
    expect(screen.getByTestId('statut-badge-FERIE')).toBeInTheDocument();
    // Le 31 janvier 2026 (samedi) → badge WEEKEND ; mais il est aussi
    // fin de mois donc ligne ambre/5 + FinPeriodeBadge "Fin mois"
    expect(screen.getByTestId('fin-periode-badge')).toBeInTheDocument();
    expect(screen.getByText('Fin mois')).toBeInTheDocument();
    // Le 4 mai 2026 ouvré → badge OUVRE
    expect(screen.getByTestId('statut-badge-OUVRE')).toBeInTheDocument();
  });

  it('falls back to a toast on API error', async () => {
    mockListJoursTemps.mockRejectedValue(new Error('boom'));

    render(<CalendrierPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger le calendrier',
      );
    });
  });

  // ─── Lot 7.3 V10 — refonte Charte v1 ──────────────────────────

  it('V10 : affiche le label de mois centré dans la barre de navigation', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: SAMPLE.length,
      page: 1,
      limit: 366,
    });
    render(<CalendrierPage />);
    await waitFor(() =>
      expect(screen.getByTestId('calendrier-label-mois')).toBeInTheDocument(),
    );
    // Le mois courant initial est `new Date().getUTCMonth() + 1`
    // (variable selon la date du test). On vérifie juste qu'il
    // contient l'année courante UTC.
    const expectedYear = new Date().getUTCFullYear();
    expect(
      screen.getByTestId('calendrier-label-mois').textContent,
    ).toContain(String(expectedYear));
  });

  it('V10 : clic sur "Mois précédent" met à jour le label de mois', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: SAMPLE.length,
      page: 1,
      limit: 366,
    });
    render(<CalendrierPage />);
    await waitFor(() =>
      screen.getByTestId('calendrier-label-mois'),
    );
    const labelAvant =
      screen.getByTestId('calendrier-label-mois').textContent;
    fireEvent.click(screen.getByTestId('calendrier-btn-mois-precedent'));
    await waitFor(() => {
      expect(
        screen.getByTestId('calendrier-label-mois').textContent,
      ).not.toBe(labelAvant);
    });
  });

  it('V10 : rend les 4 KPI cards avec valeurs calculées sur le mois', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: SAMPLE.length,
      page: 1,
      limit: 366,
    });
    render(<CalendrierPage />);
    await waitFor(() =>
      expect(screen.getByTestId('kpi-jours-ouvres')).toBeInTheDocument(),
    );
    // SAMPLE : 1 ouvré + 2 non ouvrés + 1 fin période = 3 total
    expect(screen.getByTestId('kpi-jours-ouvres')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-jours-non-ouvres')).toHaveTextContent('2');
    expect(screen.getByTestId('kpi-total-jours')).toHaveTextContent('3');
    expect(screen.getByTestId('kpi-fin-periode')).toHaveTextContent('1');
  });

  it('V10 : badge OUVRE rendu avec dot coloré (régression visuelle)', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: SAMPLE.length,
      page: 1,
      limit: 366,
    });
    render(<CalendrierPage />);
    const badge = await waitFor(() => screen.getByTestId('statut-badge-OUVRE'));
    expect(badge.textContent).toBe('Ouvré');
    // Dot SVG-less : un <span> avec rounded-full + bg
    expect(badge.querySelector('span')).not.toBeNull();
  });
});
