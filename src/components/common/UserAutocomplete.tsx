/**
 * UserAutocomplete (Lot Administration ADMIN.C) — composant
 * réutilisable pour sélectionner un user par recherche serveur,
 * avec debounce et exclusion d'ids.
 *
 * Remplace les listes paginées fixes (CreerDelegationDialog, etc.)
 * qui ne scalent pas au-delà de 100 users.
 */
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { rechercherUsers } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

interface UserAutocompleteProps {
  value: string | null; // user id sélectionné
  onChange: (userId: string | null, user: UserResponse | null) => void;
  placeholder?: string;
  excludeUserIds?: string[];
  disabled?: boolean;
  /** Nom HTML pour les tests / form serialization. */
  testId?: string;
}

const DEBOUNCE_MS = 300;

export function UserAutocomplete({
  value,
  onChange,
  placeholder = 'Rechercher un utilisateur…',
  excludeUserIds = [],
  disabled = false,
  testId = 'user-autocomplete',
}: UserAutocompleteProps): JSX.Element {
  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState<UserResponse[]>([]);
  const [selected, setSelected] = useState<UserResponse | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fingerprint stable de la liste d'exclusion : évite la boucle
  // useEffect causée par une nouvelle ref tableau à chaque render
  // côté parent.
  const exclusionsKey = excludeUserIds.slice().sort().join(',');

  // Debounce sur la recherche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (terme.trim().length === 0) {
      setResultats([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      rechercherUsers(terme, 10)
        .then((users) => {
          const exclusions = exclusionsKey ? exclusionsKey.split(',') : [];
          const filtres = users.filter((u) => !exclusions.includes(u.id));
          setResultats(filtres);
        })
        .catch(() => setResultats([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [terme, exclusionsKey]);

  // Si une valeur externe est fournie sans user (init), on garde le placeholder.
  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  function handleSelect(u: UserResponse): void {
    setSelected(u);
    setTerme('');
    setResultats([]);
    setOuvert(false);
    onChange(u.id, u);
  }

  function handleClear(): void {
    setSelected(null);
    setTerme('');
    setResultats([]);
    onChange(null, null);
  }

  return (
    <div className="relative" data-testid={testId}>
      {selected ? (
        <div
          className="flex items-center justify-between rounded-md border border-(--border) bg-(--accent)/30 px-3 py-2 text-sm"
          data-testid={`${testId}-selected`}
        >
          <div>
            <div className="font-medium">
              {selected.prenom} {selected.nom}
            </div>
            <div className="text-xs text-(--muted-foreground)">
              {selected.email}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              className="text-(--muted-foreground) hover:text-(--foreground) text-xs"
              onClick={handleClear}
              data-testid={`${testId}-clear`}
              aria-label="Désélectionner"
            >
              Changer
            </button>
          )}
        </div>
      ) : (
        <>
          <Input
            value={terme}
            onChange={(e) => {
              setTerme(e.target.value);
              setOuvert(true);
            }}
            placeholder={placeholder}
            disabled={disabled}
            data-testid={`${testId}-input`}
            onFocus={() => setOuvert(true)}
          />
          {ouvert && terme.length > 0 && (
            <div
              className="absolute z-50 mt-1 w-full rounded-md border border-(--border) bg-(--background) shadow-lg max-h-60 overflow-y-auto"
              data-testid={`${testId}-dropdown`}
            >
              {loading && (
                <div className="px-3 py-2 text-xs text-(--muted-foreground)">
                  Recherche…
                </div>
              )}
              {!loading && resultats.length === 0 && (
                <div className="px-3 py-2 text-xs text-(--muted-foreground)">
                  Aucun résultat
                </div>
              )}
              {resultats.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-(--accent)/50"
                  data-testid={`${testId}-option-${u.id}`}
                >
                  <div className="font-medium">
                    {u.prenom} {u.nom}
                  </div>
                  <div className="text-xs text-(--muted-foreground)">
                    {u.email}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
