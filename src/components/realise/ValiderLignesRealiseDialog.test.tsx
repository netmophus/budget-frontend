/**
 * Tests Vitest ValiderLignesRealiseDialog (Lot 5.1.B).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/stores/realise-store', () => ({
  useRealiseStore: (selector: (s: { validerSelection: () => Promise<{ nbValidees: number }> }) => unknown) =>
    selector({ validerSelection: vi.fn().mockResolvedValue({ nbValidees: 2 }) }),
}));

import { type FaitRealise } from '@/lib/api/realise';
import { ValiderLignesRealiseDialog } from './ValiderLignesRealiseDialog';

function makeRow(over: Partial<FaitRealise> = {}): FaitRealise {
  return {
    id: '1',
    fkCentreResponsabilite: '10',
    fkCompte: '20',
    fkLigneMetier: '30',
    fkTemps: '40',
    fkDevise: '50',
    montant: 1000,
    tauxChangeApplique: 1,
    mode: 'MNT',
    statut: 'IMPORTE',
    source: 'SAISIE',
    commentaire: null,
    valideLe: null,
    fkValidePar: null,
    dateCreation: '2027-01-15T00:00:00Z',
    ...over,
  };
}

describe('ValiderLignesRealiseDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le compteur de lignes IMPORTE sélectionnées', async () => {
    const lignes = [
      makeRow({ id: '1', statut: 'IMPORTE' }),
      makeRow({ id: '2', statut: 'IMPORTE' }),
      makeRow({ id: '3', statut: 'VALIDE' }),
    ];
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={lignes}
      />,
    );
    expect(screen.getByTestId('valid-count')).toHaveTextContent('2');
    expect(screen.getByTestId('btn-confirmer-validation')).toHaveTextContent(
      'Valider 2 ligne(s)',
    );
  });

  it("bouton Confirmer désactivé si aucune ligne IMPORTE", () => {
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={[makeRow({ statut: 'VALIDE' })]}
      />,
    );
    expect(screen.getByTestId('btn-confirmer-validation')).toBeDisabled();
  });

  it('clic sur Confirmer déclenche validerSelection', async () => {
    const onClose = vi.fn();
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={onClose}
        lignesSelectionnees={[makeRow({ id: '1', statut: 'IMPORTE' })]}
      />,
    );
    fireEvent.click(screen.getByTestId('btn-confirmer-validation'));
    // onClose est appelé après le succès (validerSelection mock résolu)
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
