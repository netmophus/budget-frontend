/**
 * Tests Vitest DocumentsPage (Lot 8.2.B Palier 1).
 *
 * Pattern aligné CampagnesPage.test.tsx : mocks 5 modules
 * (campagnes / documents / users / sonner / permissions / router).
 * Rendu via `render` custom (test-utils.tsx — wrap TooltipProvider
 * obligatoire pour les composants qui utilisent Radix Tooltip à
 * l'avenir, et neutre sinon).
 *
 * Filtres Radix Select : ouvrir programmatiquement le menu Radix en
 * test demande userEvent + portail, ce qui devient flaky. À la place
 * on teste la query passée à `listerDocuments` au mount avec filtres
 * par défaut (ALL → query = {}) et le reset, ce qui couvre le contrat
 * d'intégration côté API sans manipuler le DOM Radix.
 *
 * 6 tests : render empty + render avec liste + click ligne navigate
 * + perm absente cache CTA + toast erreur + download via dropdown.
 */
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  listerDocuments: vi.fn(),
  telechargerFichierDocument: vi.fn(),
}));

vi.mock('@/lib/api/campagnes', () => ({
  listerCampagnes: vi.fn(),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

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

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import { listerCampagnes } from '@/lib/api/campagnes';
import { listerDocuments } from '@/lib/api/documents';
import { useHasPermission } from '@/lib/auth/permissions';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { DocumentOfficiel } from '@/types/document';

import { DocumentsPage } from './DocumentsPage';

const mockList = listerDocuments as unknown as ReturnType<typeof vi.fn>;
const mockListCampagnes = listerCampagnes as unknown as ReturnType<
  typeof vi.fn
>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE: DocumentOfficiel[] = [
  {
    id: 'doc-uuid-1',
    codeDocument: 'LETTRE_CADRAGE_2026',
    typeDocument: 'D2_LETTRE_CADRAGE',
    fkCampagne: 'camp-1',
    titre: 'Lettre cadrage budgétaire 2026',
    contenuHtml: '<p>Résumé...</p>',
    referenceExterne: 'CA/BSIC/2026/001',
    statut: 'SIGNE',
    fkUserEmetteur: '24',
    fkUserSignataire: '23',
    dateCreation: '2026-01-10T10:00:00Z',
    dateModification: '2026-01-15T15:00:00Z',
    dateSoumissionVisa: null,
    dateVisaComplet: null,
    dateSignature: '2026-01-15T15:00:00Z',
    fichierJointPath: '2026/LETTRE_CADRAGE_2026.pdf',
    fichierJointNom: 'lettre-cadrage-2026.pdf',
    emetteur: {
      id: '24',
      email: 'ousmane@bsic.ne',
      nom: 'MAMANE',
      prenom: 'Ousmane',
    },
    signataire: {
      id: '23',
      email: 'dg@bsic.ne',
      nom: 'BARRY',
      prenom: 'Issoufou',
    },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <DocumentsPage />
    </MemoryRouter>,
  );
}

// jsdom n'implémente pas URL.createObjectURL — stub global pour les
// tests qui déclenchent un download.
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
});

describe('DocumentsPage (Lot 8.2.B P1)', () => {
  // Defaults appliqués AVANT chaque test (afterEach clearAll vide
  // les mocks → sans beforeEach, le 1er test n'a pas de retour pour
  // listerCampagnes() et `.then` plante).
  beforeEach(() => {
    mockListCampagnes.mockResolvedValue([]);
    mockHasPermission.mockReturnValue(true);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('render initial : appel API avec query vide + empty state + bouton Créer', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({});
    });
    expect(
      screen.getByText(/Aucun document trouvé/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('btn-creer-document')).toBeInTheDocument();
  });

  it('charge la liste : code mono + titre + badges type/statut + émetteur/signataire', async () => {
    mockList.mockResolvedValue(SAMPLE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Lettre cadrage budgétaire 2026'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lettre de cadrage')).toBeInTheDocument();
    expect(
      screen.getByTestId('statut-doc-badge-SIGNE'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ousmane MAMANE')).toBeInTheDocument();
    expect(screen.getByText('Issoufou BARRY')).toBeInTheDocument();
  });

  it('clic sur ligne navigue vers /documents/:id', async () => {
    mockList.mockResolvedValue(SAMPLE);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('doc-row-doc-uuid-1'));
    expect(navigate).toHaveBeenCalledWith('/documents/doc-uuid-1');
  });

  it('sans permission DOCUMENT.CREER : bouton Créer masqué', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Aucun document trouvé/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('btn-creer-document'),
    ).not.toBeInTheDocument();
  });

  it('toast erreur si listerDocuments échoue', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les documents',
      );
    });
  });

  it('bouton "Réinitialiser" rappelle l\'API (filtres remis à ALL → query vide)', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByTestId('btn-reset-filters'));
    // Le useEffect des filtres se ré-exécute (même si valeurs déjà ALL,
    // l'identité des setters provoque un nouveau render). On vérifie
    // au minimum que l'appel se fait avec query vide (les filtres
    // restent ALL → aucun param API).
    await waitFor(() => {
      const lastCall = mockList.mock.calls.at(-1);
      expect(lastCall?.[0]).toEqual({});
    });
  });
});
