/**
 * Tests Vitest PvApprobationDetailsForm (Lot 8.3.D P3).
 *
 * 5 cas couvrent (pattern Lot 8.3.C NotePreparatoireDetailsForm.test) :
 *  1. Render mode édition : 6 sections + 2 RichTextEditors (testids
 *     "tiptap-ordre-du-jour" + "tiptap-decisions") + bouton Enregistrer
 *  2. Mode lecture seule (canEditer=false) : bouton CACHÉ + inputs
 *     disabled + 2 toolbars TipTap masquées
 *  3. Submit happy : API `mettreAJourDetailPvApprobation` appelée
 *     avec INTEGER converti en number, BOOLEAN en boolean, voteResultat
 *     en string. Champs vides → undefined (pattern Lot 8.3.A) sauf
 *     `quorumAtteint` (toujours envoyé, sémantique 2-state).
 *  4. Validation quorum cross-field : présents > total → bloque submit
 *     avec message d'erreur clair (zod refine)
 *  5. Récupération d'un détail avec voteResultat='UNANIMITE' →
 *     initialise correctement le Select shadcn
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailPvApprobation: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
    info: vi.fn(),
  },
}));

import { mettreAJourDetailPvApprobation } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { PvApprobationDetail } from '@/types/pv-approbation';

import { PvApprobationDetailsForm } from './PvApprobationDetailsForm';

const mockMettre =
  mettreAJourDetailPvApprobation as unknown as ReturnType<typeof vi.fn>;

const DETAIL_VIDE: PvApprobationDetail = {
  id: 'pad-1',
  fkDocument: 'doc-1',
  numeroResolution: null,
  dateSeanceCa: null,
  lieuSeance: null,
  presidentSeance: null,
  secretaireSeance: null,
  nbAdministrateursPresents: null,
  nbAdministrateursTotal: null,
  quorumAtteint: null,
  ordreDuJourHtml: null,
  decisionsHtml: null,
  voteResultat: null,
  commentairePresident: null,
  dateCreation: '2026-05-25T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('PvApprobationDetailsForm (Lot 8.3.D P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 6 sections + 2 RichTextEditors + bouton Enregistrer', () => {
    render(
      <PvApprobationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // 6 titres de sections numérotées
    expect(screen.getByText('1. Identification du PV')).toBeInTheDocument();
    expect(screen.getByText('2. Présidence de séance')).toBeInTheDocument();
    expect(screen.getByText('3. Quorum')).toBeInTheDocument();
    expect(
      screen.getByText('4. Ordre du jour de la séance (éditeur riche)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. Décisions adoptées (éditeur riche)'),
    ).toBeInTheDocument();
    expect(screen.getByText('6. Vote & commentaires')).toBeInTheDocument();

    // Champs clés présents
    expect(
      screen.getByTestId('pad-input-numeroResolution'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('pad-input-presidentSeance'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('pad-input-nbAdministrateursPresents'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pad-input-quorumAtteint')).toBeInTheDocument();
    expect(screen.getByTestId('pad-input-voteResultat')).toBeInTheDocument();
    expect(
      screen.getByTestId('pad-input-commentairePresident'),
    ).toBeInTheDocument();

    // 2 RichTextEditors distincts (testids explicites du brief P3)
    expect(screen.getByTestId('tiptap-ordre-du-jour')).toBeInTheDocument();
    expect(screen.getByTestId('tiptap-decisions')).toBeInTheDocument();
    // 2 toolbars TipTap rendues simultanément
    expect(screen.getAllByTestId('rich-text-toolbar')).toHaveLength(2);

    // Bouton Enregistrer visible
    expect(
      screen.getByTestId('btn-save-pv-approbation'),
    ).toBeInTheDocument();
  });

  it('2. mode lecture seule : bouton CACHÉ + inputs disabled + toolbars TipTap masquées', () => {
    render(
      <PvApprobationDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('btn-save-pv-approbation'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('pad-input-numeroResolution')).toBeDisabled();
    expect(
      screen.getByTestId('pad-input-nbAdministrateursPresents'),
    ).toBeDisabled();
    expect(screen.getByTestId('pad-input-quorumAtteint')).toBeDisabled();
    expect(
      screen.getByTestId('pad-input-commentairePresident'),
    ).toBeDisabled();
    // Les 2 toolbars TipTap sont masquées en mode read-only
    expect(
      screen.queryAllByTestId('rich-text-toolbar'),
    ).toHaveLength(0);
  });

  it('3. submit happy : INTEGER → number, BOOLEAN → boolean, voteResultat → string', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      numeroResolution: 'CA-BSIC-2027-007',
      nbAdministrateursPresents: 8,
      nbAdministrateursTotal: 10,
      quorumAtteint: true,
      voteResultat: 'UNANIMITE',
    });
    render(
      <PvApprobationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('pad-input-numeroResolution'), {
      target: { value: 'CA-BSIC-2027-007' },
    });
    fireEvent.change(
      screen.getByTestId('pad-input-nbAdministrateursPresents'),
      { target: { value: '8' } },
    );
    fireEvent.change(
      screen.getByTestId('pad-input-nbAdministrateursTotal'),
      { target: { value: '10' } },
    );
    // Toggle checkbox quorum atteint
    fireEvent.click(screen.getByTestId('pad-input-quorumAtteint'));
    fireEvent.click(screen.getByTestId('btn-save-pv-approbation'));

    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalled();
    });
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.numeroResolution).toBe('CA-BSIC-2027-007');
    // CRITIQUE : conversion string → number pour @IsInt backend
    expect(dtoSent.nbAdministrateursPresents).toBe(8);
    expect(typeof dtoSent.nbAdministrateursPresents).toBe('number');
    expect(dtoSent.nbAdministrateursTotal).toBe(10);
    expect(typeof dtoSent.nbAdministrateursTotal).toBe('number');
    // BOOLEAN : checkbox cochée → true (sémantique 2-state)
    expect(dtoSent.quorumAtteint).toBe(true);
    expect(typeof dtoSent.quorumAtteint).toBe('boolean');
    // Les champs vides ne sont PAS envoyés (sauf BOOLEAN ci-dessus)
    expect(dtoSent.lieuSeance).toBeUndefined();
    expect(dtoSent.commentairePresident).toBeUndefined();
    expect(dtoSent.voteResultat).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'PV d’approbation enregistré.',
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. validation quorum cross-field : présents > total → bloque submit', async () => {
    render(
      <PvApprobationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(
      screen.getByTestId('pad-input-nbAdministrateursPresents'),
      { target: { value: '15' } },
    );
    fireEvent.change(
      screen.getByTestId('pad-input-nbAdministrateursTotal'),
      { target: { value: '10' } },
    );
    fireEvent.click(screen.getByTestId('btn-save-pv-approbation'));

    await waitFor(() => {
      expect(
        screen.getByTestId('pad-err-nbAdministrateursPresents'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('pad-err-nbAdministrateursPresents').textContent,
    ).toMatch(/dépasser|total/i);
    expect(mockMettre).not.toHaveBeenCalled();
  });

  it('5. détail existant avec voteResultat = "MAJORITE" → initialise correctement', () => {
    render(
      <PvApprobationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={{
          ...DETAIL_VIDE,
          numeroResolution: 'CA-BSIC-2027-007',
          nbAdministrateursPresents: 7,
          nbAdministrateursTotal: 10,
          quorumAtteint: true,
          voteResultat: 'MAJORITE',
        }}
        onSaved={() => {}}
      />,
    );
    // Valeurs initiales bien chargées (number → string dans le form)
    expect(
      (screen.getByTestId('pad-input-numeroResolution') as HTMLInputElement)
        .value,
    ).toBe('CA-BSIC-2027-007');
    expect(
      (
        screen.getByTestId(
          'pad-input-nbAdministrateursPresents',
        ) as HTMLInputElement
      ).value,
    ).toBe('7');
    expect(
      (
        screen.getByTestId(
          'pad-input-nbAdministrateursTotal',
        ) as HTMLInputElement
      ).value,
    ).toBe('10');
    // Checkbox quorum cochée
    expect(
      (screen.getByTestId('pad-input-quorumAtteint') as HTMLInputElement)
        .checked,
    ).toBe(true);
    // Select voteResultat affiche le libellé FR sélectionné dans son
    // trigger (`getAllByText` car "Majorité" apparaît aussi dans la
    // liste d'options du SelectContent rendue par jsdom).
    expect(screen.getAllByText('Majorité').length).toBeGreaterThan(0);
    expect(
      screen.getByTestId('pad-input-voteResultat').textContent,
    ).toContain('Majorité');
  });
});
