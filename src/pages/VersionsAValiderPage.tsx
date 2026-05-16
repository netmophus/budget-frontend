/**
 * VersionsAValiderPage (Lot 3.5 + refonte Lot 7.3 V21 Charte v1).
 *
 * File d'attente du contrôleur. Liste les versions au statut
 * 'soumis' (« Soumis » en UI). Pour chacune : code, type, exercice,
 * date de soumission, préparateur, commentaire de soumission, et
 * boutons Valider / Rejeter via le composant WorkflowActions.
 *
 * Permission requise : BUDGET.VALIDER (cf. AppRoutes.tsx).
 *
 * Refonte V21 (pattern unifié V11–V20) :
 *  - Header custom : cercle ClipboardCheck catégorie VALIDATION
 *    (vert) + titre + sous-titre
 *  - 3 KPI cards (En attente / Anciennes >7j / Récentes <24h) avec
 *    pastille colorée
 *  - Barre de filtres dans cadre gris (Search + Exercice + Type) —
 *    filtre client (l'endpoint backend ne supporte que statut)
 *  - Tableau grid CSS modernisé OU état vide grand format Inbox vert
 *  - Lignes anciennes (>7j) en fond rouge subtil + AlertTriangle
 *  - Logique Valider/Rejeter 100 % déléguée à `WorkflowActions`
 *    existant (préserve modales et workflow Lot 3.5).
 */
import {
  AlertTriangle,
  ClipboardCheck,
  Inbox,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { WorkflowActions } from '@/components/budget/WorkflowActions';
import { WorkflowTimeline } from '@/components/budget/WorkflowTimeline';
import { BandeauDelegations } from '@/components/budget/BandeauDelegations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listVersions, type Version } from '@/lib/api/versions';
import {
  formatDateFr,
  TYPES_VERSION,
} from '@/lib/labels/budget';
import { TypeVersionBadge } from './VersionsPage';
import { cn } from '@/lib/utils';

const ALL = '__all__';

function daysSince(dateIso: string | null): number {
  if (!dateIso) return 0;
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function hoursSince(dateIso: string | null): number {
  if (!dateIso) return 0;
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60));
}

