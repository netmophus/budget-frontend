import { History, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export interface DetailField {
  label: string;
  /** Valeur formatée (chaîne, badge JSX, etc.). null/undefined → "—". */
  value: ReactNode;
}

export interface DetailDrawerProps<TEntity, THistoryRow> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titre du drawer (ex. "Compte 611100"). */
  title: string;
  /** Sous-titre court (ex. libellé). */
  description?: string;
  /** Liste des champs à afficher dans le détail. */
  fields: DetailField[];
  /** Footer optionnel (ex. liens vers parent, etc.). */
  footer?: ReactNode;
  /**
   * Callback pour charger l'historique SCD2 à la demande. Si fourni,
   * un bouton « Voir l'historique SCD2 » s'affiche.
   */
  loadHistory?: () => Promise<THistoryRow[]>;
  /** Rendu d'une ligne d'historique. */
  renderHistoryRow?: (row: THistoryRow, index: number) => ReactNode;
  /** Pour ramener le drawer à l'état initial quand on change d'entité. */
  entity?: TEntity;
}

/**
 * Drawer générique de consultation d'une entité SCD2.
 *
 * Affiche une grille label/valeur, et optionnellement un panneau
 * d'historique SCD2 chargé à la demande. Tous les Référentiels
 * (compte, ligne_metier, produit, segment) l'utilisent — pattern
 * unifié pour la lecture.
 */
export function DetailDrawer<TEntity, THistoryRow>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  footer,
  loadHistory,
  renderHistoryRow,
  entity,
}: DetailDrawerProps<TEntity, THistoryRow>) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<THistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  // Réinitialise quand l'entité change ou la modale ferme.
  useEffect(() => {
    setHistoryOpen(false);
    setHistory([]);
    setHistoryError(false);
  }, [entity, open]);

  async function onShowHistory() {
    if (!loadHistory) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const rows = await loadHistory();
      setHistory(rows);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 py-2">
          {fields.map((f) => (
            <div key={f.label} className="space-y-1">
              <div className="text-xs uppercase text-(--muted-foreground)">
                {f.label}
              </div>
              <div className="text-sm">
                {f.value === null || f.value === undefined ? (
                  <span className="text-(--muted-foreground)">—</span>
                ) : (
                  f.value
                )}
              </div>
            </div>
          ))}
        </div>

        {footer && <div className="border-t border-(--border) pt-4">{footer}</div>}

        {loadHistory && (
          <div className="border-t border-(--border) pt-4 space-y-3">
            <Button
              variant={historyOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={onShowHistory}
              disabled={historyLoading}
            >
              <History className="h-4 w-4 mr-2" />
              {historyOpen ? 'Historique SCD2 chargé' : "Voir l'historique SCD2"}
            </Button>

            {historyOpen && (
              <div className="space-y-2 text-sm">
                {historyLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : historyError ? (
                  <p className="text-(--destructive) text-xs">
                    Impossible de charger l'historique.
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-(--muted-foreground) text-xs">
                    Aucune version historisée.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {history.map((row, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-(--border) p-3"
                      >
                        {renderHistoryRow
                          ? renderHistoryRow(row, i)
                          : JSON.stringify(row)}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" /> Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
