/**
 * MesDelegationsPage (Lot 4.2.C) — page utilisateur listant ses
 * délégations en deux onglets :
 *  - "Reçues" : où je suis délégataire (read-only)
 *  - "Émises" : où je suis délégant (avec bouton Révoquer)
 *
 * Bouton "Nouvelle délégation" → CreerDelegationDialog.
 * Bouton ligne "Révoquer" → RevoquerDelegationDialog.
 */
import { Plus, ShieldOff } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreerDelegationDialog } from '@/components/admin/CreerDelegationDialog';
import { RevoquerDelegationDialog } from '@/components/admin/RevoquerDelegationDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type Delegation,
  listerDelegationsEmises,
  listerDelegationsRecues,
  PERMISSION_DELEGABLE_DESCRIPTIONS,
  PERMISSION_DELEGABLE_LABELS,
  STATUT_LABELS,
} from '@/lib/api/delegations';
import { useAuthStore } from '@/lib/auth/auth-store';

type Onglet = 'recues' | 'emises';

function statutClass(s: Delegation['statut']): string {
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'EXPIREE') return 'bg-(--muted) text-(--muted-foreground)';
  return 'bg-amber-100 text-amber-800';
}

export function MesDelegationsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [onglet, setOnglet] = useState<Onglet>('recues');
  const [recues, setRecues] = useState<Delegation[]>([]);
  const [emises, setEmises] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creerOpen, setCreerOpen] = useState(false);
  const [revoqueDialog, setRevoqueDialog] = useState<Delegation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([listerDelegationsRecues(), listerDelegationsEmises()])
      .then(([r, e]) => {
        setRecues(r);
        setEmises(e);
      })
      .catch(() => toast.error('Impossible de charger les délégations.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function refresh(): void {
    setRefreshKey((k) => k + 1);
  }

  const items = onglet === 'recues' ? recues : emises;

  return (
    <div>
      <PageHeader
        title="Mes délégations"
        description="Délégations temporaires reçues et émises. Anti-chaînage strict (BCEAO)."
        actions={
          <Button
            onClick={() => setCreerOpen(true)}
            data-testid="btn-nouvelle-delegation"
          >
            <Plus className="h-4 w-4" />
            Nouvelle délégation
          </Button>
        }
      />

      {/* Onglets */}
      <div className="flex gap-1 mb-4 border-b border-(--border)">
        <button
          onClick={() => setOnglet('recues')}
          data-testid="tab-recues"
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${
            onglet === 'recues'
              ? 'border-(--primary) text-(--foreground) font-medium'
              : 'border-transparent text-(--muted-foreground)'
          }`}
        >
          Reçues ({recues.length})
        </button>
        <button
          onClick={() => setOnglet('emises')}
          data-testid="tab-emises"
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${
            onglet === 'emises'
              ? 'border-(--primary) text-(--foreground) font-medium'
              : 'border-transparent text-(--muted-foreground)'
          }`}
        >
          Émises ({emises.length})
        </button>
      </div>

      {/* Liste */}
      {loading && (
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      )}
      {!loading && items.length === 0 && (
        <p className="text-sm text-(--muted-foreground)" data-testid="empty-state">
          {onglet === 'recues'
            ? 'Aucune délégation reçue.'
            : 'Aucune délégation émise.'}
        </p>
      )}
      <div className="space-y-2">
        {items.map((d) => (
          <div
            key={d.id}
            className="rounded-md border border-(--border) p-3 text-sm"
            data-testid={`delegation-${d.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutClass(
                    d.statut,
                  )}`}
                  data-testid={`statut-${d.id}`}
                >
                  {STATUT_LABELS[d.statut]}
                </span>
                <span className="font-medium">
                  {onglet === 'recues' ? (
                    <>
                      <span className="text-(--muted-foreground)">de </span>
                      {d.delegantEmail ?? d.fkDelegant}
                    </>
                  ) : (
                    <>
                      <span className="text-(--muted-foreground)">à </span>
                      {d.delegataireEmail ?? d.fkDelegataire}
                    </>
                  )}
                </span>
              </div>
              {onglet === 'emises' && d.statut === 'ACTIVE' && user?.id === d.fkDelegant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevoqueDialog(d)}
                  data-testid={`btn-revoquer-${d.id}`}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Révoquer
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-(--muted-foreground)">
              <div>
                <span>Permissions : </span>
                <span className="text-(--foreground)">
                  {d.permissions.map((p, i) => (
                    <Fragment key={p}>
                      {i > 0 && ', '}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-help underline decoration-dotted underline-offset-2"
                            data-testid={`perm-${d.id}-${p}`}
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
                <span>Périmètres : </span>
                <span className="text-(--foreground)">
                  {d.perimetreUserPerimetreIds.length}
                </span>
              </div>
              <div>
                <span>Période : </span>
                <span className="text-(--foreground)">
                  {d.dateDebut} → {d.dateFin}
                </span>
              </div>
            </div>
            {d.motif && (
              <p className="mt-2 text-xs italic text-(--muted-foreground)">
                « {d.motif} »
              </p>
            )}
            {d.statut === 'REVOQUEE' && d.motifRevocation && (
              <p className="mt-2 text-xs text-amber-700">
                Révoquée — {d.motifRevocation}
              </p>
            )}
          </div>
        ))}
      </div>

      {user && (
        <CreerDelegationDialog
          isOpen={creerOpen}
          onClose={() => setCreerOpen(false)}
          currentUserId={user.id}
          onCreated={refresh}
        />
      )}
      <RevoquerDelegationDialog
        isOpen={revoqueDialog !== null}
        onClose={() => setRevoqueDialog(null)}
        delegation={revoqueDialog}
        onRevoked={refresh}
      />
    </div>
  );
}
