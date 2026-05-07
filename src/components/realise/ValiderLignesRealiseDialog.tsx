/**
 * Dialogue de validation en lot (Lot 5.1.B). Présente le récap
 * des lignes sélectionnées (statut=IMPORTE) et déclenche
 * POST /realise/valider en cas de confirmation.
 */
import { AxiosError } from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type FaitRealise } from '@/lib/api/realise';
import { useRealiseStore } from '@/lib/stores/realise-store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lignesSelectionnees: FaitRealise[];
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    return Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function ValiderLignesRealiseDialog({
  isOpen,
  onClose,
  lignesSelectionnees,
}: Props): JSX.Element {
  const validerSelection = useRealiseStore((s) => s.validerSelection);
  const [submitting, setSubmitting] = useState(false);

  const importes = lignesSelectionnees.filter((l) => l.statut === 'IMPORTE');
  const dejaValides = lignesSelectionnees.length - importes.length;

  // Récap par compte (les 5 premiers groupements)
  const parCompte = new Map<string, number>();
  for (const l of importes) {
    parCompte.set(l.fkCompte, (parCompte.get(l.fkCompte) ?? 0) + 1);
  }
  const top5 = Array.from(parCompte.entries()).slice(0, 5);

  async function handleConfirmer(): Promise<void> {
    setSubmitting(true);
    try {
      const r = await validerSelection();
      toast.success(`${r.nbValidees} ligne(s) validée(s).`);
      onClose();
    } catch (err) {
      toast.error(`Validation refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider la sélection</DialogTitle>
          <DialogDescription>
            Action irréversible — les lignes validées ne seront plus
            modifiables sans dévalidation préalable par un validateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="rounded-md border border-(--border) p-3 text-sm space-y-2"
            data-testid="valid-recap"
          >
            <div>
              <strong data-testid="valid-count">{importes.length}</strong>{' '}
              ligne(s) seront validées.
              {dejaValides > 0 && (
                <span className="text-(--muted-foreground)">
                  {' '}
                  ({dejaValides} déjà validée(s) — ignorée(s))
                </span>
              )}
            </div>
            {top5.length > 0 && (
              <div>
                <div className="text-xs text-(--muted-foreground) mt-2">
                  Récap par compte (top 5) :
                </div>
                <ul className="text-xs">
                  {top5.map(([fkCompte, nb]) => (
                    <li key={fkCompte}>
                      • Compte #{fkCompte} : {nb} ligne(s)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmer}
            disabled={importes.length === 0 || submitting}
            data-testid="btn-confirmer-validation"
          >
            {submitting
              ? 'Validation…'
              : `Valider ${importes.length} ligne(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
