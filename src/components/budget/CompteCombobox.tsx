/**
 * CompteCombobox (UX A.1+A.2) — sélecteur de compte budgétaire avec
 * recherche CÔTÉ SERVEUR.
 *
 * La recherche est déléguée au backend (param `search` de
 * `/referentiels/comptes`, ILIKE %terme% sur code OU libellé) avec un
 * debounce de 300 ms, au lieu de l'ancien préchargement `limit=200`
 * filtré en mémoire. Corrige le bug où tout compte au-delà du 200ᵉ code
 * (ex. « 66 », rang 216 en classe 6 — 260 comptes) restait introuvable.
 *
 * Comptes proposés :
 *   - classe ∈ `classes` (défaut {6, 7} — charges + produits)
 *   - parents + feuilles si `inclureCollectifs`, sinon feuilles seules
 *     (estCompteCollectif=false — comportement historique)
 *   - versionCourante=true (filtre serveur par défaut)
 *
 * UX :
 *   - Input avec placeholder
 *   - Recherche live (debounce 300 ms) par code OU libellé, serveur
 *   - Liste déroulante format "611100 — Salaires bruts", triée code ASC
 *   - Saisie directe au clavier : Enter OU Tab committe le « meilleur
 *     match » (code exact > liste fraîche → 1ᵉʳ résultat) puis, via la
 *     prop `onCommit`, avance le focus au champ suivant. Le clic reste
 *     disponible (UX hybride). Champ vide / aucun résultat → pas de
 *     commit (navigation clavier normale).
 *
 * Aucune dépendance externe : implémentation custom légère.
 */
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { listComptes, type Compte } from '@/lib/api/referentiels';

const CLASSES_SAISISSABLES_DEFAULT = ['6', '7'];
const SEARCH_DEBOUNCE_MS = 300;
/** Nb max de résultats ramenés par requête (la recherche serveur cible). */
const RESULTS_LIMIT = 50;

