/**
 * Tests ComitePage (écran Comité Budget — palier 6).
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
        statut: 'soumis_comite',
      },
    ],
  }),
}));
vi.mock('@/lib/api/cr-workflow', () => ({
  getStatutsCrsVersion: vi.fn(),
  approuverComite: vi.fn().mockResolvedValue({ statut: 'valide' }),
  demanderRevisionComite: vi
    .fn()
    .mockResolvedValue({ statutVersion: 'ouvert', statutCr: 'EN_SAISIE' }),
  getLignesCrComite: vi.fn().mockResolvedValue([
    {
      montantDevise: 1000,
      compte: { code: '701000', libelle: 'Intérêts' },
      ligneMetier: { code: 'LM_PART', libelle: 'Particuliers' },
    },
  ]),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  approuverComite,
  demanderRevisionComite,
  getLignesCrComite,
  getStatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { ComitePage } from './ComitePage';

const mockVue = getStatutsCrsVersion as unknown as ReturnType<typeof vi.fn>;
const mockAppro = approuverComite as unknown as ReturnType<typeof vi.fn>;
const mockRev = demanderRevisionComite as unknown as ReturnType<typeof vi.fn>;
const mockLignes = getLignesCrComite as unknown as ReturnType<typeof vi.fn>;

function vue(statutVersion = 'soumis_comite') {
  return {
    versionId: 'v1',
    statutVersion,
    totalAttendus: 2,
    nbValides: 2,
    nbSoumis: 0,
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
        pnb: 1_000_000_000,
      },
      {
        crId: 'cr2',
        crCode: 'CR_B',
        libelle: 'CR B',
        statut: 'VALIDE',
        saisisseurEmail: 'b@m.local',
        validateurEmail: 'v@m.local',
        dateSoumission: '2027-06-03',
        dateValidation: '2027-06-04',
        pnb: 600_000_000,
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ComitePage />
    </MemoryRouter>,
  );
}

describe('ComitePage', () => {
  beforeEach(() => mockVue.mockResolvedValue(vue()));
  afterEach(() => vi.clearAllMocks());

  it('SOUMIS_COMITE : vue consolidée (PNB réel, autres « — ») + actions visibles', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('comite-consolide')).toBeInTheDocument(),
    );
    // PNB consolidé = 1 000 000 000 + 600 000 000 = 1 600 000 000.
    expect(screen.getByTestId('comite-pnb').textContent).toMatch(/1[\s  ]?600/);
    // RN non consolidable → « — ».
    expect(screen.getByTestId('comite-indicateur-rn').textContent).toContain(
      '—',
    );
    // 2 CR validés dans la table.
    expect(screen.getAllByTestId('comite-cr-row')).toHaveLength(2);
    expect(screen.getByTestId('comite-approuver')).toBeInTheDocument();
    expect(
      screen.getByTestId('comite-demander-revision'),
    ).toBeInTheDocument();
  });

  it('Approuver → modale → confirme → appelle approuverComite', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('comite-approuver')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('comite-approuver'));
    const confirmer = await screen.findByTestId('approbation-confirmer');
    fireEvent.click(confirmer);
    await waitFor(() =>
      expect(mockAppro).toHaveBeenCalledWith('v1', undefined),
    );
  });

  it('Demander révision → CR + motif obligatoires → appelle demanderRevisionComite', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByTestId('comite-demander-revision'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('comite-demander-revision'));
    const confirmer = await screen.findByTestId('revision-confirmer');
    expect(confirmer).toBeDisabled(); // ni CR ni motif
    fireEvent.change(screen.getByTestId('revision-cr'), {
      target: { value: 'CR_A' },
    });
    fireEvent.change(screen.getByTestId('revision-motif'), {
      target: { value: 'Revoir hypothèse PNB' },
    });
    expect(confirmer).not.toBeDisabled();
    fireEvent.click(confirmer);
    await waitFor(() =>
      expect(mockRev).toHaveBeenCalledWith(
        'v1',
        'CR_A',
        'Revoir hypothèse PNB',
      ),
    );
  });

  it('Voir le détail → modale → charge les lignes du CR', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId('comite-voir-detail')[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByTestId('comite-voir-detail')[0]!);
    await waitFor(() =>
      expect(screen.getByTestId('comite-detail-table')).toBeInTheDocument(),
    );
    expect(mockLignes).toHaveBeenCalledWith('v1', 'CR_A');
    expect(screen.getByTestId('comite-detail-row').textContent).toContain(
      '701000',
    );
  });

  it('version pas SOUMIS_COMITE : bandeau + pas d’actions', async () => {
    mockVue.mockResolvedValue(vue('valide'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('comite-non-soumis')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('comite-approuver')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('comite-demander-revision'),
    ).not.toBeInTheDocument();
  });

  it('boutons Imprimer : ouvrent les bonnes URLs dans un nouvel onglet', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    renderPage();
    // Bouton consolidé (Comité).
    await waitFor(() =>
      expect(screen.getByTestId('comite-imprimer-consolide')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('comite-imprimer-consolide'));
    expect(openSpy).toHaveBeenCalledWith(
      '/budget/comite/impression?versionId=v1',
      '_blank',
      'noopener',
    );
    // Bouton impression d'un CR de la ligne.
    fireEvent.click(screen.getAllByTestId('comite-imprimer-cr')[0]!);
    expect(openSpy).toHaveBeenCalledWith(
      '/budget/comite/cr/CR_A/impression?versionId=v1',
      '_blank',
      'noopener',
    );
    vi.unstubAllGlobals();
  });
});
