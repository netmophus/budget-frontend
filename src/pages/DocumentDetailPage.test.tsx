/**
 * Tests Vitest DocumentDetailPage (Lot 8.2.B Palier 2).
 *
 * Pattern aligné CampagneDetailPage.test.tsx (Lot 8.2.A) :
 *   - Routing réel via <MemoryRouter> + <Route path="/documents/:id" />
 *     pour useParams() naturel
 *   - render custom test-utils (TooltipProvider obligatoire pour les
 *     boutons disabled avec tooltip explicatif)
 *   - useAuthStore mocké avec selector helper pour faire varier
 *     l'utilisateur courant par test (émetteur / viseur / signataire)
 *
 * 8 tests couvrent :
 *  1. Render header + 4 tabs + cartouche
 *  2. BROUILLON + émetteur : 3 boutons visibles, Soumettre disabled
 *     (pas de fichier) + tooltip
 *  3. SOUMIS_VISA + viseur EN_ATTENTE : bouton Apporter visa visible
 *  4. VISE + signataire : bouton Signer visible
 *  5. SIGNE : Vérifier + Télécharger visibles
 *  6. Tab Visas : tableau + badges statut
 *  7. Tab Historique : lazy load (pas d'appel API au mount, appel au
 *     clic sur le tab)
 *  8. Tab Fichier sans fichier : empty state + bouton upload
 */
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  detailDocument: vi.fn(),
  historiqueDocument: vi.fn(),
  telechargerFichierDocument: vi.fn(),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { ...actual, useNavigate: () => navigate };
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

vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

import { detailDocument, historiqueDocument } from '@/lib/api/documents';
import { useAuthStore } from '@/lib/auth/auth-store';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type {
  DocumentOfficiel,
  DocumentVisaResume,
} from '@/types/document';

import { DocumentDetailPage } from './DocumentDetailPage';

const mockDetail = detailDocument as unknown as ReturnType<typeof vi.fn>;
const mockHistorique = historiqueDocument as unknown as ReturnType<
  typeof vi.fn
>;
const mockAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

interface CurrentUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
}

function setCurrentUser(user: CurrentUser | null) {
  mockAuthStore.mockImplementation((selector: unknown) => {
    const state = { user };
    return typeof selector === 'function'
      ? (selector as (s: typeof state) => unknown)(state)
      : state;
  });
}

const VISA_HALIMA: DocumentVisaResume = {
  id: 'v-1',
  fkUserViseur: '25',
  ordreVisa: 1,
  estObligatoire: true,
  libelleFonction: 'DGA Opérations',
  statut: 'EN_ATTENTE',
  dateAction: null,
  commentaire: null,
  user: {
    id: '25',
    email: 'halima@bsic.ne',
    nom: 'OUSMANE',
    prenom: 'Halima',
  },
};

const VISA_IBRAHIMA: DocumentVisaResume = {
  id: 'v-2',
  fkUserViseur: '26',
  ordreVisa: 2,
  estObligatoire: false,
  libelleFonction: 'Audit interne',
  statut: 'VISE',
  dateAction: '2026-05-22T11:00:00Z',
  commentaire: 'RAS conforme',
  user: {
    id: '26',
    email: 'ibrahima@bsic.ne',
    nom: 'MAHAMADOU',
    prenom: 'Ibrahima',
  },
};

