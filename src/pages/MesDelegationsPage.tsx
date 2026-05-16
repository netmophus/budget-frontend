/**
 * MesDelegationsPage (Lot 4.2.C + Lot 7.3 V9 refonte Charte v1).
 *
 * Page utilisateur listant ses délégations en deux onglets :
 *  - "Reçues" : où je suis délégataire (read-only)
 *  - "Émises" : où je suis délégant (avec bouton Révoquer)
 *
 * Bouton "Nouvelle délégation" → CreerDelegationDialog.
 * Bouton ligne "Révoquer" → RevoquerDelegationDialog.
 *
 * Refonte V9 :
 *  - Header avec cercle d'icône catégorie collaboration (terracotta),
 *    titre + sous-titre court, bouton CTA bleu nuit dark
 *  - 3 KPI cards : Reçues actives (vert si > 0), Émises actives
 *    (bleu nuit), Historique (muted)
 *  - Tabs avec icônes (Inbox / Send) et border-bottom ambre actif
 *  - État vide modernisé : cercle gris + Inbox + message contextuel
 */
import { ArrowLeftRight, Inbox, Plus, Send, ShieldOff } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreerDelegationDialog } from '@/components/admin/CreerDelegationDialog';
import { RevoquerDelegationDialog } from '@/components/admin/RevoquerDelegationDialog';
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
import { cn } from '@/lib/utils';

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

  // KPI : actif = la délégation porte des droits effectifs maintenant.
  // Historique = tout ce qui n'est plus actif (expirée ou révoquée),
  // toutes directions confondues.
  const kpi = useMemo(() => {
    const recuesActives = recues.filter((d) => d.actif).length;
    const emisesActives = emises.filter((d) => d.actif).length;
    const historique =
      recues.filter((d) => !d.actif).length +
      emises.filter((d) => !d.actif).length;
    return { recuesActives, emisesActives, historique };
  }, [recues, emises]);

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: '#B05D3F1A' }}
            className="w-9 h-9 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <ArrowLeftRight
              className="w-5 h-5"
              style={{ color: '#B05D3F' }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight m-0">
              Mes délégations
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Délégations temporaires reçues et émises.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreerOpen(true)}
          data-testid="btn-nouvelle-delegation"
          className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle délégation
        </Button>
      </div>

      {/* ─── 3 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <KpiCard
          label="Reçues actives"
          value={kpi.recuesActives}
          colorIfPositive="#0F6E56"
          testId="kpi-recues-actives"
        />
        <KpiCard
          label="Émises actives"
          value={kpi.emisesActives}
          colorIfPositive="#0A1F44"
          testId="kpi-emises-actives"
        />
        <KpiCard
          label="Historique"
          value={kpi.historique}
          colorIfPositive={null}
          testId="kpi-historique"
        />
      </div>

      {/* ─── Tabs modernisés ────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-(--border)">
        <TabButton
          actif={onglet === 'recues'}
          onClick={() => setOnglet('recues')}
          icon={Inbox}
          label="Reçues"
          count={recues.length}
          testId="tab-recues"
        />
        <TabButton
          actif={onglet === 'emises'}
          onClick={() => setOnglet('emises')}
          icon={Send}
          label="Émises"
          count={emises.length}
          testId="tab-emises"
        />
      </div>

      {/* ─── Liste / état vide ─────────────────────────────────── */}
      {loading && (
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      )}
      {!loading && items.length === 0 && (
        <div
          className="border border-dashed border-(--border) rounded-md p-12 text-center"
          data-testid="empty-state"
        >
          <div className="w-12 h-12 rounded-full bg-(--secondary) mx-auto mb-3 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-(--muted-foreground)" />
          </div>
          <div className="text-sm font-medium mb-1">
            {onglet === 'recues'
              ? 'Aucune délégation reçue.'
              : 'Aucune délégation émise.'}
          </div>
          <div className="text-xs text-(--muted-foreground) max-w-sm mx-auto">
            {onglet === 'recues'
              ? "Les délégations qu'un collègue vous transmet apparaîtront ici."
              : "Les délégations que vous transmettez à un collègue apparaîtront ici."}
          </div>
        </div>
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
              {onglet === 'emises' &&
                d.statut === 'ACTIVE' &&
                user?.id === d.fkDelegant && (
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

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  /** Hex de la couleur si la valeur > 0 ; null = toujours muted. */
  colorIfPositive: string | null;
  testId: string;
}

function KpiCard({
  label,
  value,
  colorIfPositive,
  testId,
}: KpiCardProps): JSX.Element {
  const couleur =
    value > 0 && colorIfPositive ? colorIfPositive : undefined;
  return (
    <div
      className="border border-(--border) rounded-md p-4"
      data-testid={testId}
    >
      <div className="text-[11px] uppercase tracking-[0.08em] text-(--muted-foreground)">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-medium tabular-nums mt-1',
          !couleur && 'text-(--muted-foreground)',
        )}
        style={couleur ? { color: couleur } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

interface TabButtonProps {
  actif: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  label: string;
  count: number;
  testId: string;
}

function TabButton({
  actif,
  onClick,
  icon: Icon,
  label,
  count,
  testId,
}: TabButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors',
        actif
          ? 'border-(--miznas-ambre) text-(--miznas-bleu-nuit-dark) font-semibold'
          : 'border-transparent text-(--muted-foreground) hover:text-(--foreground)',
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label} ({count})
    </button>
  );
}
