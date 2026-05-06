/**
 * Tests Vitest BadgePerimetresHeader + ModalMesPerimetres (Lot 4.1.C).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/perimetres', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/perimetres')
  >('@/lib/api/perimetres');
  return {
    ...actual,
    listerMesPerimetres: vi.fn(),
  };
});

import {
  type AffectationPerimetre,
  listerMesPerimetres,
} from '@/lib/api/perimetres';
import { BadgePerimetresHeader } from './BadgePerimetresHeader';

const mockLister = listerMesPerimetres as unknown as ReturnType<typeof vi.fn>;

function makePerimetre(
  over: Partial<AffectationPerimetre> = {},
): AffectationPerimetre {
  return {
    id: '1',
    cibleType: 'CR',
    cibleId: '100',
    cibleCrIds: null,
    origine: 'PRINCIPAL',
    delegationId: null,
    dateDebut: '2027-01-01',
    dateFin: null,
    actif: true,
    motif: null,
    ...over,
  };
}

describe('BadgePerimetresHeader', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("rien affiché si l'utilisateur n'a aucune affectation", async () => {
    mockLister.mockResolvedValue([]);
    const { container } = render(<BadgePerimetresHeader />);
    await waitFor(() => expect(mockLister).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("affiche '2 périmètres' si l'utilisateur en a 2", async () => {
    mockLister.mockResolvedValue([
      makePerimetre({ id: '1' }),
      makePerimetre({ id: '2', cibleType: 'STRUCTURE', cibleId: '5' }),
    ]);
    render(<BadgePerimetresHeader />);
    await waitFor(() =>
      expect(screen.getByTestId('badge-perimetres-header')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('badge-perimetres-header').textContent).toMatch(
      /2 périmètres/,
    );
  });

  it("clic sur le badge ouvre la modal lecture seule", async () => {
    mockLister.mockResolvedValue([makePerimetre({ id: '7' })]);
    render(<BadgePerimetresHeader />);
    await waitFor(() =>
      expect(screen.getByTestId('badge-perimetres-header')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('badge-perimetres-header'));
    await waitFor(() =>
      expect(screen.getByTestId('modal-mes-perimetres-liste')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mes-perimetre-7')).toBeInTheDocument();
  });

  it("erreur réseau → silencieux (rien affiché, pas de toast)", async () => {
    mockLister.mockRejectedValue(new Error('Network'));
    const { container } = render(<BadgePerimetresHeader />);
    await waitFor(() => expect(mockLister).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
