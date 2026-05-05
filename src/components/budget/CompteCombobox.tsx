/**
 * CompteCombobox (UX A.1+A.2) — sélecteur de compte budgétaire avec
 * filtrage et recherche.
 *
 * Charge UNIQUEMENT les comptes saisissables budget :
 *   - classe ∈ {6, 7}  (charges + produits)
 *   - estCompteCollectif=false (feuilles uniquement)
 *   - estActif=true, versionCourante=true (filtres serveur par défaut)
 *
 * UX :
 *   - Input avec placeholder
 *   - Recherche live par code ou libellé (insensible à la casse)
 *   - Liste déroulante avec format "611100 — Salaires bruts"
 *   - Tri par code numérique ASC
 *   - Sélection au clic ou avec Enter sur le 1ʳᵉ résultat
 *
 * Aucune dépendance externe : implémentation custom légère.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { listComptes, type Compte } from '@/lib/api/referentiels';

const CLASSES_SAISISSABLES = ['6', '7'];

export interface CompteCombobxProps {
  id?: string;
  /** `codeCompte` actuellement sélectionné (ex. '611100'). */
  value: string;
  onChange: (codeCompte: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CompteCombobox({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Tapez un code (ex. 611) ou un libellé…',
}: CompteCombobxProps): JSX.Element {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chargement des comptes saisissables (classes 6,7 + feuilles).
  useEffect(() => {
    setLoading(true);
    setErreur(null);
    listComptes({
      classes: CLASSES_SAISISSABLES,
      estCompteCollectif: false,
      versionCouranteUniquement: true,
      limit: 200,
    })
      .then((res) => {
        // Tri code numérique ASC (le tri serveur est lexicographique
        // donc '60' < '6' — on retrie côté client par sécurité).
        const tries = [...res.items].sort((a, b) =>
          a.codeCompte.localeCompare(b.codeCompte, undefined, { numeric: true }),
        );
        setComptes(tries);
      })
      .catch((err) => {
        setErreur(err instanceof Error ? err.message : 'Erreur réseau');
      })
      .finally(() => setLoading(false));
  }, []);

  // Compte actuellement affiché en valeur "résolue" (pour l'input).
  const compteSelectionne = useMemo(
    () => comptes.find((c) => c.codeCompte === value) ?? null,
    [comptes, value],
  );

  // Filtre par code OU libellé — insensible casse, sans accents.
  const optionsFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (q === '') return comptes;
    return comptes.filter(
      (c) =>
        c.codeCompte.toLowerCase().includes(q) ||
        c.libelle.toLowerCase().includes(q),
    );
  }, [comptes, recherche]);

  // Fermer la liste quand on clique en dehors.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleFocus(): void {
    if (!disabled) setOpen(true);
  }

  function handleSelect(code: string): void {
    onChange(code);
    setRecherche('');
    setOpen(false);
  }

  // Affichage de l'input : la recherche en cours OU le compte sélectionné.
  const inputValue =
    open || recherche
      ? recherche
      : compteSelectionne
        ? `${compteSelectionne.codeCompte} — ${compteSelectionne.libelle}`
        : '';

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setRecherche(e.target.value);
          setOpen(true);
        }}
        onFocus={handleFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && optionsFiltrees.length > 0) {
            e.preventDefault();
            handleSelect(optionsFiltrees[0]!.codeCompte);
          } else if (e.key === 'Escape') {
            setOpen(false);
            setRecherche('');
          }
        }}
        placeholder={loading ? 'Chargement…' : placeholder}
        disabled={disabled || loading}
        autoComplete="off"
        data-testid="compte-combobox-input"
      />
      {erreur && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          ⚠ Comptes non chargés : {erreur}
        </p>
      )}
      {open && !loading && !erreur && (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-(--border) bg-(--popover) shadow-md"
          role="listbox"
          data-testid="compte-combobox-list"
        >
          {optionsFiltrees.length === 0 && (
            <li
              className="px-3 py-2 text-sm text-(--muted-foreground)"
              data-testid="compte-combobox-empty"
            >
              Aucun compte ne correspond à « {recherche} ».
            </li>
          )}
          {optionsFiltrees.map((c) => {
            const selected = c.codeCompte === value;
            return (
              <li
                key={c.codeCompte}
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(c.codeCompte)}
                className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-(--accent) ${
                  selected ? 'bg-(--accent)/50 font-semibold' : ''
                }`}
                data-testid={`compte-option-${c.codeCompte}`}
              >
                <span className="font-mono">{c.codeCompte}</span>
                <span className="mx-2 text-(--muted-foreground)">—</span>
                <span>{c.libelle}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
