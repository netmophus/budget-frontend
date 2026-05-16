/**
 * CentresResponsabilitePage (Lot 2.5F + Lot 7.3 V11 refonte Charte v1).
 *
 * Référentiel des centres de responsabilité (axes d'imputation
 * budgétaire). SCD2 + rattachement structure.
 *
 * Refonte V11 :
 *  - Header custom : cercle d'icône Building2 catégorie config (gris
 *    ardoise) + titre + sous-titre + bouton CTA bleu nuit dark
 *  - 4 KPI cards (Total actifs / CDP / CDC / CDR) calculés `useMemo`
 *  - Barre de filtres dans cadre gris léger (Search icône, sélecteurs
 *    h-9 fond blanc, checkbox alignée)
 *  - Tableau grid CSS modernisé (au lieu de DataTable shadcn) avec
 *    sous-composants `TypeCRBadge` et `StatutBadge`
 *
 * Logique métier 100 % préservée : DetailDrawer (clic ligne),
 * ConfirmDialog (désactivation), CrFormDrawer (création/édition),
 * filtrage actif uniquement, navigation vers structures, permissions.
 */
import { AxiosError } from 'axios';
import {
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { CrFormDrawer } from '@/components/centres-responsabilite/CrFormDrawer';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
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
  type CentreResponsabilite,
  deleteCr,
  getCrHistorique,
  listCrs,
  listStructures,
  type Structure,
  type TypeCr,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassTypeCr,
  libelleTypeCr,
  shortTypeCr,
} from '@/lib/labels/referentiels';

const ALL = '__all__';

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

function indentSelectLabel(structure: Structure): string {
  const indent = '  '.repeat(Math.max(0, structure.niveauHierarchique - 1));
  return `${indent}${structure.codeStructure}`;
}

