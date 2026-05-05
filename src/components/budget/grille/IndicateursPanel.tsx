/**
 * IndicateursPanel (refondu Lot 3.6) — modal slide-over élargi
 * englobant le tableau de bord indicateurs (`IndicateursContent`),
 * accessible depuis la grille de saisie.
 *
 * La logique de calcul est désormais 100 % backend (vue matérialisée
 * `mv_indicateurs_budget`) ; la limitation « vue partielle classe
 * affichée » du Lot 3.4 a disparu.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IndicateursContent } from '@/components/budget/indicateurs/IndicateursContent';

export interface IndicateursPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Triplet de contexte fourni par la grille de saisie courante. */
  versionId: string | null;
  scenarioId: string | null;
  exerciceFiscal: number | null;
}

export function IndicateursPanel({
  isOpen,
  onClose,
  versionId,
  scenarioId,
  exerciceFiscal,
}: IndicateursPanelProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Indicateurs avancés (consolidés)</DialogTitle>
          <DialogDescription>
            Calcul backend depuis la vue matérialisée
            <code className="mx-1">mv_indicateurs_budget</code>. Filtré
            sur votre périmètre RBAC.
          </DialogDescription>
        </DialogHeader>
        {versionId && scenarioId && exerciceFiscal !== null ? (
          <IndicateursContent
            versionId={versionId}
            scenarioId={scenarioId}
            exerciceFiscal={exerciceFiscal}
          />
        ) : (
          <div
            className="rounded-md border border-dashed border-(--border) p-6 text-center text-sm text-(--muted-foreground)"
            data-testid="indicateurs-pas-de-contexte"
          >
            Sélectionnez une version, un scénario et chargez la grille
            avant d'afficher les indicateurs.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
