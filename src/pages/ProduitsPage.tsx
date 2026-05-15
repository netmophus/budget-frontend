/**
 * ProduitsPage (Lot 2.5C + Lot 7.3 V15 refonte Charte v1).
 *
 * Catalogue des produits bancaires (crédit / dépôt / service / marché /
 * autre). Hiérarchie 4 niveaux + SCD2.
 *
 * Refonte V15 (pattern unifié V11/V12/V14) :
 *  - Header custom : cercle Package catégorie config + titre + sous-titre
 *  - 5 KPI cards (Total actifs / Crédits / Dépôts / Services / Porteurs PNB)
 *  - Barre de filtres dans cadre gris (2 lignes)
 *  - Tableau grid CSS modernisé : indentation par niveau,
 *    `TypeProduitBadge` coloré, check ambre porteur PNB,
 *    `StatutProduitBadge` unifié
 *
 * Logique métier 100 % préservée : DetailDrawer, ConfirmDialog,
 * ProduitFormDrawer, useRefSecondaireOptions pour les types,
 * permission REFERENTIEL.GERER, debounce search, pagination.
 */
import { AxiosError } from 'axios';
import {
  Check,
  CornerDownRight,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { ProduitFormDrawer } from '@/components/produits/ProduitFormDrawer';
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
  deleteProduit,
  getProduitHistorique,
  listProduits,
  type Produit,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import {
  badgeClassTypeProduit,
  libelleTypeProduit,
} from '@/lib/labels/referentiels';

const ALL = '__all__';
const ALL_NIVEAUX = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];
const NIVEAUX = [1, 2, 3, 4];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function ProduitsPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');
  const { options: typeOptions } = useRefSecondaireOptions('type-produit');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [niveauFilter, setNiveauFilter] = useState<string>(ALL_NIVEAUX);
  const [porteursUniquement, setPorteursUniquement] = useState(false);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Produit | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Produit | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    typeFilter,
    niveauFilter,
    porteursUniquement,
    activesUniquement,
    debouncedSearch,
    limit,
  ]);

  useEffect(() => {
    setLoading(true);
    listProduits({
      page,
      limit,
      typeProduit:
        typeFilter === ALL ? undefined : (typeFilter as never),
      search: debouncedSearch || undefined,
      estPorteurInterets: porteursUniquement ? true : undefined,
    })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger les produits');
      })
      .finally(() => setLoading(false));
  }, [page, limit, typeFilter, porteursUniquement, debouncedSearch, refreshKey]);

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
      await deleteProduit(confirmDelete.codeProduit);
      toast.success(`Produit ${confirmDelete.codeProduit} désactivé.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Produit introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (activesUniquement && !p.estActif) return false;
      if (niveauFilter !== ALL_NIVEAUX && String(p.niveau) !== niveauFilter)
        return false;
      return true;
    });
  }, [data, activesUniquement, niveauFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeProduit.localeCompare(b.codeProduit);
    });
  }, [filtered]);

  // 5 KPI cards calculées sur data brut.
  const kpi = useMemo(() => {
    const actifs = data.filter((p) => p.estActif);
    return {
      totalActifs: actifs.length,
      credits: actifs.filter((p) => p.typeProduit === 'credit').length,
      depots: actifs.filter((p) => p.typeProduit === 'depot').length,
      services: actifs.filter((p) => p.typeProduit === 'service').length,
      porteursPnb: actifs.filter((p) => p.estPorteurInterets).length,
    };
  }, [data]);

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
            <Package className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Produits bancaires
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Catalogue des produits crédit / dépôt / service / marché —
              hiérarchie 4 niveaux
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau produit
          </Button>
        )}
      </div>

      {/* ─── 5 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <KpiNumberCard label="Total actifs" value={kpi.totalActifs} color="#0F6E56" testId="kpi-prod-total-actifs" />
        <KpiNumberCard label="Crédits" value={kpi.credits} color="#DC2626" testId="kpi-prod-credits" />
        <KpiNumberCard label="Dépôts" value={kpi.depots} color="#0F6E56" testId="kpi-prod-depots" />
        <KpiNumberCard label="Services" value={kpi.services} color="#0C447C" testId="kpi-prod-services" />
        <KpiNumberCard label="Porteurs PNB" value={kpi.porteursPnb} color="#BA7517" testId="kpi-prod-porteurs" />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_100px] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-produits" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-produits"
                placeholder="ex. découvert"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="type-produit-filter" className="text-xs mb-1 block">
              Type produit
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-produit-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="niveau-prod-filter" className="text-xs mb-1 block">
              Niveau
            </Label>
            <Select value={niveauFilter} onValueChange={setNiveauFilter}>
              <SelectTrigger id="niveau-prod-filter" className="h-9 bg-white">
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
            <Label htmlFor="prod-limit" className="text-xs mb-1 block">
              Lignes / page
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger id="prod-limit" className="h-9 bg-white">
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
              checked={porteursUniquement}
              onChange={(e) => setPorteursUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Porteurs d&apos;intérêts uniquement
          </label>
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
        data-testid="prod-table"
      >
        <div className="grid grid-cols-[200px_1fr_90px_60px_100px_90px] bg-(--secondary) px-4 py-2.5 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Type</ColumnHeader>
          <ColumnHeader>Niv.</ColumnHeader>
          <ColumnHeader>Porteur PNB</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucun produit ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          sorted.map((produit) => (
            <button
              key={produit.id}
              type="button"
              onClick={() => setSelected(produit)}
              data-testid={`prod-row-${produit.id}`}
              style={{
                paddingLeft: `${16 + (produit.niveau - 1) * 16}px`,
              }}
              className="w-full text-left grid grid-cols-[200px_1fr_90px_60px_100px_90px] pr-4 py-2.5 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
            >
              <div className="font-mono text-[13px]">{produit.codeProduit}</div>

              <div className="flex items-center gap-1.5">
                {produit.niveau > 1 && (
                  <CornerDownRight
                    className="w-3 h-3 text-(--muted-foreground)/50 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="text-[13px]">{produit.libelle}</span>
              </div>

              <div>
                <TypeProduitBadge type={produit.typeProduit} />
              </div>

              <div className="text-[13px] text-(--muted-foreground)">
                {produit.niveau}
              </div>

              <div>
                {produit.estPorteurInterets ? (
                  <Check
                    className="w-4 h-4 text-(--miznas-ambre)"
                    aria-label="Porteur d'intérêts (PNB)"
                  />
                ) : (
                  <span className="text-[13px] text-(--muted-foreground)/60">
                    —
                  </span>
                )}
              </div>

              <div>
                <StatutProduitBadge actif={produit.estActif} />
              </div>
            </button>
          ))}
      </div>

      <DetailDrawer<Produit, Produit>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Produit ${selected.codeProduit}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <Badge className={badgeClassTypeProduit(selected.typeProduit)}>
                      {libelleTypeProduit(selected.typeProduit)}
                    </Badge>
                  ),
                },
                { label: 'Niveau', value: selected.niveau },
                {
                  label: "Porteur d'intérêts",
                  value: selected.estPorteurInterets ? 'Oui' : 'Non',
                },
                {
                  label: 'Statut',
                  value: selected.estActif ? 'Actif' : 'Inactif',
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
                    listProduits({
                      search: selected.parentCourant.codeProduit,
                      page: 1,
                      limit: 1,
                    })
                      .then((res) => {
                        const parent = res.items.find(
                          (p) =>
                            p.codeProduit ===
                            selected.parentCourant!.codeProduit,
                        );
                        if (parent) setSelected(parent);
                      })
                      .catch(() =>
                        toast.error('Impossible de charger le produit parent'),
                      );
                  }}
                >
                  Voir le parent : {selected.parentCourant.codeProduit} —{' '}
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
                      Produit inactif — pour le réactiver, utilisez Modifier
                      puis cochez Actif.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getProduitHistorique(selected.codeProduit)
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

      <ProduitFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(produit) => {
          if (formMode === 'create') {
            toast.success(`Produit ${produit.codeProduit} créé.`);
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
          title={`Désactiver le produit ${confirmDelete.codeProduit} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeProduit} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Ce produit ne pourra plus être utilisé pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à ce produit dans l&apos;historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si ce produit a des enfants courants, le backend
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

const TYPE_PRODUIT_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  credit: { bg: '#DC26261A', text: '#DC2626' },
  depot: { bg: '#0F6E561A', text: '#0F6E56' },
  service: { bg: '#0C447C1A', text: '#0C447C' },
  marche: { bg: '#5B4E911A', text: '#5B4E91' },
  autre: { bg: '#5F6B7A1A', text: '#5F6B7A' },
};

export function TypeProduitBadge({
  type,
}: {
  type: string;
}): JSX.Element {
  const cfg = TYPE_PRODUIT_COLORS[type] ?? TYPE_PRODUIT_COLORS.autre!;
  return (
    <span
      data-testid={`type-prod-badge-${type}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      {libelleTypeProduit(type)}
    </span>
  );
}

function StatutProduitBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-prod-actif"
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
      data-testid="statut-prod-inactif"
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
