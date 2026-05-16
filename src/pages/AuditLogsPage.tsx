/**
 * AuditLogsPage — Journal d'audit (refonte Lot 7.3 V30 Charte v1).
 *
 * Piste d'audit applicative consultable uniquement (read-only).
 * Conservation 10 ans (BCEAO). Filtrable par type d'action, user,
 * plage de dates. Click sur une ligne ouvre la modale détail avec
 * payloadAvant / payloadApres.
 *
 * Refonte V30 (pattern unifié V11→V29) :
 *  - Header custom : cercle ShieldCheck catégorie CONFIG (gris
 *    ardoise --miznas-cat-config #5F6B7A) + titre + sous-titre +
 *    badge "Read-only" vert validation à droite
 *  - 3 KPI cards (Total entrées / Success 24h / Failures 24h)
 *    avec pastille colorée — Total = `total` server-side, 24h
 *    calculés sur la page courante via helper hors composant
 *    (Date.now() pur)
 *  - Barre de filtres en cadre gris (Type action / Utilisateur /
 *    Date début / Date fin) — server-side, listAuditLogs inchangé
 *  - Compteur "X entrée(s) affichée(s) sur Y" + Rafraîchir
 *  - Tableau grid CSS modernisé :
 *    - Date mono tabular-nums avec secondes (dd/MM HH:mm:ss)
 *    - Utilisateur mono truncate
 *    - TypeActionBadge déterministe par hash typeAction (même
 *      type = même couleur)
 *    - Entité cible mono gris
 *    - StatutAuditBadge (Check vert / AlertTriangle rouge)
 *    - IP mono gris tertiary
 *    - Lignes failure fond rouge subtil
 *  - État vide grand format (cercle FileSearch gris)
 *
 * Logique métier 100 % préservée : listAuditLogs server-side avec
 * filtres + pagination, modale détail Dialog avec payloadAvant/
 * payloadApres + commentaire inchangée.
 */
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  listAuditLogs,
  type ListAuditLogsQuery,
} from '@/lib/api/audit-logs';
import type { AuditLogResponse, AuditTypeAction } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const ALL = '__all__';

const TYPE_ACTIONS: AuditTypeAction[] = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REFRESH',
  'REFRESH_FORCED_REVOCATION',
  'PERMISSION_DENIED',
  'CREATE',
  'UPDATE',
  'DELETE',
  'VALIDATE',
  'FREEZE',
  'EXPORT',
  'IMPORT',
  'LIRE_AUDIT',
];

