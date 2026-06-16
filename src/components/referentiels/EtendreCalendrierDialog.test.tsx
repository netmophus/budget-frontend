/**
 * Tests EtendreCalendrierDialog (Lot 8.7.A).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  etendreCalendrier: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import { etendreCalendrier } from '@/lib/api/referentiels';
import type { EffectivePermission } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/auth-store';
import { EtendreCalendrierDialog } from './EtendreCalendrierDialog';

const mockEtendre = etendreCalendrier as unknown as ReturnType<typeof vi.fn>;

function setPermissions(codes: string[]): void {
  useAuthStore.setState({
    permissions: codes.map(
      (c) => ({ code_permission: c }) as EffectivePermission,
    ),
  });
}

describe('EtendreCalendrierDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
    setPermissions([]);
  });

  it('affiche une erreur quand anneeFin < anneeDebut', () => {
    setPermissions(['REFERENTIEL.GERER']);
    render(
      <EtendreCalendrierDialog
        open
        onClose={vi.fn()}
        onExtended={vi.fn()}
        defaultAnneeDebut={2031}
      />,
    );

    fireEvent.change(screen.getByTestId('etendre-annee-fin'), {
      target: { value: '2030' },
    });

    expect(screen.getByTestId('etendre-error')).toBeInTheDocument();
    expect(screen.getByTestId('etendre-submit')).toBeDisabled();
  });

  it('soumet et déclenche toast succès + onExtended', async () => {
    setPermissions(['REFERENTIEL.GERER']);
    mockEtendre.mockResolvedValue({
      nbJoursAjoutes: 731,
      message: '731 jours ajoutés au calendrier',
    });
    const onExtended = vi.fn();
    render(
      <EtendreCalendrierDialog
        open
        onClose={vi.fn()}
        onExtended={onExtended}
        defaultAnneeDebut={2031}
      />,
    );

    fireEvent.change(screen.getByTestId('etendre-annee-fin'), {
      target: { value: '2032' },
    });
    fireEvent.click(screen.getByTestId('etendre-submit'));

    await waitFor(() =>
      expect(mockEtendre).toHaveBeenCalledWith({
        anneeDebut: 2031,
        anneeFin: 2032,
      }),
    );
    await waitFor(() => expect(onExtended).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalledWith('731 jours ajoutés au calendrier');
  });
});
