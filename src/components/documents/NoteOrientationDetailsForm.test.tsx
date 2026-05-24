/**
 * Tests Vitest NoteOrientationDetailsForm (Lot 8.3.A P3).
 *
 * 5 cas couvrent :
 *  1. Render mode édition : 7 sections + bouton "Enregistrer"
 *  2. Mode lecture seule (canEditer=false) : bouton CACHÉ + inputs
 *     disabled
 *  3. Submit happy : API `mettreAJourDetailNoteOrientation` appelée
 *     avec exerciceConcerne converti en number (et pas string)
 *  4. Exercice hors plage 1990 → erreur zod + API jamais appelée
 *  5. TipTap RichTextEditor rendu sans crash (présence du testid
 *     racine + toolbar visible en mode édition)
 *
 * Note : on NE simule pas de saisie clavier dans TipTap — Prosemirror
 * dépend de DOM events que jsdom ne couvre pas tous (selection range,
 * compositionstart, etc.). Validation Playwright recommandée pour
 * tester l'interaction réelle de l'éditeur (cohérent avec compromis
 * Radix Select déjà acté Lot 8.2.B P3).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailNoteOrientation: vi.fn(),
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

import { mettreAJourDetailNoteOrientation } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { NoteOrientationDetail } from '@/types/note-orientation';

import { NoteOrientationDetailsForm } from './NoteOrientationDetailsForm';

const mockMettre = mettreAJourDetailNoteOrientation as unknown as ReturnType<
  typeof vi.fn
>;

const DETAIL_VIDE: NoteOrientationDetail = {
  id: 'nod-1',
  fkDocument: 'doc-1',
  numeroNote: null,
  dateEmission: null,
  emetteurDirection: null,
  destinataire: null,
  exerciceConcerne: null,
  dateDebutApplication: null,
  dateFinApplication: null,
  tauxDirecteurBceaoPct: null,
  inflationNigerPct: null,
  croissancePibNigerPct: null,
  tauxChangeUsdFcfa: null,
  coursPetroleUsd: null,
  partMarcheActuellePct: null,
  partMarcheCiblePct: null,
  principauxConcurrents: null,
  avantagesCompetitifs: null,
  axeDigitalisation: null,
  axeDeveloppementPme: null,
  axeInclusionFinanciere: null,
  axeAutresPriorites: null,
  descriptionDetailleeHtml: null,
  recommandations: null,
  dateCreation: '2026-05-24T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('NoteOrientationDetailsForm (Lot 8.3.A P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 7 sections + RichTextEditor + bouton Enregistrer', () => {
    render(
      <NoteOrientationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // 7 titres de sections numérotées
    expect(screen.getByText('1. En-tête note interne')).toBeInTheDocument();
    expect(
      screen.getByText("2. Période d'application"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('3. Hypothèses macroéconomiques'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. Positionnement marché BSIC'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. Axes stratégiques prioritaires'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('6. Description détaillée (éditeur riche)'),
    ).toBeInTheDocument();
    expect(screen.getByText('7. Recommandations')).toBeInTheDocument();

    // Champs clés présents
    expect(screen.getByTestId('nod-input-numeroNote')).toBeInTheDocument();
    expect(
      screen.getByTestId('nod-input-tauxDirecteurBceaoPct'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('nod-input-axeDigitalisation'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('nod-input-recommandations'),
    ).toBeInTheDocument();

    // RichTextEditor (TipTap) — toolbar visible + zone d'édition
    expect(
      screen.getByTestId('nod-input-descriptionDetailleeHtml'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();

    // Bouton Enregistrer visible
    expect(screen.getByTestId('btn-save-orientation')).toBeInTheDocument();
  });

  it('2. mode lecture seule : bouton CACHÉ + inputs disabled + toolbar TipTap masquée', () => {
    render(
      <NoteOrientationDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('btn-save-orientation'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('nod-input-numeroNote')).toBeDisabled();
    expect(
      screen.getByTestId('nod-input-tauxDirecteurBceaoPct'),
    ).toBeDisabled();
    expect(screen.getByTestId('nod-input-recommandations')).toBeDisabled();
    // Toolbar TipTap masquée en mode read-only
    expect(
      screen.queryByTestId('rich-text-toolbar'),
    ).not.toBeInTheDocument();
  });

  it('3. submit happy : API appelée avec exerciceConcerne en number (pas string)', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      numeroNote: 'DG/BSIC-NIGER/2027/ORIENT-01',
      exerciceConcerne: 2027,
    });
    render(
      <NoteOrientationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('nod-input-numeroNote'), {
      target: { value: 'DG/BSIC-NIGER/2027/ORIENT-01' },
    });
    fireEvent.change(screen.getByTestId('nod-input-exerciceConcerne'), {
      target: { value: '2027' },
    });
    fireEvent.change(screen.getByTestId('nod-input-tauxDirecteurBceaoPct'), {
      target: { value: '5.50' },
    });
    fireEvent.click(screen.getByTestId('btn-save-orientation'));

    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalled();
    });
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.numeroNote).toBe('DG/BSIC-NIGER/2027/ORIENT-01');
    // CRITIQUE : conversion string → number pour @IsInt backend
    expect(dtoSent.exerciceConcerne).toBe(2027);
    expect(typeof dtoSent.exerciceConcerne).toBe('number');
    expect(dtoSent.tauxDirecteurBceaoPct).toBe('5.50');
    // Les champs vides ne sont PAS envoyés
    expect(dtoSent.recommandations).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Note d'orientation enregistrée.",
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. exercice hors plage (1990) → erreur zod + API jamais appelée', async () => {
    render(
      <NoteOrientationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId('nod-input-exerciceConcerne'), {
      target: { value: '1990' },
    });
    fireEvent.click(screen.getByTestId('btn-save-orientation'));
    await waitFor(() => {
      expect(
        screen.getByTestId('nod-err-exerciceConcerne'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('nod-err-exerciceConcerne').textContent,
    ).toMatch(/2020|2050/i);
    expect(mockMettre).not.toHaveBeenCalled();
  });

  it('5. TipTap RichTextEditor rendu sans crash + toolbar visible en mode édition', () => {
    render(
      <NoteOrientationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // Le composant TipTap est monté (testid racine RichTextEditor +
    // toolbar). On ne simule PAS de saisie clavier — Prosemirror
    // dépend d'événements DOM que jsdom ne supporte pas tous
    // (cohérent compromis Radix Select Lot 8.2.B P3, TODO Playwright).
    expect(
      screen.getByTestId('nod-input-descriptionDetailleeHtml'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();
    // 5 boutons toolbar (Bold/Italic/H2/UL/OL) — vérifie via aria-label
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
