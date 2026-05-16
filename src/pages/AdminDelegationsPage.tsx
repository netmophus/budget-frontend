/**
 * AdminDelegationsPage (Lot 4.2.C + refonte Lot 7.3 V28 Charte v1).
 *
 * Page admin (DELEGATION.GERER) listant TOUTES les délégations avec
 * filtres (statut, permission, recherche). L'admin peut révoquer
 * n'importe quelle délégation active.
 *
 * Refonte V28 (pattern unifié V11→V27) :
 *  - Header custom : cercle Send catégorie COLLABORATION (terracotta
 *    --miznas-cat-collaboration #B05D3F, cohérent /users V26 et
 *    /affectations V27) + titre + sous-titre avec code
 *    DELEGATION.GERER en chip mono
 *  - 4 KPI workflow cards (Total / Actives / Expirées / Révoquées)
 *    avec pastille colorée
 *  - Barre de filtres dans cadre gris (Search + Statut server-side +
 *    Permission client) + compteur sous bordure interne
 *  - Cards de délégation avec bordure GAUCHE colorée selon statut +
 *    badge statut avec icône (Check/TimerOff/Ban) + UserMini avatar
 *    initiales déterministes + flèche délégant→délégataire +
 *    PermissionBadge avec Tooltip + bouton Révoquer rouge outline
 *  - État vide grand format (cercle Send terracotta + message
 *    contextuel)
 *
 * Logique métier 100 % préservée : listerToutesDelegations avec
 * filtre statut server-side, RevoquerDelegationDialog inchangée
 * (mockée en stub dans les tests), Tooltip permissions Lot 6.7.2,
 * tous les data-testid critiques préservés strictement
 * (select-filtre-statut, count avec libellé "X délégation(s)" exact,
 * empty-state, admin-delegation-${id}, btn-admin-revoquer-${id},
 * admin-perm-${id}-${perm}, revoq-dialog-stub via composant).
 */
import {
  ArrowRight,
  Ban,
  Building,
  Check,
  TimerOff,
  HelpCircle,
  Inbox,
  Search,
  Send,
  ShieldOff,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RevoquerDelegationDialog } from '@/components/admin/RevoquerDelegationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

const ALL = '__all__';

const AVATAR_PALETTE = [
  { bg: 'rgba(60, 52, 137, 0.12)', text: '#3C3489' },
  { bg: 'rgba(15, 110, 86, 0.12)', text: '#085041' },
  { bg: 'rgba(186, 117, 23, 0.12)', text: '#854F0B' },
  { bg: 'rgba(91, 78, 145, 0.12)', text: '#26215C' },
  { bg: 'rgba(95, 94, 90, 0.12)', text: '#444441' },
  { bg: 'rgba(176, 93, 63, 0.12)', text: '#712B13' },
];

interface StatutVisualConfig {
  borderLeftColor: string;
  bgHex: string;
  textHex: string;
  Icon: LucideIcon;
  opacityClass: string;
}

const STATUT_VISUAL: Record<DelegationStatut, StatutVisualConfig> = {
  ACTIVE: {
    borderLeftColor: '#0F6E56',
    bgHex: '#0F6E561A',
    textHex: '#0F6E56',
    Icon: Check,
    opacityClass: 'opacity-100',
  },
  EXPIREE: {
    borderLeftColor: '#5F6B7A',
    bgHex: '#5F6B7A1A',
    textHex: '#5F6B7A',
    Icon: TimerOff,
    opacityClass: 'opacity-90',
  },
  REVOQUEE: {
    borderLeftColor: '#BA7517',
    bgHex: '#BA75171F',
    textHex: '#BA7517',
    Icon: Ban,
    opacityClass: 'opacity-90',
  },
};

