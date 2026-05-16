/**
 * VersionsPage (Lot 3.1 + Lot 7.3 V19 refonte Charte v1).
 *
 * Référentiel des versions budgétaires (cycles avec workflow
 * Brouillon → Soumis → Validé → Publié — Lot 3.5).
 *
 * Refonte V19 (pattern unifié V11–V18) :
 *  - Header custom : cercle Layers catégorie BUDGET (bleu nuit) +
 *    titre + sous-titre + CTA "Nouvelle version" bleu nuit
 *  - 4 KPI workflow cards (Brouillons / Soumis / Validés / Publiés)
 *    avec pastille colorée
 *  - Barre de filtres dans cadre gris (Search + Exercice + Statut +
 *    Type)
 *  - Tableau grid CSS modernisé avec sous-composants
 *    `TypeVersionBadge` (4 types) et `StatutVersionBadge` (icône
 *    Pencil/Send/CircleCheck/Lock) + `ActionVersionCell`
 *  - Pagination habillée cohérente
 *
 * Logique métier 100 % préservée : DetailDrawer + WorkflowActions +
 * WorkflowTimeline, ConfirmDialog (delete), VersionFormDrawer,
 * permissions BUDGET.SAISIR / REFERENTIEL.GERER, hook Q9 pour le
 * scénario auto-créé.
 */
import { AxiosError } from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Eye,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { VersionFormDrawer } from '@/components/budget/VersionFormDrawer';
import { WorkflowActions } from '@/components/budget/WorkflowActions';
import { WorkflowTimeline } from '@/components/budget/WorkflowTimeline';
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
  type CreateVersionResponse,
  deleteVersion,
  listVersions,
  type StatutVersion,
  type TypeVersion,
  type Version,
} from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  formatDateFr,
  libelleStatutVersion,
  libelleTypeVersion,
  STATUTS_VERSION,
  TYPES_VERSION,
} from '@/lib/labels/budget';
import { cn } from '@/lib/utils';

const ALL = '__all__';
const DEFAULT_LIMIT = 20;
const EXERCICES = [2025, 2026, 2027, 2028];

