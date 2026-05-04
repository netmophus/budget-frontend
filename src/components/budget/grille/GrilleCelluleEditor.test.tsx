/**
 * Tests Vitest GrilleCelluleEditor (Lot 3.4) — focus interaction
 * mode MONTANT (input texte) et mode ENCOURS_TIE (popover Dialog).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GrilleCellule } from '@/lib/api/budget-grille';
import { GrilleCelluleEditor } from './GrilleCelluleEditor';

function celluleVide(mois = '2027-01-01'): GrilleCellule {
  return {
    mois,
    montant: 0,
    modeSaisie: null,
    encoursMoyen: null,
    tie: null,
    commentaire: null,
    ligneId: null,
  };
}

describe('GrilleCelluleEditor — mode MONTANT', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('input affiche valeur formatée fr-FR', () => {
    const cell: GrilleCellule = { ...celluleVide(), montant: 1_500_000 };
    render(
      <GrilleCelluleEditor
        cellule={cell}
        modeLigne="MONTANT"
        estPorteurInterets={false}
        isModified={false}
        readOnly={false}
        onChange={vi.fn()}
      />,
    );
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.value).toMatch(/1[\s ]500[\s ]000/);
  });

  it('saisie + blur appelle onChange avec montant parsé', () => {
    const onChange = vi.fn();
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="MONTANT"
        estPorteurInterets={false}
        isModified={false}
        readOnly={false}
        onChange={onChange}
      />,
    );
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2 500 000' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({
      montant: 2_500_000,
      modeSaisie: 'MONTANT',
    });
  });

  it("readOnly=true → input disabled", () => {
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="MONTANT"
        estPorteurInterets={false}
        isModified={false}
        readOnly={true}
        onChange={vi.fn()}
      />,
    );
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("isModified=true → bordure orange dans la classe", () => {
    render(
      <GrilleCelluleEditor
        cellule={{ ...celluleVide(), montant: 1000 }}
        modeLigne="MONTANT"
        estPorteurInterets={false}
        isModified={true}
        readOnly={false}
        onChange={vi.fn()}
      />,
    );
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.className).toMatch(/orange/);
  });

  it("parser indulgent : virgule décimale acceptée", () => {
    const onChange = vi.fn();
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="MONTANT"
        estPorteurInterets={false}
        isModified={false}
        readOnly={false}
        onChange={onChange}
      />,
    );
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1234,56' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({
      montant: 1234.56,
      modeSaisie: 'MONTANT',
    });
  });
});

describe('GrilleCelluleEditor — mode ENCOURS_TIE', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('bouton ouvre popover, montant calculé en temps réel', async () => {
    const onChange = vi.fn();
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="ENCOURS_TIE"
        estPorteurInterets={true}
        isModified={false}
        readOnly={false}
        onChange={onChange}
      />,
    );
    const btn = document.querySelector('button[type="button"]') as HTMLButtonElement;
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Mode Encours × TIE')).toBeInTheDocument();
    });
    const encoursInput = screen.getByLabelText(
      /Encours moyen mensuel/i,
    ) as HTMLInputElement;
    const tieInput = screen.getByLabelText(/TIE annuel/i) as HTMLInputElement;
    fireEvent.change(encoursInput, { target: { value: '1 200 000 000' } });
    fireEvent.change(tieInput, { target: { value: '0,045' } });
    // 1.2 milliard × 0.045 / 12 = 4 500 000
    await waitFor(() => {
      expect(screen.getByText(/4[\s ]500[\s ]000 FCFA/)).toBeInTheDocument();
    });
  });

  it('TIE > 1 : alerte affichée + bouton Valider désactivé', async () => {
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="ENCOURS_TIE"
        estPorteurInterets={true}
        isModified={false}
        readOnly={false}
        onChange={vi.fn()}
      />,
    );
    const btn = document.querySelector('button[type="button"]') as HTMLButtonElement;
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Mode Encours × TIE')).toBeInTheDocument();
    });
    const encoursInput = screen.getByLabelText(
      /Encours moyen mensuel/i,
    ) as HTMLInputElement;
    const tieInput = screen.getByLabelText(/TIE annuel/i) as HTMLInputElement;
    fireEvent.change(encoursInput, { target: { value: '100' } });
    fireEvent.change(tieInput, { target: { value: '8.5' } }); // erreur user
    await waitFor(() => {
      expect(screen.getByText(/TIE supérieur à 1/i)).toBeInTheDocument();
    });
    const valider = screen.getByRole('button', {
      name: /^Valider$/,
    }) as HTMLButtonElement;
    expect(valider.disabled).toBe(true);
  });

  it('Valider appelle onChange avec montant calculé + ferme popover', async () => {
    const onChange = vi.fn();
    render(
      <GrilleCelluleEditor
        cellule={celluleVide()}
        modeLigne="ENCOURS_TIE"
        estPorteurInterets={true}
        isModified={false}
        readOnly={false}
        onChange={onChange}
      />,
    );
    const btn = document.querySelector('button[type="button"]') as HTMLButtonElement;
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('Mode Encours × TIE')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/Encours moyen mensuel/i), {
      target: { value: '12 000' },
    });
    fireEvent.change(screen.getByLabelText(/TIE annuel/i), {
      target: { value: '0,1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Valider$/ }));
    expect(onChange).toHaveBeenCalledWith({
      modeSaisie: 'ENCOURS_TIE',
      encoursMoyen: 12000,
      tie: 0.1,
      // 12000 × 0.1 / 12 = 100
      montant: 100,
    });
  });
});
