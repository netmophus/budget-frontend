/**
 * Tests ValidationsPage (écran validateur).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'v1',
        codeVersion: 'BUDGET_2027',
        libelle: 'Budget 2027',
        exerciceFiscal: 2027,
        statut: 'ouvert',
      },
    ],
  }),
}));
vi.mock('@/lib/api/cr-workflow', () => ({
  getStatutsCrsVersion: vi.fn(),
  validerCr: vi.fn().mockResolvedValue({ statut: 'VALIDE' }),
  rejeterCr: vi.fn().mockResolvedValue({ statut: 'EN_SAISIE' }),
  rouvrirCr: vi.fn().mockResolvedValue({ statut: 'EN_SAISIE' }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  getStatutsCrsVersion,
  validerCr,
  type CrStatutLigne,
} from '@/lib/api/cr-workflow';
import { ValidationsPage } from './ValidationsPage';

const mockVue = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockValider = validerCr as unknown as ReturnType<typeof vi.fn>;

function ligne(over: Partial<CrStatutLigne>): CrStatutLigne {
  return {
    crId: 'cr1',
    crCode: 'CR_A',
    libelle: 'CR A',
    statut: 'SOUMIS',
    saisisseurEmail: 'a@m.local',
    validateurEmail: null,
    dateSoumission: '2027-06-01',
    dateValidation: null,
    pnb: -1000,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ValidationsPage />
    </MemoryRouter>,
  );
}

describe('ValidationsPage', () => {
  beforeEach(() => {
    mockVue.mockResolvedValue({
      versionId: 'v1',
      statutVersion: 'ouvert',
      totalAttendus: 2,
      nbValides: 0,
      nbSoumis: 1,
      nbEnSaisie: 1,
      crs: [
        ligne({ crId: 'cr1', crCode: 'CR_A', statut: 'SOUMIS' }),
        ligne({
          crId: 'cr2',
          crCode: 'CR_B',
          statut: 'EN_SAISIE',
          saisisseurEmail: 'b@m.local',
          dateSoumission: null,
        }),
      ],
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('charge les CR du périmètre (monPerimetre=true) + indicateur', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('validations-indicateur')).toBeInTheDocument(),
    );
    expect(mockVue).toHaveBeenCalledWith('v1', true);
    expect(screen.getAllByTestId('validation-row')).toHaveLength(2);
    expect(screen.getByTestId('validations-indicateur').textContent).toContain(
      '1',
    );
  });

  it('actions selon statut : SOUMIS → valider/rejeter, EN_SAISIE → voir seul', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId('validation-row')).toHaveLength(2),
    );
    // 1 CR SOUMIS → 1 bouton valider + 1 rejeter ; pas pour EN_SAISIE.
    expect(screen.getAllByTestId('action-valider')).toHaveLength(1);
    expect(screen.getAllByTestId('action-rejeter')).toHaveLength(1);
    expect(screen.queryByTestId('action-rouvrir')).not.toBeInTheDocument();
  });

  it('valider : modale → confirme → appelle validerCr', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('action-valider')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('action-valider'));
    const confirmer = await screen.findByTestId('validation-confirmer');
    fireEvent.click(confirmer);
    await waitFor(() => expect(mockValider).toHaveBeenCalledTimes(1));
    expect(mockValider).toHaveBeenCalledWith('CR_A', 'v1', undefined);
  });

  it('rejet : motif obligatoire (bouton désactivé tant que vide)', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('action-rejeter')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('action-rejeter'));
    const confirmer = await screen.findByTestId('validation-confirmer');
    expect(confirmer).toBeDisabled();
    fireEvent.change(screen.getByTestId('validation-texte'), {
      target: { value: 'Charges sous-évaluées' },
    });
    expect(confirmer).not.toBeDisabled();
  });

  it('boutons Imprimer : périmètre + détail CR ouvrent les bonnes URLs', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByTestId('validations-imprimer-perimetre'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('validations-imprimer-perimetre'));
    expect(openSpy).toHaveBeenCalledWith(
      '/budget/validations/impression?versionId=v1',
      '_blank',
      'noopener',
    );
    fireEvent.click(screen.getAllByTestId('action-imprimer')[0]!);
    expect(openSpy).toHaveBeenCalledWith(
      '/budget/comite/cr/CR_A/impression?versionId=v1',
      '_blank',
      'noopener',
    );
    vi.unstubAllGlobals();
  });
});
