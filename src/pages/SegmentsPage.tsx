/**
 * SegmentsPage (Lot 2.5B + Lot 7.3 V16 refonte Charte v1).
 *
 * Référentiel des segments commerciaux (catégories clientèle).
 * SCD2 plat (pas de hiérarchie).
 *
 * Refonte V16 (pattern unifié V11/V12/V14/V15) :
 *  - Header custom : cercle Target catégorie config + titre + sous-titre
 *  - 5 KPI cards (Total actifs / Particuliers / Entreprises /
 *    Institutionnel / Autres)
 *  - Barre de filtres dans cadre gris
 *  - Tableau grid CSS modernisé avec sous-composants `CategorieBadge`
 *    (6 variantes colorées) + `StatutSegmentBadge`
 *
 * Logique métier 100 % préservée : DetailDrawer, ConfirmDialog,
 * SegmentFormDrawer, useRefSecondaireOptions pour catégories,
 * permission REFERENTIEL.GERER, debounce search, pagination.
 */
import { AxiosError } from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { SegmentFormDrawer } from '@/components/segments/SegmentFormDrawer';
import { Badge } from '@/components/ui/badge';
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
  deleteSegment,
  getSegmentHistorique,
  listSegments,
  type Segment,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import { libelleCategorieSegment } from '@/lib/labels/referentiels';

const ALL = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

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