export interface CompteCombobxProps {
  id?: string;
  /** `codeCompte` actuellement sélectionné (ex. '611100'). */
  value: string;
  onChange: (codeCompte: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Classes PCB à charger (defaut `['6', '7']` — charges + produits
   * saisissables). Quand cette prop change, la liste est re-fetchée
   * et la sélection courante est réinitialisée si elle n'appartient
   * plus à la nouvelle classe.
   */
  classes?: string[];
  /**
   * Si `true`, n'applique PAS le filtre `estCompteCollectif=false` :
   * tous les comptes (parents + feuilles) sont proposés. Défaut
   * `false` (feuilles seules — comportement historique des écrans
   * existants). Utilisé par la saisie hybride (politique BSIC :
   * pas de restriction parents/feuilles).
   */
  inclureCollectifs?: boolean;
  /** Callback optionnel recevant le compte complet sélectionné (id, etc.). */
  onSelectCompte?: (compte: Compte) => void;
  /**
   * Appelé après un commit AU CLAVIER (Enter/Tab) réussi — permet au
   * parent d'avancer le focus au champ suivant (saisie rapide). N'est
   * PAS appelé sur sélection par clic (l'utilisateur garde la main).
   */
  onCommit?: () => void;
}

export function CompteCombobox({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Tapez un code (ex. 611) ou un libellé…',
  classes = CLASSES_SAISISSABLES_DEFAULT,
  inclureCollectifs = false,
  onSelectCompte,
  onCommit,
}: CompteCombobxProps): JSX.Element {
  const [comptes, setComptes] = useState<Compte[]>([]);
  // Compte résolu correspondant à `value` (pour l'affichage de l'input).
  // Persistant entre les recherches — la liste `comptes` ne contient que
  // les résultats du terme courant, pas forcément la sélection.
  const [selectedCompte, setSelectedCompte] = useState<Compte | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [debouncedRecherche, setDebouncedRecherche] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sérialisation stable des classes pour la dépendance d'effet
  // (évite un re-fetch infini sur une nouvelle ref d'array identique).
  const classesKey = classes.slice().sort().join(',');

  // Filtre `estCompteCollectif` partagé par les deux requêtes.
  const collectifFilter = inclureCollectifs
    ? {}
    : { estCompteCollectif: false };

  // Debounce du terme saisi → un seul fetch après 300 ms d'inactivité.
  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedRecherche(recherche.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [recherche]);

  // Recherche serveur — refetch quand `classes` OU le terme débouncé
  // change. La liste est vidée le temps du fetch (état « Recherche… »)
  // pour ne jamais afficher de résultats périmés pour le terme courant.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setComptes([]);
    setErreur(null);
    listComptes({
      classes,
      ...collectifFilter,
      versionCouranteUniquement: true,
      ...(debouncedRecherche ? { search: debouncedRecherche } : {}),
      limit: RESULTS_LIMIT,
    })
      .then((res) => {
        if (!active) return;
        // Tri code numérique ASC (le tri serveur est lexicographique
        // donc '60' < '6' — on retrie côté client par sécurité).
        const tries = [...res.items].sort((a, b) =>
          a.codeCompte.localeCompare(b.codeCompte, undefined, { numeric: true }),
        );
        setComptes(tries);
      })
      .catch((err) => {
        if (!active) return;
        setErreur(err instanceof Error ? err.message : 'Erreur réseau');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // `classes`/`collectifFilter` exclus volontairement : `classesKey`
    // fournit une dépendance stable et `inclureCollectifs` ne change pas
    // au cours de la vie du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesKey, debouncedRecherche]);

  // Résolution de la sélection (affichage) + reset B.1 : lookup ciblé
  // par code exact, indépendant de la liste de recherche limitée. Si le
  // `value` courant n'existe pas (plus) dans les `classes` actives, on
  // réinitialise la sélection (ex. bascule classe 6 → 7).
  useEffect(() => {
    if (!value) {
      setSelectedCompte(null);
      return;
    }
    // Déjà résolu et cohérent avec les classes actives : rien à faire.
    if (
      selectedCompte &&
      selectedCompte.codeCompte === value &&
      classes.includes(selectedCompte.classe)
    ) {
      return;
    }
    let active = true;
    listComptes({
      classes,
      ...collectifFilter,
      versionCouranteUniquement: true,
      search: value,
      limit: 5,
    })
      .then((res) => {
        if (!active) return;
        const exact = res.items.find((c) => c.codeCompte === value) ?? null;
        if (exact) {
          setSelectedCompte(exact);
        } else {
          // `value` invalide pour ces classes → reset (mini-fix B.1).
          setSelectedCompte(null);
          onChange('');
        }
      })
      .catch(() => {
        // Tolérant : une erreur réseau ne doit pas effacer la sélection.
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesKey, value]);

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
    const compte = comptes.find((c) => c.codeCompte === code);
    if (compte) {
      setSelectedCompte(compte);
      onSelectCompte?.(compte);
    }
    setRecherche('');
    setDebouncedRecherche('');
    setOpen(false);
  }

  /**
   * Commit au clavier du « meilleur match » :
   *   1. code exact (codeCompte === saisie) — prioritaire ;
   *   2. sinon, si les résultats sont à jour (debounce appliqué) et non
   *      vides → le 1ᵉʳ résultat (liste triée code ASC).
   * Renvoie `true` si un compte a été committé. Renvoie `false` si le
   * champ est vide, si aucun résultat n'est exploitable, ou si une
   * recherche est encore en attente (évite de committer un résultat
   * périmé sur une frappe rapide).
   */
  function commitClavier(): boolean {
    const q = recherche.trim();
    if (q === '') return false;
    const exact = comptes.find((c) => c.codeCompte === q);
    const fresh = debouncedRecherche === q;
    const choix = exact ?? (fresh && comptes.length > 0 ? comptes[0]! : null);
    if (!choix) return false;
    handleSelect(choix.codeCompte);
    return true;
  }

  // Affichage de l'input : la recherche en cours OU le compte sélectionné.
  const inputValue =
    open || recherche
      ? recherche
      : selectedCompte
        ? `${selectedCompte.codeCompte} — ${selectedCompte.libelle}`
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
          if (e.key === 'Enter') {
            // Enter ne doit jamais soumettre le formulaire parent.
            e.preventDefault();
            if (commitClavier()) onCommit?.();
          } else if (e.key === 'Tab') {
            // Tab committe le meilleur match sans casser la navigation
            // clavier. Si `onCommit` est fourni, on gère le focus suivant
            // nous-mêmes (preventDefault pour éviter un double saut) ;
            // sinon on laisse le Tab natif avancer le focus.
            const committed = commitClavier();
            if (committed && onCommit) {
              e.preventDefault();
              onCommit();
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
            setRecherche('');
          }
        }}
        placeholder={loading && comptes.length === 0 ? 'Chargement…' : placeholder}
        disabled={disabled}
        autoComplete="off"
        data-testid="compte-combobox-input"
      />
      {erreur && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          ⚠ Comptes non chargés : {erreur}
        </p>
      )}
      {open && !erreur && (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-(--border) bg-(--popover) shadow-md"
          role="listbox"
          data-testid="compte-combobox-list"
        >
          {loading && comptes.length === 0 && (
            <li
              className="px-3 py-2 text-sm text-(--muted-foreground)"
              data-testid="compte-combobox-loading"
            >
              Recherche…
            </li>
          )}
          {!loading && comptes.length === 0 && (
            <li
              className="px-3 py-2 text-sm text-(--muted-foreground)"
              data-testid="compte-combobox-empty"
            >
              Aucun compte ne correspond à « {recherche} ».
            </li>
          )}
          {comptes.map((c) => {
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
