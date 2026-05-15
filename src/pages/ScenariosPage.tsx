/**
 * ScenariosPage (Lot 3.2 + Lot 7.3 V18 refonte Charte v1).
 *
 * Référentiel des scénarios budgétaires (cadrages macro pour
 * l'élaboration). Pas de hiérarchie.
 *
 * Refonte V18 (pattern unifié V11/V12/V14/V15/V16/V17) :
 *  - Header custom : cercle PieChart catégorie BUDGET (bleu nuit) +
 *    titre + sous-titre. Note : on utilise `--miznas-cat-budget`
 *    (bleu nuit) plutôt que `--miznas-cat-config` car les scénarios
 *    sont une dimension BUDGET, pas une config technique.
 *  - 4 KPI cards (Total actifs / Optimistes / Médians / Pessimistes)
 *  - Barre de filtres dans cadre gris (Search + Type + Exercice +
 *    checkbox Actifs uniquement)
 *  - Tableau grid CSS modernisé avec sous-composants
 *    `TypeScenarioBadge` (icône + couleur sémantique) et
 *    `StatutScenarioBadge`
 *
 * Logique métier 100 % préservée : DetailDrawer, ConfirmDialog
 * (archivage), ScenarioFormDrawer (création/édition), permission
 * REFERENTIEL.GERER, debounce search, filtre côté client.
 */
import { AxiosError } from 'axios';
import {
  Archive,
  Layers,
  Minus,
  Pencil,
  PieChart,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { ScenarioFormDrawer } from '@/components/budget/ScenarioFormDrawer';
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
  archiverScenario,
  listScenarios,
  type Scenario,
  type StatutScenario,
  type TypeScenario,
} from '@/lib/api/scenarios';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  formatDateFr,
  libelleStatutScenario,
  libelleTypeScenario,
  TYPES_SCENARIO,
} from '@/lib/labels/budget';
import { cn } from '@/lib/utils';

const ALL = '__all__';
const ALL_EXERCICES = '__all_exos__';
const DEFAULT_LIMIT = 50;

