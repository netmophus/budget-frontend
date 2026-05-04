/**
 * GrilleSaisie (Lot 3.4) — composant principal de la grille de
 * saisie budgétaire.
 *
 * Custom HTML pure (pas de TanStack Table, pas d'AG Grid). Sticky
 * thead/tfoot et 2 premières colonnes (compte, mode) pour scroll
 * horizontal/vertical. Totaux mensuels et total CR en pied de tableau.
 */
import {
  type GrilleCellule,
  type GrilleSaisie as GrilleSaisieData,
  type ModeSaisie,
} from '@/lib/api/budget-grille';
import { GrilleLigneRow } from './GrilleLigneRow';

const FORMATTER_FR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function moisCourtFr(iso: string): string {
  // 'YYYY-MM-01' → 'janv. 2027'
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  const noms = [
    'Janv.',
    'Févr.',
    'Mars',
    'Avr.',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ];
  const idx = Number.parseInt(m, 10) - 1;
  return idx >= 0 && idx < 12 ? `${noms[idx]} ${y}` : iso;
}

export interface GrilleSaisieProps {
  grille: GrilleSaisieData;
  modeParLigne: Map<string, ModeSaisie>;
  modifications: Map<string, GrilleCellule>;
  readOnly: boolean;
  getCelluleEffective: (
    compteId: string,
    ligneMetierId: string,
    mois: string,
  ) => GrilleCellule | null;
  getTotalAnnuelLigne: (compteId: string, ligneMetierId: string) => number;
  getTotalMensuel: (mois: string) => number;
  getTotalAnneeCr: () => number;
  onModifierCellule: (
    compteId: string,
    ligneMetierId: string,
    mois: string,
    update: Partial<GrilleCellule>,
  ) => void;
  onChangerMode: (
    compteId: string,
    ligneMetierId: string,
    nouveauMode: ModeSaisie,
  ) => void;
}

export function GrilleSaisie({
  grille,
  modeParLigne,
  modifications,
  readOnly,
  getCelluleEffective,
  getTotalAnnuelLigne,
  getTotalMensuel,
  getTotalAnneeCr,
  onModifierCellule,
  onChangerMode,
}: GrilleSaisieProps) {
  if (grille.lignes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
        <p className="font-medium mb-2">Aucune ligne saisie pour ce CR.</p>
        <p>
          Utilisez la route <code className="font-mono">POST /faits/budget</code>{' '}
          (ou un script d'import) pour créer la première combinaison
          (compte × ligne_métier) — la grille permettra ensuite de
          modifier les cellules sur les 12 mois.
        </p>
        <p className="mt-3 text-xs">
          Le support de la création directe depuis la grille viendra au
          Lot 3.4-bis.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-(--border) rounded-md overflow-auto max-h-[calc(100vh-360px)]">
      <table className="grille-table w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-(--muted)/80 backdrop-blur z-20">
          <tr>
            <th className="sticky left-0 bg-(--muted)/80 backdrop-blur px-2 py-2 border-r border-(--border) text-left z-30 min-w-[200px]">
              Compte / Ligne métier
            </th>
            <th className="sticky left-[200px] bg-(--muted)/80 backdrop-blur px-2 py-2 border-r border-(--border) text-left z-30 min-w-[80px]">
              Mode
            </th>
            {grille.totauxMensuels.map((m) => (
              <th
                key={m.mois}
                className="px-2 py-2 text-right font-medium min-w-[110px]"
              >
                {moisCourtFr(m.mois)}
              </th>
            ))}
            <th className="sticky right-0 bg-(--muted)/80 backdrop-blur px-2 py-2 border-l border-(--border) text-right z-30 min-w-[120px]">
              Total annuel
            </th>
          </tr>
        </thead>
        <tbody>
          {grille.lignes.map((ligne) => {
            const lk = `${ligne.compte.id}|${ligne.ligneMetier.id}`;
            const modeLigne: ModeSaisie =
              modeParLigne.get(lk) ?? 'MONTANT';
            const isCelluleModified = (mois: string) =>
              modifications.has(`${lk}|${mois}`);
            const totalAnnuel = getTotalAnnuelLigne(
              ligne.compte.id,
              ligne.ligneMetier.id,
            );
            return (
              <GrilleLigneRow
                key={lk}
                ligne={ligne}
                modeLigne={modeLigne}
                getCelluleEffective={(mois) =>
                  getCelluleEffective(
                    ligne.compte.id,
                    ligne.ligneMetier.id,
                    mois,
                  )
                }
                isCelluleModified={isCelluleModified}
                totalAnnuel={totalAnnuel}
                readOnly={readOnly}
                onModifierCellule={(mois, update) =>
                  onModifierCellule(
                    ligne.compte.id,
                    ligne.ligneMetier.id,
                    mois,
                    update,
                  )
                }
                onChangerMode={(nm) =>
                  onChangerMode(ligne.compte.id, ligne.ligneMetier.id, nm)
                }
              />
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 bg-(--muted)/80 backdrop-blur z-20 font-bold">
          <tr>
            <td
              colSpan={2}
              className="sticky left-0 bg-(--muted)/80 backdrop-blur px-2 py-2 border-r border-t border-(--border) z-30"
            >
              Total mois
            </td>
            {grille.totauxMensuels.map((m) => {
              const total = getTotalMensuel(m.mois);
              return (
                <td
                  key={m.mois}
                  className="px-2 py-2 text-right font-mono border-t border-(--border)"
                >
                  {total === 0 ? (
                    <span className="text-(--muted-foreground)">—</span>
                  ) : (
                    FORMATTER_FR.format(total)
                  )}
                </td>
              );
            })}
            <td className="sticky right-0 bg-(--muted)/80 backdrop-blur px-2 py-2 border-l border-t border-(--border) text-right font-mono z-30">
              {FORMATTER_FR.format(getTotalAnneeCr())}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
