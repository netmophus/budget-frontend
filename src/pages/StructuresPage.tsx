/**
 * StructuresPage (Lot 2.5A + Lot 7.3 V17 refonte Charte v1).
 *
 * Référentiel hiérarchique des structures organisationnelles
 * (entités juridiques, branches, directions, départements, agences).
 *
 * Refonte V17 (pattern unifié V11/V12/V14/V15/V16) :
 *  - Header custom : cercle Building2 catégorie config + titre + sous-titre
 *  - 5 KPI cards (Total actives / Entités jur. / Directions /
 *    Départements / Agences)
 *  - Barre de filtres dans cadre gris
 *  - Tableau grid CSS modernisé : indentation par niveau,
 *    `TypeStructureBadge` coloré, `PaysCell` (badge ISO + libellé),
 *    `StatutStructureBadge`
 *
 * Logique métier 100 % préservée : DetailDrawer, ConfirmDialog,
 * StructureFormDrawer, useRefSecondaireOptions, permission
 * REFERENTIEL.GERER, debounce search.
 */
import {
  Building2,
  CornerDownRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { StructureFormDrawer } from '@/components/structures/StructureFormDrawer';
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
  deleteStructure,
  getStructureHistorique,
  listStructures,
  type Structure,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import { libelleTypeStructure } from '@/lib/labels/referentiels';
import { libellePays } from '@/lib/labels/uemoa';

const ALL = '__all__';

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function StructuresPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');
  const { options: typeOptions } = useRefSecondaireOptions('type-structure');
  const { options: paysOptions } = useRefSecondaireOptions('pays');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pays, setPays] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [data, setData] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Structure | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Structure | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listStructures({
      page: 1,
      limit: 200,
      codePays: pays === ALL ? undefined : pays,
      typeStructure: type === ALL ? undefined : type,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger les structures');
      })
      .finally(() => setLoading(false));
  }, [pays, type, debouncedSearch, refreshKey]);

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (activesUniquement && !s.estActif) return false;
      return true;
    });
  }, [data, activesUniquement]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveauHierarchique !== b.niveauHierarchique) {
        return a.niveauHierarchique - b.niveauHierarchique;
      }
      return a.codeStructure.localeCompare(b.codeStructure);
    });
  }, [filtered]);

  // 5 KPI calculées sur data brut (filtres serveur appliqués).
  const kpi = useMemo(() => {
    const actives = data.filter((s) => s.estActif);
    const t = (s: Structure) => s.typeStructure;
    return {
      totalActives: actives.length,
      entites: actives.filter((s) => t(s) === 'entite_juridique').length,
      directions: actives.filter((s) => t(s) === 'direction').length,
      departements: actives.filter((s) => t(s) === 'departement').length,
      agences: actives.filter((s) => t(s) === 'agence').length,
    };
  }, [data]);

  async function handleDeleteConfirmed(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteStructure(confirmDelete.codeStructure);
      toast.success(
        `Structure ${confirmDelete.codeStructure} désactivée.`,
      );
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message ?? 'Désactivation refusée.';
      const text = Array.isArray(message) ? message.join(' ; ') : message;
      if (status === 409) {
        toast.error(text);
      } else if (status === 404) {
        toast.error('Structure introuvable.');
      } else {
        toast.error(text);
      }
      throw err;
    }
  }

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
              Structures organisationnelles
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Hiérarchie de la banque — entités juridiques, branches,
              directions, départements, agences
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setFormMode('create')}
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle structure
          </Button>
        )}
      </div>

      {/* ─── 5 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <KpiNumberCard label="Total actives" value={kpi.totalActives} color="#0F6E56" testId="kpi-struct-total-actives" />
        <KpiNumberCard label="Entités jur." value={kpi.entites} color="#5B4E91" testId="kpi-struct-entites" />
        <KpiNumberCard label="Directions" value={kpi.directions} color="#0C447C" testId="kpi-struct-directions" />
        <KpiNumberCard label="Départements" value={kpi.departements} color="#0F6E56" testId="kpi-struct-departements" />
        <KpiNumberCard label="Agences" value={kpi.agences} color="#BA7517" testId="kpi-struct-agences" />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_100px] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-structures" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-structures"
                placeholder="ex. audit"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pays-select" className="text-xs mb-1 block">
              Pays
            </Label>
            <Select value={pays} onValueChange={setPays}>
              <SelectTrigger id="pays-select" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {paysOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type-select" className="text-xs mb-1 block">
              Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type-select" className="h-9 bg-white">
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
            <Label className="text-xs mb-1 block">&nbsp;</Label>
            <div className="h-9 flex items-center text-xs text-(--muted-foreground)">
              {sorted.length} affichée{sorted.length > 1 ? 's' : ''}
            </div>
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
            Actives uniquement
          </label>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="struct-table"
      >
        <div className="grid grid-cols-[200px_1fr_140px_60px_140px_90px_120px] bg-(--secondary) px-4 py-2.5 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Type</ColumnHeader>
          <ColumnHeader>Niv.</ColumnHeader>
          <ColumnHeader>Pays</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>Validité</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucune structure ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          sorted.map((structure) => (
            <button
              key={structure.id}
              type="button"
              onClick={() => setSelected(structure)}
              data-testid={`struct-row-${structure.id}`}
              style={{
                paddingLeft: `${16 + (structure.niveauHierarchique - 1) * 16}px`,
              }}
              className="w-full text-left grid grid-cols-[200px_1fr_140px_60px_140px_90px_120px] pr-4 py-2.5 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
            >
              <div className="font-mono text-[13px]">
                {structure.codeStructure}
              </div>

              <div className="flex items-center gap-1.5">
                {structure.niveauHierarchique > 1 && (
                  <CornerDownRight
                    className="w-3 h-3 text-(--muted-foreground)/50 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="text-[13px]">{structure.libelle}</span>
                {structure.libelleCourt && (
                  <span className="text-(--muted-foreground) text-xs ml-1">
                    ({structure.libelleCourt})
                  </span>
                )}
              </div>

              <div>
                <TypeStructureBadge type={structure.typeStructure} />
              </div>

              <div className="text-[13px] text-(--muted-foreground)">
                {structure.niveauHierarchique}
              </div>

              <div>
                <PaysCell codeIso={structure.codePays} />
              </div>

              <div>
                <StatutStructureBadge actif={structure.estActif} />
              </div>

              <div className="text-xs text-(--muted-foreground)/70 tabular-nums">
                depuis {formatDateFr(structure.dateDebutValidite)}
              </div>
            </button>
          ))}
      </div>

      <DetailDrawer<Structure, Structure>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Structure ${selected.codeStructure}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <TypeStructureBadge type={selected.typeStructure} />
                  ),
                },
                {
                  label: 'Niveau hiérarchique',
                  value: selected.niveauHierarchique,
                },
                {
                  label: 'Pays',
                  value: selected.codePays
                    ? `${selected.codePays} — ${libellePays(selected.codePays)}`
                    : null,
                },
                { label: 'Libellé court', value: selected.libelleCourt },
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
                { label: 'Créée par', value: selected.utilisateurCreation },
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
                  Structure inactive — pour la réactiver, utilisez Modifier
                  puis cochez Actif.
                </span>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getStructureHistorique(selected.codeStructure)
            : undefined
        }
        renderHistoryRow={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">
                {row.libelle}
                {row.libelleCourt && (
                  <span className="text-(--muted-foreground) text-xs ml-2">
                    ({row.libelleCourt})
                  </span>
                )}
              </div>
              <div className="text-xs text-(--muted-foreground)">
                {libelleTypeStructure(row.typeStructure)} • niveau{' '}
                {row.niveauHierarchique}
                {row.codePays && ` • ${row.codePays}`}
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

      <StructureFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(structure) => {
          if (formMode === 'create') {
            toast.success(`Structure ${structure.codeStructure} créée.`);
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
          title={`Désactiver la structure ${confirmDelete.codeStructure} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeStructure} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Cette structure ne pourra plus être utilisée pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à cette structure dans l&apos;historique.
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

const TYPE_STRUCT_COLORS: Record<string, { bg: string; text: string }> = {
  entite_juridique: { bg: '#5B4E911A', text: '#5B4E91' },
  branche: { bg: '#0C447C0F', text: '#0C447C' },
  direction: { bg: '#0C447C1A', text: '#0C447C' },
  departement: { bg: '#0F6E561A', text: '#0F6E56' },
  agence: { bg: '#B05D3F1A', text: '#B05D3F' },
};

export function TypeStructureBadge({
  type,
}: {
  type: string;
}): JSX.Element {
  const cfg = TYPE_STRUCT_COLORS[type] ?? {
    bg: '#5F6B7A1A',
    text: '#5F6B7A',
  };
  return (
    <span
      data-testid={`type-struct-badge-${type}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      {libelleTypeStructure(type)}
    </span>
  );
}

function PaysCell({
  codeIso,
}: {
  codeIso: string | null;
}): JSX.Element {
  if (!codeIso) {
    return <span className="text-[13px] text-(--muted-foreground)/60">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center px-1.5 py-[1px] bg-(--secondary) border border-(--border) rounded font-mono text-[9px] font-bold text-(--muted-foreground) tracking-wider">
        {codeIso}
      </span>
      <span className="text-xs">{libellePays(codeIso)}</span>
    </div>
  );
}

function StatutStructureBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-struct-actif"
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
      data-testid="statut-struct-inactif"
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