export function CentresResponsabilitePage() {
  const navigate = useNavigate();
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [structureFilter, setStructureFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [data, setData] = useState<CentreResponsabilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [structuresForFilter, setStructuresForFilter] = useState<Structure[]>(
    [],
  );

  const [selected, setSelected] = useState<CentreResponsabilite | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<CentreResponsabilite | null>(null);

  useEffect(() => {
    listStructures({ page: 1, limit: 100 })
      .then((res) => setStructuresForFilter(res.items))
      .catch(() => {
        // non bloquant — le filtre Structure se contentera de "Toutes".
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listCrs({
      page: 1,
      limit: 200,
      codeStructure: structureFilter === ALL ? undefined : structureFilter,
      typeCr: typeFilter || undefined,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger les centres de responsabilité');
      })
      .finally(() => setLoading(false));
  }, [structureFilter, typeFilter, debouncedSearch, refreshKey]);

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
      await deleteCr(confirmDelete.codeCr);
      toast.success(`CR ${confirmDelete.codeCr} désactivé.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('CR introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  // Filtre actives uniquement appliqué côté client.
  const filtered = useMemo(() => {
    return data.filter((cr) => {
      if (activesUniquement && !cr.estActif) return false;
      return true;
    });
  }, [data, activesUniquement]);

  // 4 KPI calculés sur les rows actuels (filtrage serveur appliqué).
  const kpi = useMemo(() => {
    const actifs = data.filter((cr) => cr.estActif);
    return {
      totalActifs: actifs.length,
      cdp: actifs.filter((cr) => cr.typeCr === 'cdp').length,
      cdc: actifs.filter((cr) => cr.typeCr === 'cdc').length,
      cdr: actifs.filter((cr) => cr.typeCr === 'cdr').length,
    };
  }, [data]);

  const sortedStructures = [...structuresForFilter].sort((a, b) => {
    if (a.niveauHierarchique !== b.niveauHierarchique) {
      return a.niveauHierarchique - b.niveauHierarchique;
    }
    return a.codeStructure.localeCompare(b.codeStructure);
  });

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
            <Building2 className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Centres de responsabilité
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Axes d&apos;imputation budgétaire (SCD2 + rattachement structure)
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau CR
          </Button>
        )}
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <KpiCard
          label="Total CR actifs"
          value={kpi.totalActifs}
          color="#0F6E56"
          testId="kpi-cr-total-actifs"
        />
        <KpiCard
          label="CDP (profit)"
          value={kpi.cdp}
          color="#0C447C"
          testId="kpi-cr-cdp"
        />
        <KpiCard
          label="CDC (coût)"
          value={kpi.cdc}
          color="#BA7517"
          testId="kpi-cr-cdc"
        />
        <KpiCard
          label="CDR (revenu)"
          value={kpi.cdr}
          color="#5B4E91"
          testId="kpi-cr-cdr"
        />
      </div>

      {/* ─── Barre de filtres dans cadre gris ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2.5 mb-4 p-3 bg-(--secondary) border border-(--border) rounded-md">
        <div>
          <Label htmlFor="search-cr" className="text-xs mb-1 block">
            Recherche libellé
          </Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="search-cr"
              placeholder="ex. retail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-white"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="structure-filter" className="text-xs mb-1 block">
            Structure
          </Label>
          <Select value={structureFilter} onValueChange={setStructureFilter}>
            <SelectTrigger id="structure-filter" className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {sortedStructures.map((s) => (
                <SelectItem key={s.codeStructure} value={s.codeStructure}>
                  <span className="font-mono">{indentSelectLabel(s)}</span>
                  <span className="ml-2 text-(--muted-foreground)">
                    {s.libelle}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type-cr-filter" className="text-xs mb-1 block">
            Type CR
          </Label>
          <RefSecondaireSelect
            id="type-cr-filter"
            refKey="type-cr"
            value={typeFilter}
            onValueChange={setTypeFilter}
            labelChamp="les types de CR"
            placeholder="Tous"
            showWarningIfDisabled={false}
          />
        </div>

        <div className="flex items-end pb-1">
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
        data-testid="cr-table"
      >
        <div className="grid grid-cols-[180px_1fr_70px_1fr_90px_130px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Code
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Libellé
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Type
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Structure rattachée
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
            Aucun centre de responsabilité ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          filtered.map((cr) => (
            <button
              key={cr.id}
              type="button"
              onClick={() => setSelected(cr)}
              data-testid={`cr-row-${cr.id}`}
              className="w-full text-left grid grid-cols-[180px_1fr_70px_1fr_90px_130px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors cursor-pointer"
            >
              <div className="font-mono text-xs font-medium">{cr.codeCr}</div>
              <div className="text-[13px]">
                {cr.libelle}
                {cr.libelleCourt && (
                  <span className="text-(--muted-foreground) text-xs ml-2">
                    ({cr.libelleCourt})
                  </span>
                )}
              </div>
              <div>
                <TypeCRBadge type={cr.typeCr} />
              </div>
              <div className="text-[13px] text-(--muted-foreground) inline-flex items-center gap-1.5">
                {cr.structureCourante?.libelle ?? '—'}
                {cr.structureCourante && (
                  <ExternalLink
                    className="w-3 h-3 opacity-50"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <StatutBadge actif={cr.estActif} />
              </div>
              <div className="text-xs text-(--muted-foreground)/70 tabular-nums">
                depuis {formatDateFr(cr.dateDebutValidite)}
              </div>
            </button>
          ))}
      </div>

      <DetailDrawer<CentreResponsabilite, CentreResponsabilite>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `CR ${selected.codeCr}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <Badge className={badgeClassTypeCr(selected.typeCr)}>
                      {libelleTypeCr(selected.typeCr)}
                    </Badge>
                  ),
                },
                { label: 'Libellé court', value: selected.libelleCourt },
                {
                  label: 'Structure rattachée',
                  value: selected.structureCourante
                    ? `${selected.structureCourante.codeStructure} — ${selected.structureCourante.libelle}`
                    : '—',
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
              {selected.structureCourante && (
                <button
                  type="button"
                  className="text-sm text-(--primary) hover:underline inline-flex items-center gap-1"
                  onClick={() =>
                    navigate(
                      `/referentiels/structures?search=${encodeURIComponent(selected.structureCourante!.codeStructure)}`,
                    )
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Voir la structure : {selected.structureCourante.codeStructure}
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
                      CR inactif — pour le réactiver, utilisez Modifier
                      puis cochez Actif.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected ? () => getCrHistorique(selected.codeCr) : undefined
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

      <CrFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(cr) => {
          if (formMode === 'create') {
            toast.success(`CR ${cr.codeCr} créé.`);
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
          title={`Désactiver le CR ${confirmDelete.codeCr} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeCr} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Ce centre ne pourra plus être utilisé pour de nouvelles
                saisies budgétaires. Les saisies déjà effectuées
                restent rattachées à ce CR dans l&apos;historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si ce CR est référencé par des saisies budgétaires
                courantes, le backend refusera la désactivation (409).
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

interface KpiCardProps {
  label: string;
  value: number;
  /** Hex de couleur (charte v1) appliqué à la valeur. */
  color: string;
  testId: string;
}

function KpiCard({ label, value, color, testId }: KpiCardProps): JSX.Element {
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

const TYPE_CR_COLORS: Record<TypeCr, { bg: string; text: string }> = {
  cdc: { bg: '#BA75171A', text: '#BA7517' }, // ambre 10 %
  cdp: { bg: '#0C447C1A', text: '#0C447C' }, // bleu nuit 10 %
  cdr: { bg: '#5B4E911A', text: '#5B4E91' }, // violet 10 %
  autre: { bg: '#5F6B7A1A', text: '#5F6B7A' }, // gris ardoise 10 %
};

export function TypeCRBadge({ type }: { type: TypeCr }): JSX.Element {
  const cfg = TYPE_CR_COLORS[type];
  return (
    <span
      data-testid={`type-cr-badge-${type}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
    >
      {shortTypeCr(type)}
    </span>
  );
}

function StatutBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-cr-actif"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
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
      data-testid="statut-cr-inactif"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactif
    </span>
  );
}
