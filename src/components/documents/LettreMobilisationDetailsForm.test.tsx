/**
 * Tests Vitest LettreMobilisationDetailsForm (Lot 8.3.B P3).
 *
 * 5 cas couvrent (pattern Lot 8.3.A NoteOrientationDetailsForm.test) :
 *  1. Render mode édition : 7 sections + RichTextEditor + bouton
 *     "Enregistrer"
 *  2. Mode lecture seule (canEditer=false) : bouton CACHÉ + inputs
 *     disabled + toolbar TipTap masquée
 *  3. Submit happy : API `mettreAJourDetailLettreMobilisation`
 *     appelée avec `exerciceConcerne` ET `nbObjectifsPrioritaires`
 *     convertis en number (pattern Lot 8.3.A)
 *  4. nbObjectifsPrioritaires négatif → erreur zod + API jamais appelée
 *  5. TipTap RichTextEditor rendu sans crash + toolbar 5 boutons
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailLettreMobilisation: vi.fn(),
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

import { mettreAJourDetailLettreMobilisation } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { LettreMobilisationDetail } from '@/types/lettre-mobilisation';

import { LettreMobilisationDetailsForm } from './LettreMobilisationDetailsForm';

const mockMettre =
  mettreAJourDetailLettreMobilisation as unknown as ReturnType<typeof vi.fn>;

const DETAIL_VIDE: LettreMobilisationDetail = {
  id: 'lmd-1',
  fkDocument: 'doc-1',
  referenceLettre: null,
  dateEmission: null,
  destinatairesDirections: null,
  exerciceConcerne: null,
  dateDebutExecution: null,
  dateFinExecution: null,
  pnbConsolideMfcfa: null,
  rnConsolideMfcfa: null,
  croissanceCreditsGlobalePct: null,
  croissanceDepotsGlobalePct: null,
  tauxParticipationVisePct: null,
  nbObjectifsPrioritaires: null,
  tauxConformiteBudgetairePct: null,
  dateReunionMobilisation: null,
  dateDebutSaisieObjectifs: null,
  datePremierPointAvancement: null,
  dateValidationFinale: null,
  dateCommunicationBceao: null,
  messageDgHtml: null,
  engagementAttendu: null,
  dateCreation: '2026-05-24T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('LettreMobilisationDetailsForm (Lot 8.3.B P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 7 sections + RichTextEditor + bouton Enregistrer', () => {
    render(
      <LettreMobilisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // 7 titres de sections numérotées
    expect(
      screen.getByText('1. En-tête lettre officielle'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2. Période d'exécution"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('3. Objectifs globaux BSIC NIGER'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. Indicateurs de mobilisation'),
    ).toBeInTheDocument();
    expect(screen.getByText('5. Échéances clés')).toBeInTheDocument();
    expect(
      screen.getByText('6. Message du Directeur Général (éditeur riche)'),
    ).toBeInTheDocument();
    expect(screen.getByText('7. Engagement attendu')).toBeInTheDocument();

    // Champs clés présents
    expect(
      screen.getByTestId('lmd-input-referenceLettre'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('lmd-input-pnbConsolideMfcfa'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('lmd-input-nbObjectifsPrioritaires'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('lmd-input-engagementAttendu'),
    ).toBeInTheDocument();

    // RichTextEditor (TipTap) — toolbar visible
    expect(
      screen.getByTestId('lmd-input-messageDgHtml'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();

    // Bouton Enregistrer visible
    expect(screen.getByTestId('btn-save-mobilisation')).toBeInTheDocument();
  });

  it('2. mode lecture seule : bouton CACHÉ + inputs disabled + toolbar TipTap masquée', () => {
    render(
      <LettreMobilisationDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('btn-save-mobilisation'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('lmd-input-referenceLettre')).toBeDisabled();
    expect(
      screen.getByTestId('lmd-input-pnbConsolideMfcfa'),
    ).toBeDisabled();
    expect(
      screen.getByTestId('lmd-input-engagementAttendu'),
    ).toBeDisabled();
    // Toolbar TipTap masquée en mode read-only
    expect(
      screen.queryByTestId('rich-text-toolbar'),
    ).not.toBeInTheDocument();
  });

  it('3. submit happy : exerciceConcerne + nbObjectifsPrioritaires convertis en number (pattern Lot 8.3.A)', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      referenceLettre: 'DG/BSIC-NIGER/2028/MOBIL-01',
      exerciceConcerne: 2028,
      nbObjectifsPrioritaires: 12,
    });
    render(
      <LettreMobilisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('lmd-input-referenceLettre'), {
      target: { value: 'DG/BSIC-NIGER/2028/MOBIL-01' },
    });
    fireEvent.change(screen.getByTestId('lmd-input-exerciceConcerne'), {
      target: { value: '2028' },
    });
    fireEvent.change(screen.getByTestId('lmd-input-pnbConsolideMfcfa'), {
      target: { value: '14500.00' },
    });
    fireEvent.change(
      screen.getByTestId('lmd-input-nbObjectifsPrioritaires'),
      { target: { value: '12' } },
    );
    fireEvent.click(screen.getByTestId('btn-save-mobilisation'));

    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalled();
    });
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.referenceLettre).toBe('DG/BSIC-NIGER/2028/MOBIL-01');
    expect(dtoSent.pnbConsolideMfcfa).toBe('14500.00');
    // CRITIQUE : conversion string → number pour @IsInt backend
    // (les 2 champs INTEGER : exerciceConcerne + nbObjectifsPrioritaires)
    expect(dtoSent.exerciceConcerne).toBe(2028);
    expect(typeof dtoSent.exerciceConcerne).toBe('number');
    expect(dtoSent.nbObjectifsPrioritaires).toBe(12);
    expect(typeof dtoSent.nbObjectifsPrioritaires).toBe('number');
    // Les champs vides ne sont PAS envoyés
    expect(dtoSent.engagementAttendu).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        'Lettre de mobilisation enregistrée.',
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. nbObjectifsPrioritaires négatif → erreur zod + API jamais appelée', async () => {
    render(
      <LettreMobilisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(
      screen.getByTestId('lmd-input-nbObjectifsPrioritaires'),
      { target: { value: '-5' } },
    );
    fireEvent.click(screen.getByTestId('btn-save-mobilisation'));
    await waitFor(() => {
      expect(
        screen.getByTestId('lmd-err-nbObjectifsPrioritaires'),
      ).toBeInTheDocument();
    });
    // La regex `^\d+$` rejette le signe `-` → message "Entier positif requis"
    expect(
      screen.getByTestId('lmd-err-nbObjectifsPrioritaires').textContent,
    ).toMatch(/entier positif|négatif|positif requis/i);
    expect(mockMettre).not.toHaveBeenCalled();
  });

  it('5. TipTap RichTextEditor rendu sans crash + toolbar 5 boutons visibles', () => {
    render(
      <LettreMobilisationDetailsForm
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
      screen.getByTestId('lmd-input-messageDgHtml'),
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
