import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/configurationBanque', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/api/configurationBanque')>();
  return {
    ...actual,
    createMembreComite: vi.fn(),
    updateMembreComite: vi.fn(),
    deleteMembreComite: vi.fn(),
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  createMembreComite,
  deleteMembreComite,
  updateMembreComite,
  type MembreComite,
} from '@/lib/api/configurationBanque';
import { MembresComiteEditor } from './MembresComiteEditor';

const mockCreate = createMembreComite as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateMembreComite as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteMembreComite as unknown as ReturnType<typeof vi.fn>;

const MEMBRES: MembreComite[] = [
  {
    id: '1',
    nomPrenom: 'Souleymane DIORI',
    titre: 'M.',
    fonction: 'PRESIDENT',
    ordreAffichage: 1,
    estActif: true,
  },
  {
    id: '2',
    nomPrenom: 'Halima OUSMANE',
    titre: 'Mme',
    fonction: 'MEMBRE',
    ordreAffichage: 2,
    estActif: true,
  },
];

describe('MembresComiteEditor (Lot B4)', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue(MEMBRES[0]);
    mockUpdate.mockResolvedValue(MEMBRES[0]);
    mockDelete.mockResolvedValue({ ...MEMBRES[0], estActif: false });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('liste les membres existants', () => {
    render(<MembresComiteEditor membres={MEMBRES} onChanged={vi.fn()} />);
    expect(screen.getByText('M. Souleymane DIORI')).toBeInTheDocument();
    expect(screen.getByText('Mme Halima OUSMANE')).toBeInTheDocument();
  });

  it('ajoute un membre → createMembreComite + onChanged', async () => {
    const onChanged = vi.fn();
    render(<MembresComiteEditor membres={MEMBRES} onChanged={onChanged} />);
    fireEvent.click(screen.getByTestId('btn-ajouter-membre'));
    fireEvent.change(screen.getByTestId('m-nom'), {
      target: { value: 'Nouveau MEMBRE' },
    });
    fireEvent.click(screen.getByTestId('m-submit'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ nomPrenom: 'Nouveau MEMBRE' }),
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('modifie un membre → updateMembreComite', async () => {
    render(<MembresComiteEditor membres={MEMBRES} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByTestId('membre-edit-1'));
    fireEvent.change(screen.getByTestId('m-nom'), {
      target: { value: 'Souleymane DIORI II' },
    });
    fireEvent.click(screen.getByTestId('m-submit'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ nomPrenom: 'Souleymane DIORI II' }),
    );
  });

  it('supprime un membre après confirmation → deleteMembreComite', async () => {
    render(<MembresComiteEditor membres={MEMBRES} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByTestId('membre-delete-2'));
    const retirer = await screen.findByRole('button', { name: 'Retirer' });
    fireEvent.click(retirer);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('2'));
  });
});
