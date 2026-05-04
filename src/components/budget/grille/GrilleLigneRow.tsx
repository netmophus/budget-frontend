/**
 * GrilleLigneRow (Lot 3.4) — render d'une ligne de la grille
 * (1 compte feuille × 1 ligne_metier × 12 mois).
 *
 * Convention métier (cf. mandat 3.4 B.2) : le **mode est porté par
 * la ligne entière** (pas par cellule), pour éviter une grille
 * incohérente avec PNB calculé sur des modes différents au sein
 * d'un même couple compte/axe.
 *
 * Bascule de mode : ConfirmDialog si destructif (cellules non vides).
 */
import { memo, useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import type {
  GrilleCellule,
  GrilleLigne,
  ModeSaisie,
} from '@/lib/api/budget-grille';
import { GrilleCelluleEditor } from './GrilleCelluleEditor';

const FORMATTER_FR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export interface GrilleLigneRowProps {
  ligne: GrilleLigne;
  modeLigne: ModeSaisie;
  /** Map cellule effective (modif locale ou origine). */
  getCelluleEffective: (mois: string) => GrilleCellule | null;
  /** Indique si la cellule est dans la Map des modifications. */
  isCelluleModified: (mois: string) => boolean;
  totalAnnuel: number;
  readOnly: boolean;
  onModifierCellule: (
    mois: string,
    update: Partial<GrilleCellule>,
  ) => void;
  onChangerMode: (nouveauMode: ModeSaisie) => void;
}

function GrilleLigneRowImpl({
  ligne,
  modeLigne,
  getCelluleEffective,
  isCelluleModified,
  totalAnnuel,
  readOnly,
  onModifierCellule,
  onChangerMode,
}: GrilleLigneRowProps) {
  const [confirmBascule, setConfirmBascule] = useState<ModeSaisie | null>(
    null,
  );

  function handleToggleMode(nouveauMode: ModeSaisie) {
    if (nouveauMode === modeLigne) return;
    // Bascule destructive si cellules ont des valeurs
    const aDesValeurs = ligne.cellules.some((c) => {
      const eff = getCelluleEffective(c.mois);
      return (
        (eff?.montant ?? 0) !== 0 ||
        (eff?.encoursMoyen ?? null) !== null ||
        (eff?.tie ?? null) !== null
      );
    });
    if (aDesValeurs) {
      setConfirmBascule(nouveauMode);
    } else {
      onChangerMode(nouveauMode);
    }
  }

  function confirmerBascule() {
    if (confirmBascule) onChangerMode(confirmBascule);
    setConfirmBascule(null);
  }

  return (
    <>
      <tr className="hover:bg-(--accent)/20">
        <td className="cell-compte sticky left-0 bg-(--background) px-2 py-1 border-r border-(--border) min-w-[200px]">
          <div className="flex items-start gap-2">
            <div>
              <div className="font-mono font-bold text-sm">
                {ligne.compte.codeCompte}
              </div>
              <div className="text-xs text-(--muted-foreground) line-clamp-1">
                {ligne.compte.libelle}
              </div>
              <div className="text-[10px] text-(--muted-foreground)">
                {ligne.ligneMetier.codeLigneMetier}
              </div>
            </div>
            {ligne.compte.estPorteurInterets && (
              <Badge
                variant="secondary"
                className="text-[10px] py-0 px-1 shrink-0"
                title="Compte porteur d'intérêts (PNB)"
              >
                💰
              </Badge>
            )}
          </div>
        </td>

        <td className="cell-mode sticky left-[200px] bg-(--background) px-2 py-1 border-r border-(--border) min-w-[80px]">
          {ligne.compte.estPorteurInterets ? (
            <ToggleMode
              value={modeLigne}
              onChange={handleToggleMode}
              disabled={readOnly}
            />
          ) : (
            <span className="text-xs text-(--muted-foreground)">MNT</span>
          )}
        </td>

        {ligne.cellules.map((cellOrigine) => {
          const eff = getCelluleEffective(cellOrigine.mois) ?? cellOrigine;
          return (
            <td key={cellOrigine.mois} className="px-1 py-1 min-w-[110px]">
              <GrilleCelluleEditor
                cellule={eff}
                modeLigne={modeLigne}
                estPorteurInterets={ligne.compte.estPorteurInterets}
                isModified={isCelluleModified(cellOrigine.mois)}
                readOnly={readOnly}
                onChange={(update) =>
                  onModifierCellule(cellOrigine.mois, update)
                }
              />
            </td>
          );
        })}

        <td className="cell-total sticky right-0 bg-(--background) px-2 py-1 border-l border-(--border) min-w-[120px] text-right font-mono font-bold">
          {totalAnnuel === 0 ? (
            <span className="text-(--muted-foreground)">—</span>
          ) : (
            FORMATTER_FR.format(totalAnnuel)
          )}
        </td>
      </tr>

      {confirmBascule && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmBascule(null)}
          onConfirm={confirmerBascule}
          title={`Basculer en mode « ${confirmBascule === 'ENCOURS_TIE' ? 'Encours × TIE' : 'Montant'} » ?`}
          description={
            confirmBascule === 'ENCOURS_TIE' ? (
              <p>
                Le passage en mode <strong>Encours × TIE</strong> va
                effacer les montants saisis sur les 12 mois. Vous
                devrez ressaisir l'encours et le TIE pour chaque mois.
              </p>
            ) : (
              <p>
                Le passage en mode <strong>Montant</strong> va effacer
                les valeurs encours et TIE sur les 12 mois. Les
                montants calculés seront conservés tels quels.
              </p>
            )
          }
          confirmText="Confirmer"
          cancelText="Annuler"
          destructive
        />
      )}
    </>
  );
}

export const GrilleLigneRow = memo(GrilleLigneRowImpl);

// ─── Toggle MNT / E×T ────────────────────────────────────────────

interface ToggleModeProps {
  value: ModeSaisie;
  onChange: (v: ModeSaisie) => void;
  disabled: boolean;
}

function ToggleMode({ value, onChange, disabled }: ToggleModeProps) {
  return (
    <div className="inline-flex rounded-md border border-(--border) overflow-hidden text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('MONTANT')}
        className={
          'px-2 py-1 ' +
          (value === 'MONTANT'
            ? 'bg-(--primary) text-(--primary-foreground)'
            : 'bg-transparent hover:bg-(--accent)/30 disabled:opacity-50')
        }
        title="Mode Montant"
      >
        MNT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('ENCOURS_TIE')}
        className={
          'px-2 py-1 ' +
          (value === 'ENCOURS_TIE'
            ? 'bg-(--primary) text-(--primary-foreground)'
            : 'bg-transparent hover:bg-(--accent)/30 disabled:opacity-50')
        }
        title="Mode Encours × TIE"
      >
        E×T
      </button>
    </div>
  );
}
