/**
 * Tests Vitest LettreOfficialisationDetailsForm (Lot 8.3.E P3).
 *
 * 5 cas couvrent (pattern Lot 8.3.D PvApprobationDetailsForm.test) :
 *  1. Render mode édition : 5 sections + 1 RichTextEditor (testid
 *     "tiptap-corps-lettre") + checkbox cachet + bouton Enregistrer
 *  2. Mode lecture seule : bouton CACHÉ + inputs disabled + toolbar
 *     TipTap masquée
 *  3. Submit happy : strings → strings, BOOLEAN → boolean, dates →
 *     ISO. Champs vides → undefined sauf `cachetAppose` (toujours
 *     envoyé, sémantique 2-state).
 *  4. Validation cross-field : dateEntreeVigueur < dateEmission →
 *     bloque submit avec message d'erreur clair (zod refine).
 *  5. Initialisation depuis détail existant cachet_appose=true →
 *     checkbox cochée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailLettreOfficialisation: vi.fn(),
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

import { mettreAJourDetailLettreOfficialisation } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { LettreOfficialisationDetail } from '@/types/lettre-officialisation';

import { LettreOfficialisationDetailsForm } from './LettreOfficialisationDetailsForm';

const mockMettre =
  mettreAJourDetailLettreOfficialisation as unknown as ReturnType<
    typeof vi.fn
  >;

const DETAIL_VIDE: LettreOfficialisationDetail = {
  id: 'lod-1',
  fkDocument: 'doc-1',
  numeroLettre: null,
  dateEmission: null,
  objet: null,
  referencePvCa: null,
  destinatairesPrincipaux: null,
  destinatairesCopies: null,
  piecesJointes: null,
  corpsHtml: null,
  signataire: null,
  dateEntreeVigueur: null,
  cachetAppose: null,
  dateCreation: '2026-05-25T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('LettreOfficialisationDetailsForm (Lot 8.3.E P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 5 sections + 1 RichTextEditor + checkbox cachet + bouton Enregistrer', () => {
    render(
      <LettreOfficialisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // 5 titres de sections numérotées
    expect(
      screen.getByText('1. Identification de la lettre'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2. Référence du PV d'approbation CA"),
    ).toBeInTheDocument();
    expect(
      screen.getByText('3. Destinataires et pièces jointes'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. Corps de la lettre (éditeur riche)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. Signature & officialisation'),
    ).toBeInTheDocument();

    // Champs clés présents
    expect(screen.getByTestId('lod-input-numeroLettre')).toBeInTheDocument();
    expect(screen.getByTestId('lod-input-objet')).toBeInTheDocument();
    expect(screen.getByTestId('lod-input-referencePvCa')).toBeInTheDocument();
    expect(
      screen.getByTestId('lod-input-destinatairesPrincipaux'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('lod-input-signataire')).toBeInTheDocument();
    expect(screen.getByTestId('lod-input-cachetAppose')).toBeInTheDocument();

    // 1 RichTextEditor (testid explicite du brief P3)
    expect(screen.getByTestId('tiptap-corps-lettre')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-toolbar')).toBeInTheDocument();

    // Bouton Enregistrer visible
    expect(
      screen.getByTestId('btn-save-lettre-officialisation'),
    ).toBeInTheDocument();
  });

  it('2. mode lecture seule : bouton CACHÉ + inputs disabled + toolbar TipTap masquée', () => {
    render(
      <LettreOfficialisationDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('btn-save-lettre-officialisation'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('lod-input-numeroLettre')).toBeDisabled();
    expect(screen.getByTestId('lod-input-cachetAppose')).toBeDisabled();
    expect(screen.getByTestId('lod-input-signataire')).toBeDisabled();
    // Toolbar TipTap masquée en mode read-only
    expect(
      screen.queryByTestId('rich-text-toolbar'),
    ).not.toBeInTheDocument();
  });

  it('3. submit happy : strings → strings, BOOLEAN → boolean, dates → ISO, champs vides → undefined', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      numeroLettre: 'LOFF-BSIC-2027-001',
      dateEmission: '2027-12-22',
      objet: 'Officialisation du budget 2028',
      referencePvCa: 'CA-BSIC-2027-007',
      cachetAppose: true,
    });
    render(
      <LettreOfficialisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('lod-input-numeroLettre'), {
      target: { value: 'LOFF-BSIC-2027-001' },
    });
    fireEvent.change(screen.getByTestId('lod-input-dateEmission'), {
      target: { value: '2027-12-22' },
    });
    fireEvent.change(screen.getByTestId('lod-input-objet'), {
      target: { value: 'Officialisation du budget 2028' },
    });
    fireEvent.change(screen.getByTestId('lod-input-referencePvCa'), {
      target: { value: 'CA-BSIC-2027-007' },
    });
    fireEvent.click(screen.getByTestId('lod-input-cachetAppose'));
    fireEvent.click(screen.getByTestId('btn-save-lettre-officialisation'));

    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalled();
    });
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.numeroLettre).toBe('LOFF-BSIC-2027-001');
    expect(dtoSent.dateEmission).toBe('2027-12-22');
    expect(dtoSent.objet).toBe('Officialisation du budget 2028');
    expect(dtoSent.referencePvCa).toBe('CA-BSIC-2027-007');
    // BOOLEAN : checkbox cochée → true (sémantique 2-state)
    expect(dtoSent.cachetAppose).toBe(true);
    expect(typeof dtoSent.cachetAppose).toBe('boolean');
    // Les champs vides ne sont PAS envoyés (sauf BOOLEAN ci-dessus)
    expect(dtoSent.destinatairesPrincipaux).toBeUndefined();
    expect(dtoSent.signataire).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Lettre d'officialisation enregistrée.",
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. validation cross-field : dateEntreeVigueur < dateEmission → bloque submit', async () => {
    render(
      <LettreOfficialisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId('lod-input-dateEmission'), {
      target: { value: '2027-12-22' },
    });
    fireEvent.change(screen.getByTestId('lod-input-dateEntreeVigueur'), {
      target: { value: '2027-01-01' },
    });
    fireEvent.click(screen.getByTestId('btn-save-lettre-officialisation'));

    await waitFor(() => {
      expect(
        screen.getByTestId('lod-err-dateEntreeVigueur'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('lod-err-dateEntreeVigueur').textContent,
    ).toMatch(/antérieure|émission/i);
    expect(mockMettre).not.toHaveBeenCalled();
  });

  it('5. détail existant avec cachet_appose=true → checkbox cochée', () => {
    render(
      <LettreOfficialisationDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={{
          ...DETAIL_VIDE,
          numeroLettre: 'LOFF-BSIC-2027-001',
          cachetAppose: true,
        }}
        onSaved={() => {}}
      />,
    );
    expect(
      (screen.getByTestId('lod-input-numeroLettre') as HTMLInputElement)
        .value,
    ).toBe('LOFF-BSIC-2027-001');
    // Checkbox cachet cochée à l'init
    expect(
      (screen.getByTestId('lod-input-cachetAppose') as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
});
