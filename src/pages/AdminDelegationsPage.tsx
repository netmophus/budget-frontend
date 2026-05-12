/**
 * AdminDelegationsPage (Lot 4.2.C) — page admin (DELEGATION.GERER)
 * listant TOUTES les délégations avec filtres (statut, actif).
 * L'admin peut révoquer n'importe quelle délégation active.
 */
import { ShieldOff } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { RevoquerDelegationDialog } from '@/components/admin/RevoquerDelegationDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type Delegation,
  type DelegationStatut,
  listerToutesDelegations,
  PERMISSION_DELEGABLE_DESCRIPTIONS,
  PERMISSION_DELEGABLE_LABELS,
  STATUT_LABELS,
} from '@/lib/api/delegations';

function statutClass(s: Delegation['statut']): string {
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'EXPIREE') return 'bg-(--muted) text-(--muted-foreground)';
  return 'bg-amber-100 text-amber-800';
}

export function AdminDelegationsPage(): JSX.Element {
  const [items, setItems] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<'TOUS' | DelegationStatut>(
    'TOUS',
  );
  const [revoqueDialog, setRevoqueDialog] = useState<Delegation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listerToutesDelegations({
      statut: statutFilter === 'TOUS' ? undefined : statutFilter,
      limit: 200,
    })
      .then(setItems)
      .catch(() => toast.error('Impossible de charger les délégations.'))
      .finally(() => setLoading(false));
  }, [refreshKey, statutFilter]);

  function refresh(): void {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <PageHeader
        title="Toutes les délégations"
        description="Vue admin (DELEGATION.GERER) — supervision et révocation possible sur toutes les délégations."
      />

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-(--muted-foreground)">Statut :</span>
        <Select
          value={statutFilter}
          onValueChange={(v) =>
            setStatutFilter(v as 'TOUS' | DelegationStatut)
          }
        >
          <SelectTrigger
            className="w-48"
            data-testid="select-filtre-statut"
            aria-label="Filtre statut"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUS">Tous</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="REVOQUEE">Révoquée</SelectItem>
            <SelectItem value="EXPIREE">Expirée</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-(--muted-foreground)" data-testid="count">
          {loading ? '…' : `${items.length} délégation(s)`}
        </span>
      </div>

      {!loading && items.length === 0 && (
        <p
          className="text-sm text-(--muted-foreground)"
          data-testid="empty-state"
        >
          Aucune délégation à afficher.
        </p>
      )}
      <div className="space-y-2">
        {items.map((d) => (
          <div
            key={d.id}
            className="rounded-md border border-(--border) p-3 text-sm"
            data-testid={`admin-delegation-${d.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutClass(
                    d.statut,
                  )}`}
                >
                  {STATUT_LABELS[d.statut]}
                </span>
                <span className="font-medium">
                  {d.delegantEmail ?? d.fkDelegant}
                  <span className="text-(--muted-foreground) mx-2">→</span>
                  {d.delegataireEmail ?? d.fkDelegataire}
                </span>
              </div>
              {d.statut === 'ACTIVE' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevoqueDialog(d)}
                  data-testid={`btn-admin-revoquer-${d.id}`}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Révoquer
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-(--muted-foreground)">
              <div>
                Permissions :{' '}
                <span className="text-(--foreground)">
                  {d.permissions.map((p, i) => (
                    <Fragment key={p}>
                      {i > 0 && ', '}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-help underline decoration-dotted underline-offset-2"
                            data-testid={`admin-perm-${d.id}-${p}`}
                          >
                            {PERMISSION_DELEGABLE_LABELS[p]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {PERMISSION_DELEGABLE_DESCRIPTIONS[p]}
                        </TooltipContent>
                      </Tooltip>
                    </Fragment>
                  ))}
                </span>
              </div>
              <div>
                Périmètres :{' '}
                <span className="text-(--foreground)">
                  {d.perimetreUserPerimetreIds.length}
                </span>
              </div>
              <div>
                Période :{' '}
                <span className="text-(--foreground)">
                  {d.dateDebut} → {d.dateFin}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RevoquerDelegationDialog
        isOpen={revoqueDialog !== null}
        onClose={() => setRevoqueDialog(null)}
        delegation={revoqueDialog}
        onRevoked={refresh}
      />
    </div>
  );
}