export function AdminDelegationsPage(): JSX.Element {
  const [items, setItems] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<'TOUS' | DelegationStatut>(
    'TOUS',
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [permissionFilter, setPermissionFilter] = useState<string>(ALL);
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

  // Filtres client (search + permission). Le filtre statut est
  // server-side via listerToutesDelegations.
  const filteredItems = useMemo(() => {
    return items.filter((d) => {
      if (
        permissionFilter !== ALL &&
        !d.permissions.includes(permissionFilter as never)
      ) {
        return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const fields = [
          d.delegantEmail ?? d.fkDelegant,
          d.delegataireEmail ?? d.fkDelegataire,
        ];
        if (!fields.some((f) => f.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, searchTerm, permissionFilter]);

  // 4 KPI workflow.
  const kpi = useMemo(() => {
    const total = items.length;
    const actives = items.filter((d) => d.statut === 'ACTIVE').length;
    const expirees = items.filter((d) => d.statut === 'EXPIREE').length;
    const revoquees = items.filter((d) => d.statut === 'REVOQUEE').length;
    return { total, actives, expirees, revoquees };
  }, [items]);

  // Permissions distinctes pour le Select (calculées sur la liste).
  const permissionsDispos = useMemo(() => {
    const set = new Set<string>();
    for (const d of items) for (const p of d.permissions) set.add(p);
    return Array.from(set).sort();
  }, [items]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#B05D3F1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Send className="w-5 h-5" style={{ color: '#B05D3F' }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Toutes les délégations
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Vue admin{' '}
            <code className="font-mono text-[11px] bg-(--secondary) px-1.5 py-0.5 rounded-sm">
              DELEGATION.GERER
            </code>{' '}
            — supervision et révocation possible sur toutes les délégations
          </p>
        </div>
      </div>

      {/* ─── 4 KPI workflow ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <KpiNumberCard
          label="Total"
          value={kpi.total}
          colorHex="#0C447C"
          testId="kpi-deleg-total"
        />
        <KpiWithDotCard
          label="Actives"
          value={kpi.actives}
          colorHex="#0F6E56"
          testId="kpi-deleg-actives"
        />
        <KpiWithDotCard
          label="Expirées"
          value={kpi.expirees}
          colorHex="#5F6B7A"
          testId="kpi-deleg-expirees"
        />
        <KpiWithDotCard
          label="Révoquées"
          value={kpi.revoquees}
          colorHex="#BA7517"
          testId="kpi-deleg-revoquees"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="search-deleg" className="text-xs mb-1 block">
              Recherche utilisateur
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-deleg"
                placeholder="ex. retail ou controleur"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filter-statut" className="text-xs mb-1 block">
              Statut
            </Label>
            <Select
              value={statutFilter}
              onValueChange={(v) =>
                setStatutFilter(v as 'TOUS' | DelegationStatut)
              }
            >
              <SelectTrigger
                id="filter-statut"
                data-testid="select-filtre-statut"
                aria-label="Filtre statut"
                className="h-9 bg-white"
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
          </div>
          <div>
            <Label htmlFor="filter-permission" className="text-xs mb-1 block">
              Permission
            </Label>
            <Select
              value={permissionFilter}
              onValueChange={setPermissionFilter}
            >
              <SelectTrigger
                id="filter-permission"
                className="h-9 bg-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {permissionsDispos.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PERMISSION_DELEGABLE_LABELS[
                      p as keyof typeof PERMISSION_DELEGABLE_LABELS
                    ] ?? p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compteur (libellé exact "X délégation(s)" préservé pour test) */}
        <div
          className="text-[11px] text-(--muted-foreground) tabular-nums mt-2.5 pt-2.5 border-t border-(--border)"
          data-testid="count"
        >
          {loading ? '…' : `${filteredItems.length} délégation(s)`}
        </div>
      </div>

      {!loading && items.length === 0 && (
        <div
          className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center"
          data-testid="empty-state"
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
            style={{ backgroundColor: '#B05D3F14' }}
            aria-hidden="true"
          >
            <Inbox className="w-7 h-7" style={{ color: '#B05D3F' }} />
          </div>
          <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
            Aucune délégation
          </div>
          <p className="text-xs text-(--muted-foreground) max-w-[420px] mx-auto leading-relaxed">
            Aucune délégation n&apos;a encore été créée dans le système.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="bg-white border border-dashed border-(--border) rounded-lg py-12 px-7 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
            style={{ backgroundColor: '#5F6B7A14' }}
            aria-hidden="true"
          >
            <Search className="w-6 h-6" style={{ color: '#5F6B7A' }} />
          </div>
          <div className="text-sm font-semibold mb-1">
            Aucune délégation pour ces filtres
          </div>
          <p className="text-xs text-(--muted-foreground)">
            Ajustez la recherche, le statut ou la permission.
          </p>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filteredItems.map((d) => (
            <DelegationCard
              key={d.id}
              delegation={d}
              onRevoquer={() => setRevoqueDialog(d)}
            />
          ))}
        </div>
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

// ─── DelegationCard (Charte v1 bordure gauche) ────────────────────

function DelegationCard({
  delegation: d,
  onRevoquer,
}: {
  delegation: Delegation;
  onRevoquer: () => void;
}): JSX.Element {
  const visual = STATUT_VISUAL[d.statut] ?? {
    borderLeftColor: 'var(--border)',
    bgHex: '#5F6B7A1A',
    textHex: '#5F6B7A',
    Icon: HelpCircle,
    opacityClass: 'opacity-90',
  };
  const StatutIcon = visual.Icon;
  const isActive = d.statut === 'ACTIVE';

  return (
    <div
      className={cn(
        'bg-white border border-(--border) rounded-md px-4 py-3.5 transition-opacity',
        visual.opacityClass,
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: visual.borderLeftColor,
      }}
      data-testid={`admin-delegation-${d.id}`}
    >
      {/* Ligne haute : badge + délégant → délégataire + bouton */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0"
            style={{
              backgroundColor: visual.bgHex,
              color: visual.textHex,
            }}
          >
            <StatutIcon className="w-2.5 h-2.5" aria-hidden="true" />
            {STATUT_LABELS[d.statut]}
          </span>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <UserMini email={d.delegantEmail ?? d.fkDelegant} />
            <ArrowRight
              className="w-3.5 h-3.5 text-(--muted-foreground) shrink-0"
              aria-hidden="true"
            />
            <UserMini email={d.delegataireEmail ?? d.fkDelegataire} />
          </div>
        </div>

        {isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRevoquer}
            data-testid={`btn-admin-revoquer-${d.id}`}
            className="h-7 px-2.5 gap-1.5 text-xs border-(--destructive)/30 text-(--destructive) hover:bg-(--destructive)/10 shrink-0"
          >
            <ShieldOff className="w-3 h-3" />
            Révoquer
          </Button>
        )}
      </div>

      {/* Ligne basse : Permissions / Périmètres / Période */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-(--border)">
        <div>
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
            Permissions
          </div>
          <div className="text-xs">
            {d.permissions.map((p, i) => (
              <Fragment key={p}>
                {i > 0 && (
                  <span className="text-(--muted-foreground)">, </span>
                )}
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
          </div>
        </div>

        <div>
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
            Périmètres
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Building
              className="w-3 h-3 text-(--muted-foreground)"
              aria-hidden="true"
            />
            <span className="font-medium">
              {d.perimetreUserPerimetreIds.length} périmètre
              {d.perimetreUserPerimetreIds.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
            Période
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums">
            <span>{d.dateDebut}</span>
            <ArrowRight
              className="w-2.5 h-2.5 text-(--muted-foreground)"
              aria-hidden="true"
            />
            <span>{d.dateFin}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UserMini (avatar initiales + email mono) ─────────────────────

function UserMini({ email }: { email: string }): JSX.Element {
  const initial = email.charAt(0).toUpperCase();
  const palette = useMemo(() => {
    const hash = email
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
  }, [email]);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-semibold"
        style={{ background: palette.bg, color: palette.text }}
        aria-hidden="true"
      >
        {initial}
      </div>
      <span className="text-xs font-mono truncate" title={email}>
        {email}
      </span>
    </div>
  );
}

// ─── KPI cards (cohérent V19/V21/V24/V26/V27) ─────────────────────

function KpiNumberCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiWithDotCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        />
        <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}