const BADGE_PALETTES = [
  { bg: '#5F6B7A1F', text: '#444441' },
  { bg: '#5B4E911F', text: '#26215C' },
  { bg: '#BA75171F', text: '#854F0B' },
  { bg: '#0F6E561F', text: '#085041' },
  { bg: '#0C447C1A', text: '#0C447C' },
  { bg: '#B05D3F1F', text: '#712B13' },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateShortDateTimeSec(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// Espaces "insécables" possibles dans le résultat de toLocaleString('fr-FR') :
// NO-BREAK SPACE (U+00A0) et NARROW NO-BREAK SPACE (U+202F).
const FR_SEPARATORS = new RegExp("[  ,]", "g");

function formatTotal(n: number): string {
  return n.toLocaleString('fr-FR').replace(FR_SEPARATORS, ' ');
}

const SEUIL_24H_MS = 24 * 60 * 60 * 1000;

function computeKpi(items: AuditLogResponse[]): {
  success24h: number;
  failures24h: number;
} {
  const refNow = Date.now();
  let success24h = 0;
  let failures24h = 0;
  for (const e of items) {
    const age = refNow - new Date(e.dateAction).getTime();
    if (age > SEUIL_24H_MS) continue;
    if (e.statut === 'success') success24h += 1;
    if (e.statut === 'failure') failures24h += 1;
  }
  return { success24h, failures24h };
}

export function AuditLogsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const limit = 50;
  const [filters, setFilters] = useState<ListAuditLogsQuery>({});
  const [data, setData] = useState<AuditLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);

  useEffect(() => {
    setLoading(true);
    listAuditLogs({ ...filters, page, limit })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => toast.error("Impossible de charger le journal d'audit."))
      .finally(() => setLoading(false));
  }, [page, filters]);

  function applyFilter<K extends keyof ListAuditLogsQuery>(
    key: K,
    value: ListAuditLogsQuery[K] | undefined,
  ): void {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  function handleRefresh(): void {
    setFilters((prev) => ({ ...prev }));
  }

  const kpi = useMemo(() => computeKpi(data), [data]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            style={{ backgroundColor: '#5F6B7A1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <ShieldCheck className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Journal d&apos;audit
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Piste d&apos;audit applicative — consultation seule,
              conservation 10 ans (BCEAO)
            </p>
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold shrink-0"
          style={{ backgroundColor: '#0F6E5614', color: '#0F6E56' }}
        >
          <Lock className="w-2.5 h-2.5" aria-hidden="true" />
          Read-only
        </span>
      </div>

      {/* ─── 3 KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        <KpiNumberCard
          label="Total entrées"
          value={formatTotal(total)}
          colorHex="#0C447C"
          testId="kpi-audit-total"
        />
        <KpiWithDotCard
          label="Success 24h"
          value={String(kpi.success24h)}
          colorHex="#0F6E56"
          testId="kpi-audit-success-24h"
        />
        <KpiWithDotCard
          label="Failures 24h"
          value={String(kpi.failures24h)}
          colorHex="#DC2626"
          testId="kpi-audit-failures-24h"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-3.5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="filter-type" className="text-xs mb-1 block">
              Type d&apos;action
            </Label>
            <Select
              value={filters.typeAction ?? ALL}
              onValueChange={(v) =>
                applyFilter(
                  'typeAction',
                  v === ALL ? undefined : (v as AuditTypeAction),
                )
              }
            >
              <SelectTrigger id="filter-type" className="h-9 bg-white">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {TYPE_ACTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="font-mono text-xs">{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-user" className="text-xs mb-1 block">
              Utilisateur
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="filter-user"
                placeholder="ex. admin@miznas.local"
                value={filters.utilisateur ?? ''}
                onChange={(e) => applyFilter('utilisateur', e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="date-debut" className="text-xs mb-1 block">
              Date début
            </Label>
            <Input
              id="date-debut"
              type="date"
              value={filters.dateDebut?.slice(0, 10) ?? ''}
              onChange={(e) =>
                applyFilter(
                  'dateDebut',
                  e.target.value
                    ? `${e.target.value}T00:00:00.000Z`
                    : undefined,
                )
              }
              className="h-9 bg-white tabular-nums font-mono"
            />
          </div>

          <div>
            <Label htmlFor="date-fin" className="text-xs mb-1 block">
              Date fin
            </Label>
            <Input
              id="date-fin"
              type="date"
              value={filters.dateFin?.slice(0, 10) ?? ''}
              onChange={(e) =>
                applyFilter(
                  'dateFin',
                  e.target.value
                    ? `${e.target.value}T23:59:59.999Z`
                    : undefined,
                )
              }
              className="h-9 bg-white tabular-nums font-mono"
            />
          </div>
        </div>
      </div>

      {/* Compteur + Rafraîchir */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-[11px] text-(--muted-foreground) tabular-nums">
          {loading
            ? '…'
            : `${data.length} entrée${data.length > 1 ? 's' : ''} affichée${data.length > 1 ? 's' : ''} sur ${formatTotal(total)}`}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-7 px-2.5 gap-1.5 text-xs"
        >
          <RefreshCw
            className={cn('w-3 h-3', loading && 'animate-spin')}
          />
          Rafraîchir
        </Button>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────── */}
      <div className="bg-white border border-(--border) rounded-md overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_180px_140px_100px_140px] bg-(--secondary) px-3.5 py-2.5 border-b border-(--border) gap-2.5 items-center">
          <ColumnHeader>Date</ColumnHeader>
          <ColumnHeader>Utilisateur</ColumnHeader>
          <ColumnHeader>Type d&apos;action</ColumnHeader>
          <ColumnHeader>Entité cible</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>IP</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="py-12 px-7 text-center">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: '#5F6B7A14' }}
              aria-hidden="true"
            >
              <FileSearch
                className="w-6 h-6"
                style={{ color: '#5F6B7A' }}
              />
            </div>
            <div className="text-sm font-semibold mb-1">Aucune entrée</div>
            <p className="text-xs text-(--muted-foreground)">
              Aucune entrée ne correspond aux filtres appliqués.
            </p>
          </div>
        )}
        {!loading &&
          data.map((entry) => {
            const isFailure = entry.statut === 'failure';
            return (
              <div
                key={entry.id}
                onClick={() => setSelected(entry)}
                data-testid={`audit-row-${entry.id}`}
                className={cn(
                  'grid grid-cols-[140px_1fr_180px_140px_100px_140px] px-3.5 py-2.5 border-b border-(--border) last:border-b-0 gap-2.5 items-center transition-colors cursor-pointer',
                  isFailure
                    ? 'bg-(--destructive)/[0.04] hover:bg-(--destructive)/[0.06]'
                    : 'hover:bg-(--muted)/30',
                )}
              >
                <div className="text-[11px] font-mono tabular-nums text-(--muted-foreground)">
                  {formatDateShortDateTimeSec(entry.dateAction)}
                </div>
                <div
                  className="text-[11px] font-mono truncate"
                  title={entry.utilisateur ?? '—'}
                >
                  {entry.utilisateur ?? '—'}
                </div>
                <div>
                  <TypeActionBadge typeAction={entry.typeAction} />
                </div>
                <div
                  className="text-[11px] font-mono text-(--muted-foreground) truncate"
                  title={entry.entiteCible ?? '—'}
                >
                  {entry.entiteCible ?? '—'}
                </div>
                <div>
                  <StatutAuditBadge statut={entry.statut} />
                </div>
                <div
                  className="text-[11px] font-mono text-(--muted-foreground)/70 truncate"
                  title={entry.ipSource ?? '—'}
                >
                  {entry.ipSource ?? '—'}
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex justify-between items-center mt-3.5">
          <div className="text-xs text-(--muted-foreground)">
            page {page} sur {totalPages}
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              <ChevronLeft className="w-3 h-3" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              Suivant
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Modale détail (payloadAvant/payloadApres inchangée) */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.typeAction} — {selected?.entiteCible}
            </DialogTitle>
            <DialogDescription>
              {selected &&
                formatDateShortDateTimeSec(selected.dateAction)}{' '}
              — utilisateur : {selected?.utilisateur} — IP :{' '}
              {selected?.ipSource ?? '—'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 max-h-[60vh] overflow-auto text-xs">
              {selected.commentaire && (
                <div>
                  <p className="font-medium mb-1">Commentaire</p>
                  <p className="rounded bg-(--muted) p-2 text-(--foreground)">
                    {selected.commentaire}
                  </p>
                </div>
              )}
              <div>
                <p className="font-medium mb-1">payload_avant</p>
                <pre className="rounded bg-(--muted) p-2 overflow-auto">
                  {selected.payloadAvant
                    ? JSON.stringify(selected.payloadAvant, null, 2)
                    : 'null'}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">payload_apres</p>
                <pre className="rounded bg-(--muted) p-2 overflow-auto">
                  {selected.payloadApres
                    ? JSON.stringify(selected.payloadApres, null, 2)
                    : 'null'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

function ColumnHeader({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}

function KpiNumberCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: string;
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
  value: string;
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

function TypeActionBadge({
  typeAction,
}: {
  typeAction: string;
}): JSX.Element {
  const palette = useMemo(() => {
    const hash = typeAction
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return BADGE_PALETTES[hash % BADGE_PALETTES.length]!;
  }, [typeAction]);

  return (
    <span
      className="inline-flex items-center px-1.5 py-[1px] rounded-sm text-[10px] font-bold font-mono tracking-tight"
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      {typeAction}
    </span>
  );
}

function StatutAuditBadge({
  statut,
}: {
  statut: 'success' | 'failure';
}): JSX.Element {
  if (statut === 'success') {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-[10px] font-medium"
        style={{ backgroundColor: '#0F6E561A', color: '#0F6E56' }}
      >
        <Check className="w-2.5 h-2.5" aria-hidden="true" />
        success
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-[10px] font-semibold"
      style={{ backgroundColor: '#DC26261A', color: '#DC2626' }}
    >
      <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
      failure
    </span>
  );
}
