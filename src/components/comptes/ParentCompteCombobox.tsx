/**
 * ParentCompteCombobox — sélecteur « Compte parent » avec recherche
 * intégrée (par code OU libellé). Reçoit la liste des parents éligibles
 * déjà filtrée par le serveur (GET /referentiels/comptes/parents-eligibles).
 *
 * Valeur = `id` du compte parent (ou '' pour « Aucun (racine) »).
 * Implémentation custom légère (même pattern que CompteCombobox), sans
 * dépendance externe — Radix Select ne supporte pas un champ de recherche.
 */
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import type { Compte } from '@/lib/api/referentiels';

const RACINE = '';

interface ParentCompteComboboxProps {
  id?: string;
  /** id du compte parent sélectionné ('' = racine). */
  value: string;
  onChange: (id: string) => void;
  options: Compte[];
  disabled?: boolean;
  loading?: boolean;
  /** Autorise l'option « Aucun (racine) » (niveau 1). */
  autoriserRacine?: boolean;
}

export function ParentCompteCombobox({
  id,
  value,
  onChange,
  options,
  disabled = false,
  loading = false,
  autoriserRacine = true,
}: ParentCompteComboboxProps): JSX.Element {
  const [recherche, setRecherche] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectionne = useMemo(
    () => options.find((c) => c.id === value) ?? null,
    [options, value],
  );

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (q === '') return options;
    return options.filter(
      (c) =>
        c.codeCompte.toLowerCase().includes(q) ||
        c.libelle.toLowerCase().includes(q),
    );
  }, [options, recherche]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setRecherche('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(idCompte: string): void {
    onChange(idCompte);
    setRecherche('');
    setOpen(false);
  }

  const libelleSelection = selectionne
    ? `${selectionne.codeCompte} — ${selectionne.libelle}`
    : autoriserRacine
      ? 'Aucun (racine)'
      : '';

  const inputValue = open ? recherche : libelleSelection;

  const vide = !loading && options.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setRecherche(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && !vide && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtrees.length > 0) {
              e.preventDefault();
              handleSelect(filtrees[0]!.id);
            } else if (e.key === 'Escape') {
              setOpen(false);
              setRecherche('');
            }
          }}
          placeholder={
            loading
              ? 'Chargement…'
              : vide
                ? 'Aucun compte parent éligible'
                : 'Tapez un code (ex. 6311) ou un libellé…'
          }
          disabled={disabled || loading || vide}
          autoComplete="off"
          className="h-9 mt-1.5 pr-9"
          data-testid="parent-combobox-input"
        />
        <ChevronsUpDown
          className="absolute right-3 top-1/2 -translate-y-1/2 mt-[3px] w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {vide && (
        <p
          className="mt-1.5 text-xs text-(--miznas-ambre)"
          data-testid="parent-combobox-vide"
        >
          Aucun compte parent éligible — créez d’abord un compte de niveau
          inférieur dans cette classe.
        </p>
      )}

      {open && !loading && !vide && (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-(--border) bg-(--popover) shadow-md"
          role="listbox"
          data-testid="parent-combobox-list"
        >
          {autoriserRacine && recherche.trim() === '' && (
            <li
              role="option"
              aria-selected={value === RACINE}
              onClick={() => handleSelect(RACINE)}
              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-(--accent) ${
                value === RACINE ? 'bg-(--accent)/50 font-semibold' : ''
              }`}
              data-testid="parent-option-racine"
            >
              Aucun (racine)
            </li>
          )}
          {filtrees.length === 0 && (
            <li
              className="px-3 py-2 text-sm text-(--muted-foreground)"
              data-testid="parent-combobox-empty"
            >
              Aucun compte ne correspond à « {recherche} ».
            </li>
          )}
          {filtrees.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={c.id === value}
              onClick={() => handleSelect(c.id)}
              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-(--accent) ${
                c.id === value ? 'bg-(--accent)/50 font-semibold' : ''
              }`}
              data-testid={`parent-option-${c.codeCompte}`}
            >
              <span className="font-mono">{c.codeCompte}</span>
              <span className="mx-2 text-(--muted-foreground)">—</span>
              <span>{c.libelle}</span>
              <span className="ml-1 text-(--muted-foreground)">
                (niveau {c.niveau})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
