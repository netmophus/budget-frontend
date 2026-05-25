/**
 * Tests Vitest NotePreparatoireDetailsForm (Lot 8.3.C P3).
 *
 * 5 cas couvrent (pattern Lot 8.3.B LettreMobilisationDetailsForm.test) :
 *  1. Render mode édition : 7 sections + RichTextEditor + bouton
 *     "Enregistrer"
 *  2. Mode lecture seule (canEditer=false) : bouton CACHÉ + inputs
 *     disabled + toolbar TipTap masquée
 *  3. Submit happy : API `mettreAJourDetailNotePreparatoire` appelée
 *     avec `exerciceConcerne` converti en number (pattern Lot 8.3.A).
 *     Pas de `nbObjectifsPrioritaires` ici (champ spécifique D5).
 *  4. exerciceConcerne hors plage (1990) → erreur zod + API jamais
 *     appelée
 *  5. TipTap RichTextEditor rendu sans crash + toolbar 5 boutons
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailNotePreparatoire: vi.fn(),
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

import { mettreAJourDetailNotePreparatoire } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { NotePreparatoireDetail } from '@/types/note-preparatoire';

import { NotePreparatoireDetailsForm } from './NotePreparatoireDetailsForm';

const mockMettre =
  mettreAJourDetailNotePreparatoire as unknown as ReturnType<typeof vi.fn>;

const DETAIL_VIDE: NotePreparatoireDetail = {
  id: 'npd-1',
  fkDocument: 'doc-1',
  referenceNote: null,
  dateEmission: null,
  dateConvocationComite: null,
  lieuReunion: null,
  participantsConvoques: null,
  exerciceConcerne: null,
  dateDebutPreparation: null,
  dateButoirPreparation: null,
  ordreDuJourHtml: null,
  documentsPreLus: null,
  pointsClesDebattre: null,
  decisionsAttendues: null,
  dateCreation: '2026-05-25T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('NotePreparatoireDetailsForm (Lot 8.3.C P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 7 sections + RichTextEditor + bouton Enregistrer', () => {
    render(
      <NotePreparatoireDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // 7 titres de sections numérotées
    expect(
      screen.getByText('1. En-tête note préparatoire'),
    ).toBeInTheDocument();
    expect(screen.getByText('2. Participants convoqués')).toBeInTheDocument();
    expect(
      screen.getByText('3. Exercice budgétaire concerné'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. Ordre du jour (éditeur riche)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. Documents pré-lus attendus'),
    ).toBeInTheDocument();
    expect(screen.getByText('6. Points clés à débattre')).toBeInTheDocument();
    expect(screen.getByText('7. Décisions attendues')).toBeInTheDocument();

    // Champs clés présents
    expect(screen.getByTestId('npd-input-referenceNote')).toBeInTheDocument();
    expect(screen.getByTestId('npd-input-lieuReunion')).toBeInTheDocument();
    expect(
      screen.getByTestId('npd-input-participantsConvoques'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('npd-input-pointsClesDebattre'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('npd-input-decisionsAttendues'),
    ).toBeInTheDocument();

    // RichTextEditor (TipTap) — toolbar visible
    expect(
      screen.getByTestId('npd-input-ordreDuJourHtml'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();

    // Bouton Enregistrer visible
    expect(screen.getByTestId('btn-save-preparatoire')).toBeInTheDocument();
  });

  it('2. mode lecture seule : bouton CACHÉ + inputs disabled + toolbar TipTap masquée', () => {
    render(
      <NotePreparatoireDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('btn-save-preparatoire'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('npd-input-referenceNote')).toBeDisabled();
    expect(
      screen.getByTestId('npd-input-participantsConvoques'),
    ).toBeDisabled();
    expect(
      screen.getByTestId('npd-input-decisionsAttendues'),
    ).toBeDisabled();
    // Toolbar TipTap masquée en mode read-only
    expect(
      screen.queryByTestId('rich-text-toolbar'),
    ).not.toBeInTheDocument();
  });

  it('3. submit happy : exerciceConcerne converti en number (pattern Lot 8.3.A)', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      referenceNote: 'DG/BSIC-NIGER/2028/PREP-01',
      exerciceConcerne: 2028,
      lieuReunion: 'Salle CODIR — Siège BSIC NIGER',
    });
    render(
      <NotePreparatoireDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('npd-input-referenceNote'), {
      target: { value: 'DG/BSIC-NIGER/2028/PREP-01' },
    });
    fireEvent.change(screen.getByTestId('npd-input-exerciceConcerne'), {
      target: { value: '2028' },
    });
    fireEvent.change(screen.getByTestId('npd-input-lieuReunion'), {
      target: { value: 'Salle CODIR — Siège BSIC NIGER' },
    });
    fireEvent.change(
      screen.getByTestId('npd-input-pointsClesDebattre'),
      { target: { value: 'Priorités investissement IT 2028.' } },
    );
    fireEvent.click(screen.getByTestId('btn-save-preparatoire'));

    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalled();
    });
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.referenceNote).toBe('DG/BSIC-NIGER/2028/PREP-01');
    expect(dtoSent.lieuReunion).toBe('Salle CODIR — Siège BSIC NIGER');
    expect(dtoSent.pointsClesDebattre).toBe(
      'Priorités investissement IT 2028.',
    );
    // CRITIQUE : conversion string → number pour @IsInt backend
    expect(dtoSent.exerciceConcerne).toBe(2028);
    expect(typeof dtoSent.exerciceConcerne).toBe('number');
    // Les champs vides ne sont PAS envoyés
    expect(dtoSent.decisionsAttendues).toBeUndefined();
    expect(dtoSent.participantsConvoques).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'Note préparatoire enregistrée.',
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. exerciceConcerne hors plage (1990) → erreur zod + API jamais appelée', async () => {
    render(
      <NotePreparatoireDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId('npd-input-exerciceConcerne'), {
      target: { value: '1990' },
    });
    fireEvent.click(screen.getByTestId('btn-save-preparatoire'));
    await waitFor(() => {
      expect(
        screen.getByTestId('npd-err-exerciceConcerne'),
      ).toBeInTheDocument();
    });
    // Message zod : "Exercice entre 2020 et 2050"
    expect(
      screen.getByTestId('npd-err-exerciceConcerne').textContent,
    ).toMatch(/2020|2050|plage/i);
    expect(mockMettre).not.toHaveBeenCalled();
  });

  it('5. TipTap RichTextEditor rendu sans crash + toolbar 5 boutons visibles', () => {
    render(
      <NotePreparatoireDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // Le composant TipTap est monté (testid racine + toolbar).
    // Cohérent compromis Lot 8.3.A : pas de simulation clavier
    // (Prosemirror dépend d'événements DOM non couverts par jsdom).
    expect(
      screen.getByTestId('npd-input-ordreDuJourHtml'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Gras' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Italique' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Titre' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Liste à puces' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Liste numérotée' }),
    ).toBeInTheDocument();
  });
});
