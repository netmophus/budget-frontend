import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColorPicker } from './ColorPicker';

afterEach(cleanup);

describe('ColorPicker (Lot B4)', () => {
  it('affiche le swatch + la saisie hex à la valeur courante', () => {
    render(
      <ColorPicker id="c" label="Primaire" value="#1B2A4E" onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('c')).toHaveValue('#1B2A4E');
    expect(screen.getByTestId('c-swatch')).toBeInTheDocument();
  });

  it('signale un format hex invalide', () => {
    render(
      <ColorPicker id="c" label="Primaire" value="ZZZ" onChange={vi.fn()} />,
    );
    expect(screen.getByText(/#RRGGBB/)).toBeInTheDocument();
  });

  it('ne signale pas d’erreur sur une valeur hex valide', () => {
    render(
      <ColorPicker id="c" label="Primaire" value="#005B2F" onChange={vi.fn()} />,
    );
    expect(screen.queryByText(/#RRGGBB/)).not.toBeInTheDocument();
  });

  it('propage la saisie manuelle via onChange', () => {
    const onChange = vi.fn();
    render(
      <ColorPicker id="c" label="Primaire" value="#000000" onChange={onChange} />,
    );
    fireEvent.change(screen.getByTestId('c'), { target: { value: '#123456' } });
    expect(onChange).toHaveBeenCalledWith('#123456');
  });

  it('applique une couleur suggérée au clic', () => {
    const onChange = vi.fn();
    render(
      <ColorPicker
        id="c"
        label="Primaire"
        value="#000000"
        onChange={onChange}
        suggestions={[{ hex: '#005B2F', label: 'Ecobank vert' }]}
      />,
    );
    fireEvent.click(screen.getByTestId('c-suggest-#005B2F'));
    expect(onChange).toHaveBeenCalledWith('#005B2F');
  });
});