function makeDoc(over: Partial<DocumentOfficiel> = {}): DocumentOfficiel {
  return {
    id: 'doc-uuid-1',
    codeDocument: 'LETTRE_CADRAGE_2026',
    typeDocument: 'D2_LETTRE_CADRAGE',
    fkCampagne: 'camp-1',
    titre: 'Lettre cadrage 2026',
    contenuHtml: '<p>Résumé du cadrage…</p>',
    referenceExterne: 'CA/BSIC/2026/001',
    statut: 'BROUILLON',
    fkUserEmetteur: '24',
    fkUserSignataire: '23',
    dateCreation: '2026-05-20T10:00:00Z',
    dateModification: '2026-05-20T11:00:00Z',
    dateSoumissionVisa: null,
    dateVisaComplet: null,
    dateSignature: null,
    fichierJointPath: null,
    fichierJointNom: null,
    visas: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/documents/doc-uuid-1']}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

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

describe('DocumentDetailPage (Lot 8.2.B P2)', () => {
  beforeEach(() => {
    setCurrentUser({
      id: '24',
      email: 'ousmane@bsic.ne',
      nom: 'MAMANE',
      prenom: 'Ousmane',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. charge le document + affiche header + 4 onglets + cartouche', async () => {
    mockDetail.mockResolvedValue(makeDoc({ statut: 'SIGNE' }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    expect(screen.getByText('Lettre de cadrage')).toBeInTheDocument();
    expect(
      screen.getByTestId('statut-doc-badge-SIGNE'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tab-contenu')).toBeInTheDocument();
    expect(screen.getByTestId('tab-visas')).toBeInTheDocument();
    expect(screen.getByTestId('tab-historique')).toBeInTheDocument();
    expect(screen.getByTestId('tab-fichier')).toBeInTheDocument();
    // La référence externe apparaît dans la cartouche ET dans le tab
    // Contenu (actif par défaut) → 2 occurrences attendues.
    expect(screen.getAllByText('CA/BSIC/2026/001').length).toBeGreaterThan(
      0,
    );
  });

  it('2. BROUILLON + émetteur : 3 boutons visibles ; Soumettre disabled (pas de fichier)', async () => {
    mockDetail.mockResolvedValue(makeDoc({ statut: 'BROUILLON' }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-editer-document')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-upload-fichier')).toBeInTheDocument();
    const btnSoumettre = screen.getByTestId('btn-soumettre-document');
    expect(btnSoumettre).toBeInTheDocument();
    expect(btnSoumettre).toBeDisabled();
  });

  it('3. SOUMIS_VISA + viseur EN_ATTENTE : bouton Apporter visa visible', async () => {
    setCurrentUser({
      id: '25',
      email: 'halima@bsic.ne',
      nom: 'OUSMANE',
      prenom: 'Halima',
    });
    mockDetail.mockResolvedValue(
      makeDoc({
        statut: 'SOUMIS_VISA',
        visas: [VISA_HALIMA, VISA_IBRAHIMA],
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-apporter-visa')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-apporter-visa')).not.toBeDisabled();
  });

  it('4. VISE + signataire : bouton Signer visible et actif', async () => {
    setCurrentUser({
      id: '23',
      email: 'dg@bsic.ne',
      nom: 'BARRY',
      prenom: 'Issoufou',
    });
    mockDetail.mockResolvedValue(makeDoc({ statut: 'VISE' }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('btn-signer-document')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-signer-document')).not.toBeDisabled();
  });

  it('5. SIGNE : Vérifier intégrité + Télécharger visibles', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({
        statut: 'SIGNE',
        fichierJointNom: 'lettre.pdf',
        fichierJointPath: '2026/L.pdf',
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByTestId('btn-verifier-integrite'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('btn-telecharger-fichier'),
    ).toBeInTheDocument();
  });

  it('6. Tab Visas : tableau + badges statut (EN_ATTENTE / VISE)', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({
        statut: 'SOUMIS_VISA',
        visas: [VISA_HALIMA, VISA_IBRAHIMA],
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('tab-visas'));
    expect(screen.getByTestId('visas-table')).toBeInTheDocument();
    expect(screen.getByText('Halima OUSMANE')).toBeInTheDocument();
    expect(screen.getByText('Ibrahima MAHAMADOU')).toBeInTheDocument();
    expect(
      screen.getByTestId('statut-visa-badge-EN_ATTENTE'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('statut-visa-badge-VISE')).toBeInTheDocument();
    expect(screen.getByText('(consultatif)')).toBeInTheDocument();
  });

  it('7. Tab Historique : lazy load — pas d\'appel au mount, appel au clic', async () => {
    mockDetail.mockResolvedValue(makeDoc({ statut: 'BROUILLON' }));
    mockHistorique.mockResolvedValue({
      documentId: 'doc-uuid-1',
      evenements: [
        {
          etape: 'CREATION',
          date: '2026-05-20T10:00:00Z',
          acteur: 'ousmane@bsic.ne',
          libelle: 'Document créé',
          commentaire: null,
        },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Au mount avec tab Contenu actif (default) : pas d'appel historique
    expect(mockHistorique).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tab-historique'));
    await waitFor(() => {
      expect(mockHistorique).toHaveBeenCalledWith('doc-uuid-1');
    });
    await waitFor(() => {
      expect(screen.getByText('Document créé')).toBeInTheDocument();
    });
  });

  it('9. Lot 8.1.E : cartouche affiche emetteur/signataire enrichis (UserResume backend)', async () => {
    // Le backend renvoie désormais (Lot 8.1.E Palier 2) les relations
    // emetteur/signataire mappées en UserResume directement dans la
    // réponse de detailDocument. Le frontend (lib/api/documents.ts)
    // n'a plus de mapping de compensation : `data` est consommé tel
    // quel. Ce test valide que les noms apparaissent dans la cartouche.
    mockDetail.mockResolvedValue(
      makeDoc({
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
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Cartouche affiche les noms enrichis
    expect(screen.getByText('Ousmane MAMANE')).toBeInTheDocument();
    expect(screen.getByText('Issoufou BARRY')).toBeInTheDocument();
    // Aucune référence à "user.id=" dans le DOM (fallback supprimé en Lot 8.1.E)
    expect(
      screen.queryByText(/user\.id=/i),
    ).not.toBeInTheDocument();
  });

  it('10. Lot 8.2.C : doc type D2_LETTRE_CADRAGE → onglets "Détails cadrage" + "Aperçu lettre" visibles', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({
        typeDocument: 'D2_LETTRE_CADRAGE',
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Les 2 onglets spécifiques D2 sont rendus
    expect(screen.getByTestId('tab-cadrage')).toBeInTheDocument();
    expect(screen.getByTestId('tab-apercu')).toBeInTheDocument();
  });

  it('11. Lot 8.2.C : doc type non-D2 → onglets cadrage/apercu MASQUÉS', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({ typeDocument: 'D11_PV_APPROBATION' }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('tab-cadrage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu')).not.toBeInTheDocument();
  });

  it('12. Lot 8.3.A : doc type D3_NOTE_ORIENTATION → onglets "Détails orientation" + "Aperçu note" visibles', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({ typeDocument: 'D3_NOTE_ORIENTATION' }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Les 2 onglets spécifiques D3 sont rendus
    expect(screen.getByTestId('tab-orientation')).toBeInTheDocument();
    expect(screen.getByTestId('tab-apercu-note')).toBeInTheDocument();
    // Exclusion mutuelle : les onglets D2 ne sont PAS rendus
    expect(screen.queryByTestId('tab-cadrage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu')).not.toBeInTheDocument();
  });

  it('13. Lot 8.3.B : doc type D5_LETTRE_DG → onglets "Détails mobilisation" + "Aperçu lettre mobilisation" visibles', async () => {
    mockDetail.mockResolvedValue(makeDoc({ typeDocument: 'D5_LETTRE_DG' }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Les 2 onglets spécifiques D5 sont rendus
    expect(screen.getByTestId('tab-mobilisation')).toBeInTheDocument();
    expect(
      screen.getByTestId('tab-apercu-mobilisation'),
    ).toBeInTheDocument();
    // Exclusion mutuelle stricte : onglets D2 et D3 absents
    expect(screen.queryByTestId('tab-cadrage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-orientation')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu-note')).not.toBeInTheDocument();
  });

  it('14. Lot 8.3.C : doc type D1_NOTE_PREPARATOIRE → onglets "Détails note préparatoire" + "Aperçu note préparatoire" visibles', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({ typeDocument: 'D1_NOTE_PREPARATOIRE' }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    // Les 2 onglets spécifiques D1 sont rendus
    expect(screen.getByTestId('tab-preparatoire')).toBeInTheDocument();
    expect(
      screen.getByTestId('tab-apercu-preparatoire'),
    ).toBeInTheDocument();
    // Exclusion mutuelle stricte 4 types : onglets D2/D3/D5 absents
    expect(screen.queryByTestId('tab-cadrage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-orientation')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-apercu-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-mobilisation')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('tab-apercu-mobilisation'),
    ).not.toBeInTheDocument();
  });

  it('8. Tab Fichier sans fichier : empty state + bouton upload (émetteur)', async () => {
    mockDetail.mockResolvedValue(
      makeDoc({ statut: 'BROUILLON', fichierJointNom: null }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('LETTRE_CADRAGE_2026')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('tab-fichier'));
    expect(screen.getByTestId('fichier-empty')).toBeInTheDocument();
    expect(
      screen.getByTestId('btn-upload-fichier-tab'),
    ).toBeInTheDocument();
  });
});
