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

  it("récap par compte affiche `code — libellé` quand le cache comptes est fourni (Lot 5-fix-ui)", () => {
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={[
          makeRow({ id: '1', fkCompte: '83', statut: 'IMPORTE' }),
          makeRow({ id: '2', fkCompte: '83', statut: 'IMPORTE' }),
          makeRow({ id: '3', fkCompte: '92', statut: 'IMPORTE' }),
        ]}
        comptes={{
          83: { code: '701100', libelle: 'Commissions de tenue de compte' },
          92: { code: '604200', libelle: 'Frais postaux' },
        }}
      />,
    );
    const ul = screen.getByTestId('valid-recap-comptes');
    expect(ul.textContent).toContain('604200 — Frais postaux');
    expect(ul.textContent).toContain(
      '701100 — Commissions de tenue de compte',
    );
    // Tri alphabétique : 604200 avant 701100
    expect(ul.textContent!.indexOf('604200')).toBeLessThan(
      ul.textContent!.indexOf('701100'),
    );
    // Plus de "#83"
    expect(ul.textContent).not.toContain('#83');
  });

  it("affiche '… et N autre(s)' quand plus de 5 comptes distincts (Lot 5-fix-ui)", () => {
    const lignes: FaitRealise[] = [];
    for (let i = 0; i < 7; i++) {
      lignes.push(makeRow({ id: String(i), fkCompte: String(i), statut: 'IMPORTE' }));
    }
    const comptes: Record<string, { code: string; libelle: string }> = {};
    for (let i = 0; i < 7; i++) {
      comptes[String(i)] = { code: `60110${i}`, libelle: `Compte ${i}` };
    }
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={lignes}
        comptes={comptes}
      />,
    );
    const reste = screen.getByTestId('valid-recap-reste');
    expect(reste.textContent).toContain('et 2 autre(s)');
  });

  it("texte de description ne mentionne plus la dévalidation (Lot 5-fix-ui)", () => {
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={[makeRow({ statut: 'IMPORTE' })]}
      />,
    );
    // L'ancien texte parlait de "dévalidation" — workflow simple à 2
    // statuts unidirectionnel, dévalidation absente du projet (Q4 Lot 5.1).
    expect(document.body.textContent).not.toContain('dévalidation');
    expect(document.body.textContent).not.toContain('devalidation');
    expect(document.body.textContent).toContain('ni supprimables');
  });

  it("fallback `#id` quand le cache comptes ne contient pas l'id (compte récemment créé)", () => {
    render(
      <ValiderLignesRealiseDialog
        isOpen={true}
        onClose={() => {}}
        lignesSelectionnees={[makeRow({ fkCompte: '999', statut: 'IMPORTE' })]}
        comptes={{}}
      />,
    );
    expect(screen.getByTestId('valid-recap-comptes').textContent).toContain(
      '#999',
    );
  });
});
