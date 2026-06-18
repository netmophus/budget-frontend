/**
 * Tests CoordinationPage (écran Coordinateur — palier 4).
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
  initialiserSnapshot: vi.fn().mockResolvedValue({ ajoutes: 2, total: 2 }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  getStatutsCrsVersion,
  initialiserSnapshot,
} from '@/lib/api/cr-workflow';
import { CoordinationPage } from './CoordinationPage';

const mockVue = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockInit = initialiserSnapshot as unknown as ReturnType<typeof vi.fn>;

function vide() {
  return {
    versionId: 'v1',
    statutVersion: 'ouvert',
    totalAttendus: 0,
    nbValides: 0,
    nbSoumis: 0,
    nbEnSaisie: 0,
    crs: [],
  };
}
function peuple() {
  return {
    versionId: 'v1',
    statutVersion: 'ouvert',
    totalAttendus: 2,
    nbValides: 1,
    nbSoumis: 1,
    nbEnSaisie: 0,
    crs: [
      {
        crId: 'cr1',
        crCode: 'CR_A',
        libelle: 'CR A',
        statut: 'VALIDE',
        saisisseurEmail: 'a@m.local',
        validateurEmail: 'v@m.local',
        dateSoumission: '2027-06-01',
        dateValidation: '2027-06-02',
        pnb: 300,
      },
      {
        crId: 'cr2',
        crCode: 'CR_B',
        libelle: 'CR B',
        statut: 'SOUMIS',
        saisisseurEmail: 'b@m.local',
        validateurEmail: null,
        dateSoumission: '2027-06-03',
        dateValidation: null,
        pnb: 200,
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CoordinationPage />
    </MemoryRouter>,
  );
}

describe('CoordinationPage', () => {
  beforeEach(() => mockVue.mockResolvedValue(vide()));
  afterEach(() => vi.clearAllMocks());

  it('snapshot vide → bouton Initialiser → modale → appelle initialiserSnapshot', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByTestId('coordination-snapshot-vide'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('coordination-initialiser'));
    const confirmer = await screen.findByTestId('init-snapshot-confirmer');
    fireEvent.click(confirmer);
    await waitFor(() => expect(mockInit).toHaveBeenCalledWith('v1'));
  });

  it('snapshot peuplé → progression + table + PNB consolidé', async () => {
    mockVue.mockResolvedValue(peuple());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('coordination-progression')).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('progression-row')).toHaveLength(2);
    // PNB consolidé = 300 + 200 = 500.
    expect(screen.getByTestId('coordination-pnb').textContent).toContain('500');
    // Compteur X/Y.
    expect(
      screen.getByTestId('coordination-progression').textContent,
    ).toContain('1 / 2');
  });
});
