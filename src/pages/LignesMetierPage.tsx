/**
 * LignesMetierPage (Lot 2.5D + Lot 7.3 V14 refonte Charte v1).
 *
 * Référentiel hiérarchique des lignes métier (axes d'activité
 * bancaire). SCD2 + auto-référence parent.
 *
 * Refonte V14 (pattern unifié avec CR/Comptes V11/V12) :
 *  - Header custom : cercle LayoutGrid catégorie config (gris ardoise)
 *    + titre + sous-titre court + bouton CTA bleu nuit dark
 *  - 3 KPI cards (Total actives / Racines / Niveaux max)
 *  - Barre de filtres dans cadre gris (Search + selects + checkboxes)
 *  - Tableau grid CSS modernisé avec sous-composants `NiveauBadge`
 *    (pastille bleu nuit numérotée) et `StatutLigneBadge`
 *    (« Active »/« Inactive » au féminin avec dot coloré)
 *
 * Logique métier 100 % préservée : DetailDrawer (clic ligne),
 * ConfirmDialog (désactivation 409), LigneMetierFormDrawer
 * (création/édition), permission REFERENTIEL.GERER, debounce
 * recherche, pagination.
 */
import { AxiosError } from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { LigneMetierFormDrawer } from '@/components/lignes-metier/LigneMetierFormDrawer';
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
  deleteLigneMetier,
  getLigneMetierHistorique,
  type LigneMetier,
  listLignesMetier,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const ALL_NIVEAUX = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];