export function SegmentsPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');
  const { options: categorieOptions } = useRefSecondaireOptions(
    'categorie-segment',
  );

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<string>(ALL);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Segment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Segment | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Segment | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [categorieFilter, activesUniquement, debouncedSearch, limit]);

  useEffect(() => {
    setLoading(true);
    listSegments({
      page,
      limit,
      categorie:
        categorieFilter === ALL ? undefined : (categorieFilter as never),
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les segments');
      })
      .finally(() => setLoading(false));
  }, [page, limit, categorieFilter, debouncedSearch, refreshKey]);

  async function handleDeleteConfirmed(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteSegment(confirmDelete.codeSegment);
      toast.success(`Segment ${confirmDelete.codeSegment} désactivé.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Segment introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (activesUniquement && !s.estActif) return false;
      return true;
    });
  }, [data, activesUniquement]);

  // 5 KPI cards calculées sur data brut.
  const kpi = useMemo(() => {
    const actifs = data.filter((s) => s.estActif);
    const cat = (s: Segment) => s.categorie;
    return {
      totalActifs: actifs.length,
      particuliers: actifs.filter((s) => cat(s) === 'particulier').length,
      entreprises: actifs.filter(
        (s) => cat(s) === 'pme' || cat(s) === 'grande_entreprise',
      ).length,
      institutionnel: actifs.filter((s) => cat(s) === 'institutionnel').length,
      autres: actifs.filter(
        (s) =>
          ![
            'particulier',
            'pme',
            'grande_entreprise',
            'institutionnel',
          ].includes(cat(s)),
      ).length,
    };
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#5F6B7A1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <Target className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Segments clientèle
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Référentiel des segments commerciaux et catégories clientèle
              (SCD2 plat)
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau segment
          </Button>
        )}
      </div>

      {/* ─── 5 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <KpiNumberCard label="Total actifs" value={kpi.totalActifs} color="#0F6E56" testId="kpi-seg-total-actifs" />
        <KpiNumberCard label="Particuliers" value={kpi.particuliers} color="#0C447C" testId="kpi-seg-particuliers" />
        <KpiNumberCard label="Entreprises" value={kpi.entreprises} color="#0F6E56" testId="kpi-seg-entreprises" />
        <KpiNumberCard label="Institutionnel" value={kpi.institutionnel} color="#5B4E91" testId="kpi-seg-institutionnel" />
        <KpiNumberCard label="Autres" value={kpi.autres} color="#BA7517" testId="kpi-seg-autres" />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_100px] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-segments" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-segments"
                placeholder="ex. PME"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="categorie-filter" className="text-xs mb-1 block">
              Catégorie
            </Label>
            <Select value={categorieFilter} onValueChange={setCategorieFilter}>
              <SelectTrigger id="categorie-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {categorieOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="seg-limit" className="text-xs mb-1 block">
              Lignes / page
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger id="seg-limit" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
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
              checked={activesUniquement}
              onChange={(e) => setActivesUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Actifs uniquement
          </label>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="seg-table"
      >
        <div className="grid grid-cols-[200px_1fr_160px_90px_130px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Code
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Libellé
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Catégorie
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Statut
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Validité
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucun segment ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          filtered.map((segment) => (
            <button
              key={segment.id}
              type="button"
              onClick={() => setSelected(segment)}
              data-testid={`seg-row-${segment.id}`}
              className="w-full text-left grid grid-cols-[200px_1fr_160px_90px_130px] px-4 py-2.5 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
            >
              <div className="font-mono text-[13px]">{segment.codeSegment}</div>
              <div className="text-[13px]">{segment.libelle}</div>
              <div>
                <CategorieBadge categorie={segment.categorie} />
              </div>
              <div>
                <StatutSegmentBadge actif={segment.estActif} />
              </div>
              <div className="text-xs text-(--muted-foreground)/70 tabular-nums">
                depuis {formatDateFr(segment.dateDebutValidite)}
              </div>
            </button>
          ))}
      </div>

      {/* ─── Pagination ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-3.5">
          <div className="text-xs text-(--muted-foreground)">
            {total} segment{total > 1 ? 's' : ''} — page {page} sur {totalPages}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              Suivant
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <DetailDrawer<Segment, Segment>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Segment ${selected.codeSegment}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Catégorie',
                  value: (
                    <CategorieBadge categorie={selected.categorie} />
                  ),
                },
                {
                  label: 'Statut',
                  value: selected.estActif ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  ),
                },
                {
                  label: 'Validité',
                  value: `depuis ${formatDateFr(selected.dateDebutValidite)}${
                    selected.dateFinValidite
                      ? ` jusqu'au ${formatDateFr(selected.dateFinValidite)}`
                      : ''
                  }`,
                },
                {
                  label: 'Version courante',
                  value: selected.versionCourante ? 'Oui' : 'Non',
                },
                { label: 'Créé par', value: selected.utilisateurCreation },
                {
                  label: 'Dernière modification',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected && canGerer ? (
            <div className="flex items-center gap-2">
              {selected.estActif && (
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
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Désactiver
                  </Button>
                </>
              )}
              {!selected.estActif && (
                <span className="text-xs text-(--muted-foreground)">
                  Segment inactif — pour le réactiver, utilisez Modifier
                  puis cochez Actif.
                </span>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getSegmentHistorique(selected.codeSegment)
            : undefined
        }
        renderHistoryRow={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{row.libelle}</div>
              <div className="text-xs text-(--muted-foreground)">
                {libelleCategorieSegment(row.categorie)}
                {' • '}
                du {formatDateFr(row.dateDebutValidite)}
                {row.dateFinValidite
                  ? ` au ${formatDateFr(row.dateFinValidite)}`
                  : " à aujourd'hui"}
              </div>
            </div>
            {row.versionCourante ? (
              <Badge variant="success">Courante</Badge>
            ) : (
              <Badge variant="secondary">Historique</Badge>
            )}
          </div>
        )}
      />

      <SegmentFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={() => {
          setFormMode(null);
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirmed}
          title={`Désactiver le segment ${confirmDelete.codeSegment} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeSegment} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Ce segment ne pourra plus être utilisé pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à ce segment dans l&apos;historique.
              </p>
            </>
          }
          confirmText="Désactiver"
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
      className="bg-white border border-(--border) rounded-md p-2.5 px-3"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className="text-xl font-medium tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

const CATEGORIE_COLORS: Record<string, { bg: string; text: string }> = {
  particulier: { bg: '#0C447C1A', text: '#0C447C' },
  pme: { bg: '#0F6E561A', text: '#0F6E56' },
  grande_entreprise: { bg: '#5B4E911A', text: '#5B4E91' },
  professionnel: { bg: '#B05D3F1A', text: '#B05D3F' },
  institutionnel: { bg: '#5B4E911A', text: '#5B4E91' },
  secteur_public: { bg: '#BA75171A', text: '#BA7517' },
};

export function CategorieBadge({
  categorie,
}: {
  categorie: string;
}): JSX.Element {
  const cfg = CATEGORIE_COLORS[categorie] ?? {
    bg: '#5F6B7A1A',
    text: '#5F6B7A',
  };
  return (
    <span
      data-testid={`cat-badge-${categorie}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      {libelleCategorieSegment(categorie)}
    </span>
  );
}

function StatutSegmentBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-seg-actif"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
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
      data-testid="statut-seg-inactif"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactif
    </span>
  );
}

