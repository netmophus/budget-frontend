/**
 * Tests Vitest UserAutocomplete (Lot Administration ADMIN.C).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/users', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/users')>('@/lib/api/users');
  return {
    ...actual,
    rechercherUsers: vi.fn(),
  };
});

import { rechercherUsers } from '@/lib/api/users';
import { UserAutocomplete } from './UserAutocomplete';

const mockRecherche = rechercherUsers as unknown as ReturnType<typeof vi.fn>;

function makeUser(id: string, email: string, prenom = 'Pre', nom = 'Nom') {
  return {
    id,
    email,
    prenom,
    nom,
    estActif: true,
    dateDerniereConnexion: null,
    dateCreation: '2026-01-01',
  };
}

describe('UserAutocomplete', () => {
  beforeEach(() => {
    mockRecherche.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche l\'input vide initialement (rien sélectionné)', () => {
    render(<UserAutocomplete value={null} onChange={() => {}} />);
    expect(screen.getByTestId('user-autocomplete-input')).toBeInTheDocument();
  });

  it("appelle rechercherUsers après debounce 300ms (pas à chaque keystroke)", async () => {
    render(<UserAutocomplete value={null} onChange={() => {}} />);
    const input = screen.getByTestId('user-autocomplete-input');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ai' } });
    fireEvent.change(input, { target: { value: 'aic' } });
    // Pas d'appel immédiat
    expect(mockRecherche).not.toHaveBeenCalled();
    // Après debounce
    await waitFor(
      () => expect(mockRecherche).toHaveBeenCalled(),
      { timeout: 800 },
    );
    // Un seul appel, avec la dernière valeur (debounce)
    const lastCall = mockRecherche.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('aic');
  });

  it('affiche les résultats dans le dropdown et permet la sélection', async () => {
    mockRecherche.mockResolvedValue([
      makeUser('5', 'aicha@m.io', 'Aïcha', 'Diallo'),
    ]);
    const onChange = vi.fn();
    render(<UserAutocomplete value={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('user-autocomplete-input'), {
      target: { value: 'aic' },
    });
    await waitFor(
      () => expect(screen.getByTestId('user-autocomplete-option-5')).toBeInTheDocument(),
      { timeout: 800 },
    );
    fireEvent.click(screen.getByTestId('user-autocomplete-option-5'));
    expect(onChange).toHaveBeenCalledWith(
      '5',
      expect.objectContaining({ email: 'aicha@m.io' }),
    );
    expect(screen.getByTestId('user-autocomplete-selected')).toHaveTextContent(
      'Aïcha Diallo',
    );
  });

  it('excludeUserIds filtre les résultats (cas: ne pas se proposer soi-même)', async () => {
    mockRecherche.mockResolvedValue([
      makeUser('1', 'me@m.io'),
      makeUser('2', 'autre@m.io'),
    ]);
    render(
      <UserAutocomplete
        value={null}
        onChange={() => {}}
        excludeUserIds={['1']}
      />,
    );
    fireEvent.change(screen.getByTestId('user-autocomplete-input'), {
      target: { value: 'm' },
    });
    await waitFor(
      () => expect(screen.getByTestId('user-autocomplete-option-2')).toBeInTheDocument(),
      { timeout: 800 },
    );
    expect(screen.queryByTestId('user-autocomplete-option-1')).not.toBeInTheDocument();
  });
});