const NIVEAUX = [1, 2, 3, 4];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function LignesMetierPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [niveauFilter, setNiveauFilter] = useState<string>(ALL_NIVEAUX);
  const [racinesUniquement, setRacinesUniquement] = useState(false);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<LigneMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<LigneMetier | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LigneMetier | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [niveauFilter, racinesUniquement, activesUniquement, debouncedSearch, limit]);

  useEffect(() => {
    setLoading(true);
    listLignesMetier({
      page,
      limit,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les lignes de métier');
      })
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, refreshKey]);

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
      await deleteLigneMetier(confirmDelete.codeLigneMetier);
      toast.success(
        `Ligne métier ${confirmDelete.codeLigneMetier} désactivée.`,
      );
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Ligne métier introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  const filtered = useMemo(() => {
    return data.filter((l) => {
      if (racinesUniquement && l.fkLigneMetierParent !== null) return false;
      if (activesUniquement && !l.estActif) return false;
      if (niveauFilter !== ALL_NIVEAUX && String(l.niveau) !== niveauFilter)
        return false;
      return true;
    });
  }, [data, racinesUniquement, activesUniquement, niveauFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeLigneMetier.localeCompare(b.codeLigneMetier);
    });
  }, [filtered]);

  // 3 KPI sur data brut.
  const kpi = useMemo(() => {
    const actives = data.filter((l) => l.estActif);
    return {
      totalActives: actives.length,
      racines: actives.filter((l) => l.fkLigneMetierParent === null).length,
      niveauMax: data.reduce((m, l) => Math.max(m, l.niveau), 0),
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
            <LayoutGrid className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Lignes métier
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Référentiel hiérarchique des axes d&apos;activité bancaire (SCD2)
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle ligne métier
          </Button>
        )}
      </div>

      {/* ─── 3 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <KpiNumberCard
          label="Total actives"
          value={kpi.totalActives}
          color="#0F6E56"
          testId="kpi-lm-total-actives"
        />
        <KpiNumberCard
          label="Racines"
          value={kpi.racines}
          color="#0C447C"
          testId="kpi-lm-racines"
        />
        <KpiNumberCard
          label="Niveaux max"
          value={kpi.niveauMax}
          color="#BA7517"
          testId="kpi-lm-niveau-max"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_100px] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-lm" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-lm"
                placeholder="ex. retail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="niveau-lm" className="text-xs mb-1 block">
              Niveau
            </Label>
            <Select value={niveauFilter} onValueChange={setNiveauFilter}>
              <SelectTrigger id="niveau-lm" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_NIVEAUX}>Tous</SelectItem>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Niveau {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lm-limit" className="text-xs mb-1 block">
              Lignes / page
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger id="lm-limit" className="h-9 bg-white">
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
              checked={racinesUniquement}
              onChange={(e) => setRacinesUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Racines uniquement
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={activesUniquement}
              onChange={(e) => setActivesUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Actives uniquement
          </label>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="lm-table"
      >
        <div className="grid grid-cols-[220px_1fr_80px_1fr_100px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Code
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Libellé
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Niveau
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Parent
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Statut
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucune ligne métier ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          sorted.map((ligne) => (
            <button
              key={ligne.id}
              type="button"
              onClick={() => setSelected(ligne)}
              data-testid={`lm-row-${ligne.id}`}
              style={{ paddingLeft: `${16 + (ligne.niveau - 1) * 16}px` }}
              className="w-full text-left grid grid-cols-[220px_1fr_80px_1fr_100px] pr-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
            >
              <div className="font-mono text-[13px] font-medium text-(--miznas-bleu-nuit)">
                {ligne.codeLigneMetier}
              </div>
              <div
                className={cn(
                  'text-[13px]',
                  ligne.niveau === 1 && 'font-semibold',
                )}
              >
                {ligne.libelle}
              </div>
              <div>
                <NiveauBadge niveau={ligne.niveau} />
              </div>
              <div className="text-[13px] text-(--muted-foreground)">
                {ligne.parentCourant?.codeLigneMetier ?? (
                  <span className="text-(--muted-foreground)/60">—</span>
                )}
              </div>
              <div>
                <StatutLigneBadge actif={ligne.estActif} />
              </div>
            </button>
          ))}
      </div>

      {/* ─── Pagination ─────────────────────────────────────────── */}
      {totalPages > 1 && (
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              Suivant
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <DetailDrawer<LigneMetier, LigneMetier>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Ligne métier ${selected.codeLigneMetier}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                { label: 'Niveau', value: selected.niveau },
                {
                  label: 'Statut',
                  value: selected.estActif ? 'Active' : 'Inactive',
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
          selected ? (
            <div className="space-y-3">
              {selected.parentCourant && (
                <button
                  type="button"
                  className="text-sm text-(--primary) hover:underline"
                  onClick={() => {
                    if (!selected?.parentCourant) return;
                    listLignesMetier({
                      search: selected.parentCourant.codeLigneMetier,
                      page: 1,
                      limit: 1,
                    })
                      .then((res) => {
                        const parent = res.items.find(
                          (l) =>
                            l.codeLigneMetier ===
                            selected.parentCourant!.codeLigneMetier,
                        );
                        if (parent) setSelected(parent);
                      })
                      .catch(() =>
                        toast.error('Impossible de charger la ligne parente'),
                      );
                  }}
                >
                  Voir le parent : {selected.parentCourant.codeLigneMetier} —{' '}
                  {selected.parentCourant.libelle}
                </button>
              )}
              {canGerer && (
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
                      Ligne métier inactive — pour la réactiver, utilisez
                      Modifier puis cochez Active.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getLigneMetierHistorique(selected.codeLigneMetier)
            : undefined
        }
        renderHistoryRow={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{row.libelle}</div>
              <div className="text-xs text-(--muted-foreground)">
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

      <LigneMetierFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(ligne) => {
          if (formMode === 'create') {
            toast.success(`Ligne métier ${ligne.codeLigneMetier} créée.`);
          }
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
          title={`Désactiver la ligne métier ${confirmDelete.codeLigneMetier} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeLigneMetier} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Cette ligne ne pourra plus être utilisée pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à cette ligne dans l&apos;historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si cette ligne a des enfants courants, le backend
                refusera la désactivation (409) — désactivez d&apos;abord
                les descendants.
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
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-medium tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function NiveauBadge({ niveau }: { niveau: number }): JSX.Element {
  return (
    <span
      data-testid={`niveau-badge-${niveau}`}
      className="inline-flex items-center justify-center w-[22px] h-[22px] bg-(--miznas-bleu-nuit) text-white rounded text-[11px] font-bold tabular-nums"
    >
      {niveau}
    </span>
  );
}

function StatutLigneBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-lm-actif"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
          aria-hidden="true"
        />
        Active
      </span>
    );
  }
  return (
    <span
      data-testid="statut-lm-inactif"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactive
    </span>
  );
}