export function ScenariosPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [exerciceFilter, setExerciceFilter] = useState<string>(ALL_EXERCICES);
  const [actifsUniquement, setActifsUniquement] = useState(false);
  const [data, setData] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Scenario | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Scenario | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listScenarios({
      page: 1,
      limit: DEFAULT_LIMIT,
      typeScenario:
        typeFilter === ALL ? undefined : (typeFilter as TypeScenario),
      statut: actifsUniquement ? ('actif' as StatutScenario) : undefined,
    })
      .then((res) => {
        const term = debouncedSearch.trim().toLowerCase();
        const items = term
          ? res.items.filter(
              (s) =>
                s.codeScenario.toLowerCase().includes(term) ||
                s.libelle.toLowerCase().includes(term),
            )
          : res.items;
        setData(items);
      })
      .catch(() => toast.error('Impossible de charger les scénarios'))
      .finally(() => setLoading(false));
  }, [typeFilter, actifsUniquement, debouncedSearch, refreshKey]);

  function parseApiError(err: unknown): { status: number; message: string } {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const dataMsg =
        (err.response?.data as { message?: string | string[] } | undefined)
          ?.message;
      const message = Array.isArray(dataMsg)
        ? dataMsg.join(' ; ')
        : (dataMsg ?? err.message);
      return { status, message };
    }
    return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
  }

  async function handleArchiveConfirmed(): Promise<void> {
    if (!confirmArchive) return;
    try {
      await archiverScenario(confirmArchive.id);
      toast.success(`Scénario ${confirmArchive.codeScenario} archivé.`);
      setConfirmArchive(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { message } = parseApiError(err);
      toast.error(message || 'Archivage refusé.');
      throw err;
    }
  }

  // Filtre client par exercice (le backend n'expose pas ce filtre).
  const filtered = useMemo(() => {
    if (exerciceFilter === ALL_EXERCICES) return data;
    return data.filter((s) => String(s.exerciceFiscal) === exerciceFilter);
  }, [data, exerciceFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        a.codeScenario.localeCompare(b.codeScenario),
      ),
    [filtered],
  );

  // 4 KPI calculées sur data (avant filtre exercice — vue globale).
  const kpi = useMemo(() => {
    const actifs = data.filter((s) => s.statut === 'actif');
    const t = (s: Scenario) => s.typeScenario;
    return {
      totalActifs: actifs.length,
      optimistes: actifs.filter((s) => t(s) === 'optimiste').length,
      medians: actifs.filter((s) => t(s) === 'central').length,
      pessimistes: actifs.filter((s) => t(s) === 'pessimiste').length,
    };
  }, [data]);

  // Liste des exercices distincts pour le filtre.
  const exercices = useMemo(() => {
    const set = new Set<number>();
    for (const s of data) {
      if (s.exerciceFiscal !== null) set.add(s.exerciceFiscal);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#0C447C1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <PieChart className="w-5 h-5" style={{ color: '#0C447C' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Scénarios budgétaires
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Cadrages macro-économiques pour l&apos;élaboration budgétaire
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau scénario
          </Button>
        )}
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <KpiNumberCard
          label="Total actifs"
          value={kpi.totalActifs}
          color="#0F6E56"
          testId="kpi-scen-total-actifs"
        />
        <KpiNumberCard
          label="Optimistes"
          value={kpi.optimistes}
          color="#0F6E56"
          testId="kpi-scen-optimistes"
        />
        <KpiNumberCard
          label="Médians"
          value={kpi.medians}
          color="#5F6B7A"
          testId="kpi-scen-medians"
        />
        <KpiNumberCard
          label="Pessimistes"
          value={kpi.pessimistes}
          color="#DC2626"
          testId="kpi-scen-pessimistes"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-scenarios" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-scenarios"
                placeholder="ex. MEDIAN"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="type-scenario-filter"
              className="text-xs mb-1 block"
            >
              Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                id="type-scenario-filter"
                className="h-9 bg-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {TYPES_SCENARIO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              htmlFor="exercice-filter"
              className="text-xs mb-1 block"
            >
              Exercice
            </Label>
            <Select
              value={exerciceFilter}
              onValueChange={setExerciceFilter}
            >
              <SelectTrigger id="exercice-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EXERCICES}>Tous</SelectItem>
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
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-(--border)">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={actifsUniquement}
              onChange={(e) => setActifsUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Actifs uniquement
          </label>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="scen-table"
      >
        <div className="grid grid-cols-[200px_1fr_140px_90px_90px_110px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Type</ColumnHeader>
          <ColumnHeader>Exercice</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>Créé le</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucun scénario ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          sorted.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelected(scenario)}
              data-testid={`scen-row-${scenario.id}`}
              className="w-full text-left grid grid-cols-[200px_1fr_140px_90px_90px_110px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
            >
              <div className="font-mono text-[13px]">
                {scenario.codeScenario}
              </div>
              <div className="text-[13px]">{scenario.libelle}</div>
              <div>
                <TypeScenarioBadge type={scenario.typeScenario} />
              </div>
              <div className="text-[13px] tabular-nums font-medium">
                {scenario.exerciceFiscal ?? (
                  <span className="text-(--muted-foreground)/60">—</span>
                )}
              </div>
              <div>
                <StatutScenarioBadge statut={scenario.statut} />
              </div>
              <div className="text-xs text-(--muted-foreground)/70 tabular-nums">
                {formatDateFr(scenario.dateCreation)}
              </div>
            </button>
          ))}
      </div>

      <DetailDrawer<Scenario, never>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Scénario ${selected.codeScenario}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: <TypeScenarioBadge type={selected.typeScenario} />,
                },
                { label: 'Exercice fiscal', value: selected.exerciceFiscal },
                {
                  label: 'Statut',
                  value: libelleStatutScenario(selected.statut),
                },
                { label: 'Commentaire', value: selected.commentaire },
                {
                  label: 'Créé le',
                  value: formatDateFr(selected.dateCreation),
                },
                { label: 'Créé par', value: selected.utilisateurCreation },
                {
                  label: 'Modifié le',
                  value: selected.dateModification
                    ? formatDateFr(selected.dateModification)
                    : null,
                },
                {
                  label: 'Modifié par',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected && canGerer ? (
            <div className="flex items-center gap-2">
              {selected.statut === 'actif' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setFormMode('edit')}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmArchive(selected)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </Button>
                </>
              )}
              {selected.statut === 'archive' && (
                <span className="text-xs text-(--muted-foreground)">
                  Scénario archivé — plus aucune saisie possible.
                </span>
              )}
            </div>
          ) : null
        }
      />

      <ScenarioFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(s) => {
          if (formMode === 'create') {
            toast.success(`Scénario ${s.codeScenario} créé.`);
          } else {
            toast.success(`Scénario ${s.codeScenario} modifié.`);
          }
          setFormMode(null);
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      {confirmArchive && (
        <ConfirmDialog
          isOpen={confirmArchive !== null}
          onClose={() => setConfirmArchive(null)}
          onConfirm={handleArchiveConfirmed}
          title={`Archiver le scénario ${confirmArchive.codeScenario} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmArchive.codeScenario} — {confirmArchive.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Le scénario ne pourra plus être utilisé pour de nouvelles
                saisies. Les saisies déjà effectuées restent rattachées.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Cette action est irréversible.
              </p>
            </>
          }
          confirmText="Archiver"
          cancelText="Annuler"
          destructive
        />
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiNumberCardProps {
  label: string;
  value: number;
  color: string;
  testId: string;
}

function KpiNumberCard({
  label,
  value,
  color,
  testId,
}: KpiNumberCardProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="text-2xl font-medium tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

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

const TYPE_SCEN_CONFIG: Record<
  TypeScenario,
  { hex: string; bgHex: string; Icon: LucideIcon }
> = {
  optimiste: { hex: '#0F6E56', bgHex: '#0F6E561A', Icon: TrendingUp },
  central: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: Minus },
  pessimiste: { hex: '#DC2626', bgHex: '#DC26261A', Icon: TrendingDown },
  alternatif: { hex: '#5B4E91', bgHex: '#5B4E911A', Icon: Layers },
};

export function TypeScenarioBadge({
  type,
}: {
  type: TypeScenario;
}): JSX.Element {
  const cfg = TYPE_SCEN_CONFIG[type];
  const Icon = cfg.Icon;
  return (
    <span
      data-testid={`type-scen-badge-${type}`}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {libelleTypeScenario(type)}
    </span>
  );
}

function StatutScenarioBadge({
  statut,
}: {
  statut: StatutScenario;
}): JSX.Element {
  if (statut === 'actif') {
    return (
      <span
        data-testid="statut-scen-actif"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit',
          'bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)',
        )}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
          aria-hidden="true"
        />
        Actif
      </span>
    );
  }
  return (
    <span
      data-testid="statut-scen-archive"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Archivé
    </span>
  );
}