export function VersionsPage() {
  const navigate = useNavigate();
  const canSaisir = useHasPermission('BUDGET.SAISIR');
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exerciceFilter, setExerciceFilter] = useState<string>(ALL);
  const [statutFilter, setStatutFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Version[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Version | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Version | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, exerciceFilter, statutFilter, typeFilter]);

  useEffect(() => {
    setLoading(true);
    listVersions({
      page,
      limit: DEFAULT_LIMIT,
      exerciceFiscal:
        exerciceFilter === ALL ? undefined : Number(exerciceFilter),
      statut:
        statutFilter === ALL ? undefined : (statutFilter as StatutVersion),
      typeVersion:
        typeFilter === ALL ? undefined : (typeFilter as TypeVersion),
    })
      .then((res) => {
        const term = debouncedSearch.trim().toLowerCase();
        const items = term
          ? res.items.filter(
              (v) =>
                v.codeVersion.toLowerCase().includes(term) ||
                v.libelle.toLowerCase().includes(term),
            )
          : res.items;
        setData(items);
        setTotal(term ? items.length : res.total);
      })
      .catch(() => toast.error('Impossible de charger les versions'))
      .finally(() => setLoading(false));
  }, [
    page,
    exerciceFilter,
    statutFilter,
    typeFilter,
    debouncedSearch,
    refreshKey,
  ]);

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

  async function handleDeleteConfirmed(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteVersion(confirmDelete.id);
      toast.success(`Version ${confirmDelete.codeVersion} supprimée.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(
          message ||
            'Version non supprimable : seul le statut Brouillon autorise la suppression.',
        );
      } else {
        toast.error(message || 'Suppression refusée.');
      }
      throw err;
    }
  }

  function handleVersionSuccess(
    v: Version | CreateVersionResponse,
  ): void {
    if (formMode === 'create') {
      const created = v as CreateVersionResponse;
      toast.success(`Version ${created.codeVersion} créée.`);
      if (created.scenarioAutoCreeCode) {
        toast.info(
          `Scénario ${created.scenarioAutoCreeCode} créé automatiquement (hook Q9).`,
        );
      }
    } else {
      toast.success(`Version ${v.codeVersion} modifiée.`);
    }
    setFormMode(null);
    setSelected(null);
    setRefreshKey((k) => k + 1);
  }

  // 4 KPI workflow calculées sur la page courante.
  const kpi = useMemo(() => {
    const c = (s: StatutVersion) => data.filter((v) => v.statut === s).length;
    return {
      brouillons: c('ouvert'),
      soumis: c('soumis'),
      valides: c('valide'),
      publies: c('gele'),
    };
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT));

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#0C447C1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <Layers className="w-5 h-5" style={{ color: '#0C447C' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Versions budgétaires
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Cycles budgétaires — workflow Brouillon → Soumis → Validé →
              Publié
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle version
          </Button>
        )}
      </div>

      {/* ─── 4 KPI workflow ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <KpiWorkflowCard
          label="Brouillons"
          value={kpi.brouillons}
          colorHex="#5F6B7A"
          testId="kpi-vers-brouillons"
        />
        <KpiWorkflowCard
          label="Soumis"
          value={kpi.soumis}
          colorHex="#BA7517"
          testId="kpi-vers-soumis"
        />
        <KpiWorkflowCard
          label="Validés"
          value={kpi.valides}
          colorHex="#2E5BAE"
          testId="kpi-vers-valides"
        />
        <KpiWorkflowCard
          label="Publiés (gelés)"
          value={kpi.publies}
          colorHex="#0F6E56"
          testId="kpi-vers-publies"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="search-versions" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-versions"
                placeholder="ex. budget initial"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="exercice-filter" className="text-xs mb-1 block">
              Exercice
            </Label>
            <Select value={exerciceFilter} onValueChange={setExerciceFilter}>
              <SelectTrigger id="exercice-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {EXERCICES.map((y) => (
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
            <Label htmlFor="statut-filter" className="text-xs mb-1 block">
              Statut
            </Label>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger id="statut-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {STATUTS_VERSION.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type-filter" className="text-xs mb-1 block">
              Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-filter" className="h-9 bg-white">
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

      {/* ─── Tableau grid CSS ──────────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="vers-table"
      >
        <div className="grid grid-cols-[280px_1fr_140px_90px_120px_120px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Type</ColumnHeader>
          <ColumnHeader>Exercice</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>Action</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucune version ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          data.map((version) => (
            <div
              key={version.id}
              onClick={() => setSelected(version)}
              data-testid={`vers-row-${version.id}`}
              className="grid grid-cols-[280px_1fr_140px_90px_120px_120px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors cursor-pointer"
            >
              <div
                className="font-mono text-xs truncate pr-2"
                title={version.codeVersion}
              >
                {version.codeVersion}
              </div>
              <div className="text-[13px] truncate pr-2">
                {version.libelle}
              </div>
              <div>
                <TypeVersionBadge type={version.typeVersion} />
              </div>
              <div className="text-[13px] tabular-nums font-medium">
                {version.exerciceFiscal}
              </div>
              <div>
                <StatutVersionBadge statut={version.statut} />
              </div>
              <div>
                <ActionVersionCell
                  version={version}
                  canSaisir={canSaisir}
                  onConsulter={() => setSelected(version)}
                  onSaisir={() =>
                    navigate(
                      `/budget/versions/${version.codeVersion}/saisie`,
                    )
                  }
                />
              </div>
            </div>
          ))}
      </div>

      {/* ─── Pagination ────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex justify-between items-center mt-3.5">
          <div className="text-xs text-(--muted-foreground)">
            {total} ligne{total > 1 ? 's' : ''} — page {page} sur {totalPages}
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

      <DetailDrawer<Version, never>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Version ${selected.codeVersion}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: <TypeVersionBadge type={selected.typeVersion} />,
                },
                { label: 'Exercice fiscal', value: selected.exerciceFiscal },
                {
                  label: 'Statut',
                  value: <StatutVersionBadge statut={selected.statut} />,
                },
                {
                  label: 'Date de gel',
                  value: selected.dateGel
                    ? formatDateFr(selected.dateGel)
                    : null,
                },
                { label: 'Utilisateur de gel', value: selected.utilisateurGel },
                { label: 'Commentaire', value: selected.commentaire },
                {
                  label: 'Créée le',
                  value: formatDateFr(selected.dateCreation),
                },
                { label: 'Créée par', value: selected.utilisateurCreation },
                {
                  label: 'Modifiée le',
                  value: selected.dateModification
                    ? formatDateFr(selected.dateModification)
                    : null,
                },
                {
                  label: 'Modifiée par',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected ? (
            <div className="space-y-4">
              <WorkflowActions
                version={selected}
                onTransitioned={(next) => {
                  setSelected(next);
                  setRefreshKey((k) => k + 1);
                }}
              />
              {selected.statut === 'ouvert' && canSaisir && (
                <Button
                  onClick={() =>
                    navigate(
                      `/budget/versions/${selected.codeVersion}/saisie`,
                    )
                  }
                  className="w-full bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Saisir des lignes pour cette version
                </Button>
              )}
              {canGerer && selected.statut === 'ouvert' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFormMode('edit')}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              )}
              {canGerer && selected.statut !== 'ouvert' && (
                <span className="text-xs text-(--muted-foreground) block">
                  Statut « {libelleStatutVersion(selected.statut)} » —
                  modification et suppression bloquées (workflow Lot 3.5).
                </span>
              )}
              <div>
                <h4 className="mb-2 text-sm font-semibold">Historique</h4>
                <WorkflowTimeline version={selected} />
              </div>
            </div>
          ) : null
        }
      />

      <VersionFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={handleVersionSuccess}
      />

      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirmed}
          title={`Supprimer la version ${confirmDelete.codeVersion} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeVersion} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                La version et ses éventuelles lignes budgétaires seront
                supprimées définitivement.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Seuls les statuts « Brouillon » autorisent la suppression. Le
                backend rejettera (409) sinon.
              </p>
            </>
          }
          confirmText="Supprimer"
          cancelText="Annuler"
          destructive
        />
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiWorkflowCardProps {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}

