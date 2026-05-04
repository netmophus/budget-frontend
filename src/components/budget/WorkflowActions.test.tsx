/**
 * Tests Vitest WorkflowActions (Lot 3.5).
 *
 * Couvrent : affichage conditionnel selon statut + permissions,
 * dialog de confirmation, validation côté client (commentaire de
 * rejet obligatoire), succès appel API + callback onTransitioned,
 * gestion d'erreurs API (422 vide, 409 statut).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/versions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/versions')
  >('@/lib/api/versions');
  return {
    ...actual,
    soumettreVersion: vi.fn(),
    validerVersion: vi.fn(),
    rejeterVersion: vi.fn(),
    publierVersion: vi.fn(),
  };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (code: string) =>
    (globalThis as { __PERMS__?: string[] }).__PERMS__?.includes(code) ??
    false,
}));

import {
  publierVersion,
  rejeterVersion,
  soumettreVersion,
  validerVersion,
  type Version,
} from '@/lib/api/versions';
import { WorkflowActions } from './WorkflowActions';

const mockSoumettre = soumettreVersion as unknown as ReturnType<typeof vi.fn>;
const mockValider = validerVersion as unknown as ReturnType<typeof vi.fn>;
const mockRejeter = rejeterVersion as unknown as ReturnType<typeof vi.fn>;
const mockPublier = publierVersion as unknown as ReturnType<typeof vi.fn>;

function makeVersion(
  statut: Version['statut'],
  overrides: Partial<Version> = {},
): Version {
  return {
    id: '42',
    codeVersion: 'BUDGET_INITIAL_2026',
    libelle: 'Budget initial 2026',
    typeVersion: 'budget_initial',
    exerciceFiscal: 2026,
    statut,
    dateGel: null,
    utilisateurGel: null,
    commentaire: null,
    dateCreation: '2026-01-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    commentaireSoumission: null,
    commentaireValidation: null,
    commentaireRejet: null,
    commentairePublication: null,
    dateSoumission: null,
    utilisateurSoumission: null,
    dateValidation: null,
    utilisateurValidation: null,
    dateRejet: null,
    utilisateurRejet: null,
    ...overrides,
  };
}

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

function setPerms(...codes: string[]): void {
  (globalThis as { __PERMS__?: string[] }).__PERMS__ = codes;
}

describe('WorkflowActions', () => {
  beforeEach(() => {
    setPerms();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("statut Brouillon (ouvert) + BUDGET.SOUMETTRE → bouton Soumettre", () => {
    setPerms('BUDGET.SOUMETTRE');
    render(
      <WorkflowActions version={makeVersion('ouvert')} onTransitioned={vi.fn()} />,
    );
    expect(screen.getByTestId('btn-soumettre')).toBeInTheDocument();
  });

  it("statut Brouillon SANS BUDGET.SOUMETTRE → aucun bouton", () => {
    const { container } = render(
      <WorkflowActions version={makeVersion('ouvert')} onTransitioned={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('statut Soumis + BUDGET.VALIDER → boutons Valider et Rejeter', () => {
    setPerms('BUDGET.VALIDER');
    render(
      <WorkflowActions version={makeVersion('soumis')} onTransitioned={vi.fn()} />,
    );
    expect(screen.getByTestId('btn-valider')).toBeInTheDocument();
    expect(screen.getByTestId('btn-rejeter')).toBeInTheDocument();
  });

  it('statut Validé + BUDGET.PUBLIER → bouton Publier', () => {
    setPerms('BUDGET.PUBLIER');
    render(
      <WorkflowActions version={makeVersion('valide')} onTransitioned={vi.fn()} />,
    );
    expect(screen.getByTestId('btn-publier')).toBeInTheDocument();
  });

  it('statut Publié (gele) → bandeau immuable, pas de bouton', () => {
    setPerms('BUDGET.PUBLIER', 'BUDGET.VALIDER', 'BUDGET.SOUMETTRE');
    render(
      <WorkflowActions version={makeVersion('gele')} onTransitioned={vi.fn()} />,
    );
    expect(screen.getByTestId('workflow-immuable')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-publier')).not.toBeInTheDocument();
  });

  it('clic « Soumettre » ouvre dialog avec textarea optionnel', () => {
    setPerms('BUDGET.SOUMETTRE');
    render(
      <WorkflowActions version={makeVersion('ouvert')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-soumettre'));
    expect(
      screen.getByText(/Soumettre à validation/i, { selector: 'h2,h3,h4' }),
    ).toBeInTheDocument();
    // Le bouton confirmer n'est PAS désactivé pour un commentaire facultatif.
    expect(screen.getByTestId('workflow-confirmer')).not.toBeDisabled();
  });

  it('rejet : bouton « Rejeter » désactivé tant que commentaire vide', () => {
    setPerms('BUDGET.VALIDER');
    render(
      <WorkflowActions version={makeVersion('soumis')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-rejeter'));
    const confirm = screen.getByTestId('workflow-confirmer');
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId('workflow-commentaire'), {
      target: { value: 'Provisions sous-évaluées' },
    });
    expect(confirm).not.toBeDisabled();
  });

  it('soumission OK : appelle API et onTransitioned avec la version retournée', async () => {
    setPerms('BUDGET.SOUMETTRE');
    const after = makeVersion('soumis', {
      dateSoumission: '2026-05-02T10:00:00Z',
      utilisateurSoumission: 'preparateur@miznas.local',
      commentaireSoumission: 'OK',
    });
    mockSoumettre.mockResolvedValue(after);
    const onTransitioned = vi.fn();

    render(
      <WorkflowActions
        version={makeVersion('ouvert')}
        onTransitioned={onTransitioned}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-soumettre'));
    fireEvent.change(screen.getByTestId('workflow-commentaire'), {
      target: { value: 'OK' },
    });
    fireEvent.click(screen.getByTestId('workflow-confirmer'));

    await waitFor(() => expect(onTransitioned).toHaveBeenCalledWith(after));
    expect(mockSoumettre).toHaveBeenCalledWith('42', { commentaire: 'OK' });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('soumission 422 (version vide) : toast erreur explicite', async () => {
    setPerms('BUDGET.SOUMETTRE');
    mockSoumettre.mockRejectedValue(
      buildAxiosError(422, 'Cette version est vide. Saisissez au moins une ligne.'),
    );
    render(
      <WorkflowActions version={makeVersion('ouvert')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-soumettre'));
    fireEvent.click(screen.getByTestId('workflow-confirmer'));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/vide/i),
      ),
    );
  });

  it('rejet OK : appelle l\'API avec commentaire requis', async () => {
    setPerms('BUDGET.VALIDER');
    mockRejeter.mockResolvedValue(makeVersion('ouvert'));
    render(
      <WorkflowActions version={makeVersion('soumis')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-rejeter'));
    fireEvent.change(screen.getByTestId('workflow-commentaire'), {
      target: { value: 'Frais sous-estimés' },
    });
    fireEvent.click(screen.getByTestId('workflow-confirmer'));
    await waitFor(() =>
      expect(mockRejeter).toHaveBeenCalledWith('42', {
        commentaire: 'Frais sous-estimés',
      }),
    );
  });

  it('publication 409 : toast erreur "statut incompatible"', async () => {
    setPerms('BUDGET.PUBLIER');
    mockPublier.mockRejectedValue(
      buildAxiosError(409, "Seule une version Validée peut être publiée."),
    );
    render(
      <WorkflowActions version={makeVersion('valide')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-publier'));
    fireEvent.click(screen.getByTestId('workflow-confirmer'));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Validée/),
      ),
    );
  });

  it("validation OK : passe le commentaire optionnel à l'API", async () => {
    setPerms('BUDGET.VALIDER');
    mockValider.mockResolvedValue(makeVersion('valide'));
    render(
      <WorkflowActions version={makeVersion('soumis')} onTransitioned={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('btn-valider'));
    // Confirme sans commentaire — doit appeler l'API avec {} (pas de commentaire).
    fireEvent.click(screen.getByTestId('workflow-confirmer'));
    await waitFor(() =>
      expect(mockValider).toHaveBeenCalledWith('42', { commentaire: undefined }),
    );
  });
});
