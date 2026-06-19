/**
 * InitialiserSnapshotDialog — confirmation de l'initialisation du
 * snapshot des CR attendus pour une version (action Coordinateur).
 *
 * Le calcul des CR attendus est fait côté backend (périmètres des
 * SAISISSEUR actifs) ; la liste exacte n'est connue qu'après l'appel,
 * donc elle apparaît dans le tableau de progression une fois confirmé.
 */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InitialiserSnapshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelée au clic Confirmer ; throw → la modale reste ouverte. */
  onConfirm: () => void | Promise<void>;
  versionLibelle?: string | null;
  submitting: boolean;
}

export function InitialiserSnapshotDialog({
  isOpen,
  onClose,
  onConfirm,
  versionLibelle,
  submitting,
}: InitialiserSnapshotDialogProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Initialiser le snapshot des CR attendus</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              {versionLibelle ? <strong>{versionLibelle}</strong> : 'Version'}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            Cette action <strong>fige la liste des CR</strong> qui devront
            saisir pour cette version, en se basant sur les{' '}
            <strong>périmètres des SAISISSEURS actifs</strong>.
          </p>
          <div className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 px-3 py-2 text-xs">
            ⚠ Les CR ajoutés deviennent le dénominateur du compteur «&nbsp;X/Y
            validés&nbsp;» et la condition de pré-validation automatique de la
            version. L'opération est <strong>idempotente</strong> (relançable
            sans doublon).
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={submitting}
            data-testid="init-snapshot-confirmer"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
            {submitting ? 'Initialisation…' : 'Confirmer l’initialisation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