function KpiWorkflowCard({
  label,
  value,
  colorHex,
  testId,
}: KpiWorkflowCardProps): JSX.Element {
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

const TYPE_VERSION_CONFIG: Record<
  TypeVersion,
  { hex: string; bgHex: string }
> = {
  budget_initial: { hex: '#0C447C', bgHex: '#0C447C1A' },
  reforecast_1: { hex: '#BA7517', bgHex: '#BA75171A' },
  reforecast_2: { hex: '#9C5F11', bgHex: '#9C5F111A' },
  atterrissage: { hex: '#0F6E56', bgHex: '#0F6E561A' },
  // Lot 5.3 — reforecast trimestriel publication-écrasement.
  reforecast: { hex: '#BA7517', bgHex: '#BA75171A' },
};

export function TypeVersionBadge({
  type,
}: {
  type: TypeVersion;
}): JSX.Element {
  const cfg = TYPE_VERSION_CONFIG[type];
  return (
    <span
      data-testid={`type-vers-badge-${type}`}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      {libelleTypeVersion(type)}
    </span>
  );
}

const STATUT_VERSION_CONFIG: Record<
  StatutVersion,
  { hex: string; bgHex: string; Icon: LucideIcon }
> = {
  ouvert: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: Pencil },
  soumis: { hex: '#BA7517', bgHex: '#BA75171A', Icon: Send },
  valide: { hex: '#2E5BAE', bgHex: '#2E5BAE1A', Icon: CircleCheck },
  gele: { hex: '#0F6E56', bgHex: '#0F6E561A', Icon: Lock },
};

export function StatutVersionBadge({
  statut,
}: {
  statut: StatutVersion;
}): JSX.Element {
  const cfg = STATUT_VERSION_CONFIG[statut];
  const Icon = cfg.Icon;
  return (
    <span
      data-testid={`statut-vers-badge-${statut}`}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {libelleStatutVersion(statut)}
    </span>
  );
}

interface ActionVersionCellProps {
  version: Version;
  canSaisir: boolean;
  onConsulter: () => void;
  onSaisir: () => void;
}

function ActionVersionCell({
  version,
  canSaisir,
  onConsulter,
  onSaisir,
}: ActionVersionCellProps): JSX.Element {
  // 'ouvert' (Brouillon) + permission → action principale Saisir
  if (version.statut === 'ouvert' && canSaisir) {
    return (
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onSaisir();
        }}
        className="h-7 px-2.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1 text-xs"
      >
        <Pencil className="w-3 h-3" />
        Saisir
      </Button>
    );
  }

  // Tout le reste : consulter (ouvre le drawer détail).
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onConsulter();
      }}
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        'text-(--muted-foreground) hover:text-(--foreground) transition-colors',
      )}
    >
      <Eye className="w-3 h-3" />
      Détails
    </button>
  );
}
