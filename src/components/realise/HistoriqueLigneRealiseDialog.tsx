/**
 * Dialogue Historique d'une ligne de réalisé (Lot 5.1.B) —
 * affiche les entrées audit_log liées à cette fait_realise.
 *
 * Utilise l'endpoint existant GET /audit-logs avec filtre
 * entiteCible=fait_realise & idCible=:id.
 */
import { useEffect, useState } from 'react';
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
import { listAuditLogs } from '@/lib/api/audit-logs';
import type { AuditLogResponse } from '@/lib/api/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  faitRealiseId: string;
}

const TYPE_LABEL: Record<string, string> = {
  SAISIR_REALISE: 'Saisie / modification',
  VALIDER_REALISE: 'Validation',
  SUPPRIMER_REALISE: 'Suppression',
  IMPORTER_REALISE: 'Import',
};

export function HistoriqueLigneRealiseDialog({
  isOpen,
  onClose,
  faitRealiseId,
}: Props): JSX.Element {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    listAuditLogs({
      entiteCible: 'fait_realise',
      idCible: faitRealiseId,
      limit: 50,
      page: 1,
    })
      .then((r) => setLogs(r.items))
      .catch(() =>
        toast.error("Impossible de charger l'historique de la ligne."),
      )
      .finally(() => setLoading(false));
  }, [isOpen, faitRealiseId]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historique de la ligne #{faitRealiseId}</DialogTitle>
          <DialogDescription>
            50 dernières actions enregistrées sur cette ligne (audit BCEAO).
          </DialogDescription>
        </DialogHeader>

        <div
          className="max-h-96 overflow-y-auto"
          data-testid="historique-realise"
        >
          {loading && (
            <p className="text-sm text-(--muted-foreground)">Chargement…</p>
          )}
          {!loading && logs.length === 0 && (
            <p
              className="text-sm text-(--muted-foreground)"
              data-testid="historique-empty"
            >
              Aucune entrée d'audit trouvée pour cette ligne.
            </p>
          )}
          <ul className="space-y-2">
            {logs.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-(--border) p-2 text-xs"
                data-testid={`audit-${l.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {TYPE_LABEL[l.typeAction] ?? l.typeAction}
                  </span>
                  <span className="text-(--muted-foreground)">
                    {new Date(l.dateAction).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="text-(--muted-foreground) mt-1">
                  par {l.utilisateur} ({l.statut})
                </div>
                {(Boolean(l.payloadAvant) || Boolean(l.payloadApres)) && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-(--muted-foreground)">
                      Détails
                    </summary>
                    <pre className="mt-1 max-h-32 overflow-auto bg-(--muted)/50 p-2 rounded">
                      {JSON.stringify(
                        {
                          avant: l.payloadAvant,
                          apres: l.payloadApres,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
