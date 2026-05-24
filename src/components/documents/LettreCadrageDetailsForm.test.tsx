/**
 * Tests Vitest LettreCadrageDetailsForm (Lot 8.2.C P3).
 *
 * 4 cas couvrent :
 *  1. Render avec detail vide : tous les champs vides + bouton
 *     "Enregistrer" visible (mode édition)
 *  2. Mode lecture seule (`canEditer=false`) : bouton "Enregistrer"
 *     CACHÉ + inputs `disabled`
 *  3. Submit happy : API `mettreAJourDetailCadrage` appelée avec
 *     les valeurs non vides + toast success + callback onSaved
 *  4. Champ numérique invalide → erreur zod visible + API jamais
 *     appelée
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  mettreAJourDetailCadrage: vi.fn(),
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

import { mettreAJourDetailCadrage } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { LettreCadrageDetail } from '@/types/lettre-cadrage';

import { LettreCadrageDetailsForm } from './LettreCadrageDetailsForm';

const mockMettre = mettreAJourDetailCadrage as unknown as ReturnType<
  typeof vi.fn
>;

const DETAIL_VIDE: LettreCadrageDetail = {
  id: 'lcd-1',
  fkDocument: 'doc-1',
  referenceHolding: null,
  dateEmissionHolding: null,
  signataireHolding: null,
  pnbCibleMfcfa: null,
  rnCibleMfcfa: null,
  croissanceCreditsPct: null,
  croissanceDepotsPct: null,
  coefficientExploitationPct: null,
  roeCiblePct: null,
  ratioSolvabiliteMinPct: null,
  ratioLiquiditeMinPct: null,
  ratioDivisionRisquesPct: null,
  dateDebutSaisie: null,
  dateLimiteSaisieCr: null,
  dateValidationDga: null,
  dateValidationDg: null,
  datePublicationBceao: null,
  orientationsStrategiques: null,
  dateCreation: '2026-05-24T10:00:00Z',
  dateModification: null,
  utilisateurCreation: 'dg@bsic.ne',
  utilisateurModification: null,
};

describe('LettreCadrageDetailsForm (Lot 8.2.C P3)', () => {
  beforeEach(() => {
    // defaults safe
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. render mode édition : 5 sections + bouton "Enregistrer" visible', () => {
    render(
      <LettreCadrageDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    // Les 5 sections cards (titres uppercase)
    expect(screen.getByText('1. En-tête Holding')).toBeInTheDocument();
    expect(screen.getByText('2. Objectifs quantitatifs')).toBeInTheDocument();
    expect(
      screen.getByText('3. Ratios prudentiels BCEAO'),
    ).toBeInTheDocument();
    expect(screen.getByText('4. Calendrier budgétaire')).toBeInTheDocument();
    expect(
      screen.getByText('5. Orientations stratégiques'),
    ).toBeInTheDocument();
    // Champs principaux présents
    expect(
      screen.getByTestId('lcd-input-referenceHolding'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('lcd-input-pnbCibleMfcfa')).toBeInTheDocument();
    expect(
      screen.getByTestId('lcd-input-ratioSolvabiliteMinPct'),
    ).toBeInTheDocument();
    // Bouton Enregistrer visible (canEditer=true)
    expect(screen.getByTestId('btn-save-cadrage')).toBeInTheDocument();
  });

  it('2. mode lecture seule (canEditer=false) : bouton CACHÉ + inputs disabled', () => {
    render(
      <LettreCadrageDetailsForm
        documentId="doc-1"
        canEditer={false}
        detail={DETAIL_VIDE}
        onSaved={() => {}}
      />,
    );
    // Bouton Enregistrer ABSENT
    expect(
      screen.queryByTestId('btn-save-cadrage'),
    ).not.toBeInTheDocument();
    // Inputs disabled
    expect(screen.getByTestId('lcd-input-referenceHolding')).toBeDisabled();
    expect(screen.getByTestId('lcd-input-pnbCibleMfcfa')).toBeDisabled();
    expect(
      screen.getByTestId('lcd-input-orientationsStrategiques'),
    ).toBeDisabled();
  });

  it('3. submit happy : API appelée avec champs non vides + toast + onSaved', async () => {
    const onSaved = vi.fn();
    mockMettre.mockResolvedValue({
      ...DETAIL_VIDE,
      pnbCibleMfcfa: '12500.00',
      referenceHolding: 'CA/BSIC-HOLDING/2025/047',
    });
    render(
      <LettreCadrageDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={onSaved}
      />,
    );
    fireEvent.change(screen.getByTestId('lcd-input-referenceHolding'), {
      target: { value: 'CA/BSIC-HOLDING/2025/047' },
    });
    fireEvent.change(screen.getByTestId('lcd-input-pnbCibleMfcfa'), {
      target: { value: '12500.00' },
    });
    fireEvent.click(screen.getByTestId('btn-save-cadrage'));
    await waitFor(() => {
      expect(mockMettre).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({
          referenceHolding: 'CA/BSIC-HOLDING/2025/047',
          pnbCibleMfcfa: '12500.00',
        }),
      );
    });
    // Les champs vides ne sont PAS envoyés dans le DTO (convert '' → omit).
    const callArgs = mockMettre.mock.calls.at(-1) ?? [];
    const dtoSent = callArgs[1] as Record<string, unknown>;
    expect(dtoSent.signataireHolding).toBeUndefined();
    expect(dtoSent.orientationsStrategiques).toBeUndefined();

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Cadrage enregistré.');
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('4. champ numérique invalide → erreur zod + API jamais appelée', async () => {
    render(
      <LettreCadrageDetailsForm
        documentId="doc-1"
        canEditer={true}
        detail={null}
        onSaved={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId('lcd-input-pnbCibleMfcfa'), {
      target: { value: 'pas-un-nombre' },
    });
    fireEvent.click(screen.getByTestId('btn-save-cadrage'));
    await waitFor(() => {
      expect(
        screen.getByTestId('lcd-err-pnbCibleMfcfa'),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('lcd-err-pnbCibleMfcfa').textContent).toMatch(
      /Nombre invalide/i,
    );
    expect(mockMettre).not.toHaveBeenCalled();
  });
});
