import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('rend le titre et la description quand isOpen=true', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Désactiver la structure"
        description="Cette action est irréversible."
      />,
    );
    expect(screen.getByText('Désactiver la structure')).toBeInTheDocument();
    expect(
      screen.getByText('Cette action est irréversible.'),
    ).toBeInTheDocument();
  });

  it('ne rend rien quand isOpen=false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Désactiver"
        description="..."
      />,
    );
    expect(screen.queryByText('Désactiver')).not.toBeInTheDocument();
  });

  it('Annuler appelle onClose sans onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="X"
        description="Y"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Confirmer appelle onConfirm puis onClose en cas de succès', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="X"
        description="Y"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Confirmer/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("ne ferme PAS le dialog si onConfirm throw (caller affiche le toast)", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new Error('boom'));
    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="X"
        description="Y"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Confirmer/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('utilise les textes personnalisés confirmText / cancelText', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="X"
        description="Y"
        confirmText="Désactiver"
        cancelText="Garder"
        destructive
      />,
    );
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Garder/i }),
    ).toBeInTheDocument();
  });
});
