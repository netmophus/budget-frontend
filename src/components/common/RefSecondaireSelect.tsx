/**
 * <RefSecondaireSelect> — Sélect dynamique alimenté par un référentiel
 * secondaire (Lot 2.5-bis-A).
 *
 * Encapsule :
 *  - le hook `useRefSecondaireOptions(refKey)` (cache 60s, filtre
 *    est_actif=true) ;
 *  - l'état de chargement (placeholder « Chargement… ») ;
 *  - l'erreur API (message rouge inline + select disabled) ;
 *  - le cas « valeur courante désactivée dans /configuration » :
 *    la valeur est préservée dans la liste pour rester
 *    sélectionnable, et un message jaune est affiché.
 *
 * Pattern factorisé depuis StructureFormDrawer (Lot 2.5-bis-D) et
 * SegmentFormDrawer (Lot 2.5B). 3ᵉ cas concret = ProduitFormDrawer
 * (Lot 2.5C).
 */
import { useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type RefKey } from '@/lib/api/configuration';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';

interface RefSecondaireSelectProps {
  refKey: RefKey;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  /** Texte humain pour les messages d'erreur (« Impossible de charger les {labelChamp}… »). */
  labelChamp?: string;
  placeholder?: string;
  /** Affiche le warning si la valeur courante n'est pas dans les options actives. */
  showWarningIfDisabled?: boolean;
  /** id pour le label HTML associé. */
  id?: string;
}

export function RefSecondaireSelect({
  refKey,
  value,
  onValueChange,
  disabled = false,
  labelChamp = 'options',
  placeholder = '—',
  showWarningIfDisabled = true,
  id,
}: RefSecondaireSelectProps) {
  const { options, loading, error } = useRefSecondaireOptions(refKey);

  // Si la valeur courante n'est pas dans les options actives, on la
  // prepend pour qu'elle reste sélectionnable. Sinon le select
  // afficherait vide et l'utilisateur perdrait le contexte.
  const valueDesactivee =
    !loading &&
    value !== '' &&
    !options.some((o) => o.value === value);

  const optionsAffichees = useMemo(() => {
    if (valueDesactivee && value !== '') {
      return [
        { value, libelle: `${value} (désactivé)`, estSysteme: false },
        ...options,
      ];
    }
    return options;
  }, [options, valueDesactivee, value]);

  const erreurChargement = error !== null && options.length === 0;

  return (
    <div className="space-y-1">
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || loading || erreurChargement}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={loading ? 'Chargement…' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {optionsAffichees.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {erreurChargement && (
        <p className="text-xs text-red-600">
          ⚠ Impossible de charger {labelChamp}. Vérifiez avec
          l'administrateur que le référentiel
          <code className="font-mono mx-1">{refKey}</code>
          n'est pas vide.
        </p>
      )}
      {valueDesactivee && showWarningIfDisabled && (
        <p className="text-xs text-yellow-700">
          ⚠ La valeur '{value}' a été désactivée dans Configuration.
          Vous pouvez la conserver ou la remplacer par une valeur
          active.
        </p>
      )}
    </div>
  );
}