function formatRelativeDate(dateIso: string | null): string {
  if (!dateIso) return '—';
  const minutes = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

export function VersionsAValiderPage() {
  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exerciceFilter, setExerciceFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listVersions({ statut: 'soumis', page: 1, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error('Impossible de charger la file de validation.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Filtre client (l'endpoint backend ne supporte que statut).
  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return items.filter((v) => {
      if (term) {
        const match =
          v.codeVersion.toLowerCase().includes(term) ||
          v.libelle.toLowerCase().includes(term);
        if (!match) return false;
      }
      if (exerciceFilter !== ALL && String(v.exerciceFiscal) !== exerciceFilter) {
        return false;
      }
      if (typeFilter !== ALL && v.typeVersion !== typeFilter) return false;
      return true;
    });
  }, [items, debouncedSearch, exerciceFilter, typeFilter]);

  const exercices = useMemo(() => {
    const set = new Set<number>();
    for (const v of items) set.add(v.exerciceFiscal);
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  // 3 KPI workflow.
  const kpi = useMemo(() => {
    const enAttente = items.length;
    const anciennes = items.filter(
      (v) => daysSince(v.dateSoumission) > 7,
    ).length;
    const recentes = items.filter(
      (v) => hoursSince(v.dateSoumission) < 24,
    ).length;
    return { enAttente, anciennes, recentes };
  }, [items]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          style={{ backgroundColor: '#0F6E561A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <ClipboardCheck
            className="w-5 h-5"
            style={{ color: '#0F6E56' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Versions à valider
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            File d&apos;attente des versions soumises par les préparateurs
          </p>
        </div>
      </div>

      <BandeauDelegations />

      {/* ─── 3 KPI workflow ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
        <KpiQueueCard
          label="En attente"
          value={kpi.enAttente}
          colorHex="#BA7517"
          testId="kpi-aval-en-attente"
        />
        <KpiQueueCard
          label="Anciennes (>7j)"
          value={kpi.anciennes}
          colorHex="#DC2626"
          testId="kpi-aval-anciennes"
        />
        <KpiQueueCard
          label="Récentes (<24h)"
          value={kpi.recentes}
          colorHex="#0F6E56"
          testId="kpi-aval-recentes"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="search-aval" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-aval"
                placeholder="ex. budget Q1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="exercice-aval" className="text-xs mb-1 block">
              Exercice
            </Label>
            <Select value={exerciceFilter} onValueChange={setExerciceFilter}>
              <SelectTrigger id="exercice-aval" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {exercices.map((y) => (
                  <SelectItem
                    key={y}
                    value={String(y)}
                    className="tabular-nums"
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="type-aval" className="text-xs mb-1 block">
              Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-aval" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {TYPES_VERSION.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-(--border) rounded-md p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div
          className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center"
          data-testid="empty-state"
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
            style={{ backgroundColor: '#0F6E5614' }}
            aria-hidden="true"
          >
            <Inbox className="w-7 h-7" style={{ color: '#0F6E56' }} />
          </div>
          <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
            {items.length === 0
              ? 'Tout est à jour'
              : 'Aucune version ne correspond aux filtres'}
          </div>
          <p className="text-xs text-(--muted-foreground) max-w-[380px] mx-auto leading-relaxed">
            {items.length === 0
              ? "Aucune version en attente de validation. Vous serez notifié dès qu'une nouvelle soumission arrivera."
              : 'Ajustez votre recherche ou réinitialisez les filtres.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3" data-testid="liste-a-valider">
          {filtered.map((v) => {
            const days = daysSince(v.dateSoumission);
            const isAncienne = days > 7;
            return (
              <li
                key={v.id}
                className={cn(
                  'rounded-md border p-4 transition-colors',
                  isAncienne
                    ? 'border-(--border) bg-(--destructive)/[0.03] hover:bg-(--destructive)/[0.06]'
                    : 'border-(--border) bg-white hover:bg-(--muted)/30',
                )}
                data-testid={`row-${v.codeVersion}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono font-bold text-[13px]"
                        style={{ color: '#0C447C' }}
                      >
                        {v.codeVersion}
                      </span>
                      <TypeVersionBadge type={v.typeVersion} />
                      <span className="text-sm font-medium">{v.libelle}</span>
                      {isAncienne && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: '#DC2626' }}
                          aria-label={`Soumission ancienne, il y a ${days} jours`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Ancienne ({days}j)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-(--muted-foreground) tabular-nums">
                      Exercice {v.exerciceFiscal}
                      {v.dateSoumission && (
                        <>
                          {' · '}
                          Soumise{' '}
                          <span
                            className={
                              isAncienne
                                ? 'font-semibold'
                                : ''
                            }
                            style={
                              isAncienne ? { color: '#DC2626' } : undefined
                            }
                          >
                            {formatRelativeDate(v.dateSoumission)}
                          </span>{' '}
                          ({formatDateFr(v.dateSoumission)})
                          {v.utilisateurSoumission && (
                            <> par {v.utilisateurSoumission}</>
                          )}
                        </>
                      )}
                    </p>
                    {v.commentaireSoumission && (
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap rounded bg-(--muted) px-3 py-2 text-xs">
                        {v.commentaireSoumission}
                      </p>
                    )}
                  </div>
                  <WorkflowActions
                    version={v}
                    onTransitioned={() => setRefreshKey((k) => k + 1)}
                  />
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-(--muted-foreground) hover:text-(--foreground)">
                    Historique
                  </summary>
                  <div className="mt-2">
                    <WorkflowTimeline version={v} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiQueueCardProps {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}

function KpiQueueCard({
  label,
  value,
  colorHex,
  testId,
}: KpiQueueCardProps): JSX.Element {
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
        className="text-2xl font-medium tabular-nums"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}
