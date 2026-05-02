import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Link as LinkIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
import { CrFormDrawer } from '@/components/centres-responsabilite/CrFormDrawer';
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
  const indent = '  '.repeat(
    Math.max(0, structure.niveauHierarchique - 1),
  );
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
  const [total, setTotal] = useState(0);
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
        // non bloquant
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
        setTotal(res.total);
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

  const columns: ColumnDef<CentreResponsabilite, unknown>[] = [
    {
      accessorKey: 'codeCr',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold">{row.original.codeCr}</span>
      ),
    },
    {
      accessorKey: 'libelle',
      header: 'Libellé',
      cell: ({ row }) => (
        <span>
          {row.original.libelle}
          {row.original.libelleCourt && (
            <span className="text-(--muted-foreground) text-xs ml-2">
              ({row.original.libelleCourt})
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'typeCr',
      header: 'Type',
      cell: ({ row }) => (
        <Badge
          className={badgeClassTypeCr(row.original.typeCr)}
          title={libelleTypeCr(row.original.typeCr)}
        >
          {shortTypeCr(row.original.typeCr)}
        </Badge>
      ),
    },
    {
      id: 'structure',
      header: 'Structure rattachée',
      cell: ({ row }) => {
        const sc = row.original.structureCourante;
        if (!sc) {
          return <span className="text-(--muted-foreground)">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-2">
            <span>{sc.libelle}</span>
            <button
              type="button"
              className="text-(--primary) hover:opacity-80"
              title={`Voir la structure ${sc.codeStructure}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(
                  `/referentiels/structures?search=${encodeURIComponent(sc.codeStructure)}`,
                );
              }}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        );
      },
    },
    {
      accessorKey: 'estActif',
      header: 'Statut',
      cell: ({ row }) =>
        row.original.estActif ? (
          <Badge variant="success">Actif</Badge>
        ) : (
          <Badge variant="secondary">Inactif</Badge>
        ),
    },
    {
      accessorKey: 'dateDebutValidite',
      header: 'Validité',
      cell: ({ row }) => (
        <span className="text-sm text-(--muted-foreground)">
          depuis {formatDateFr(row.original.dateDebutValidite)}
        </span>
      ),
    },
  ];

  const sortedStructures = [...structuresForFilter].sort((a, b) => {
    if (a.niveauHierarchique !== b.niveauHierarchique) {
      return a.niveauHierarchique - b.niveauHierarchique;
    }
    return a.codeStructure.localeCompare(b.codeStructure);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Centres de responsabilité"
        description="Axes d'imputation budgétaire (SCD2 + rattachement structure)."
        actions={
          canGerer ? (
            <Button onClick={() => setFormMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau centre de responsabilité
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-cr">Recherche libellé</Label>
          <Input
            id="search-cr"
            placeholder="ex. retail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="structure-filter">Structure</Label>
          <Select value={structureFilter} onValueChange={setStructureFilter}>
            <SelectTrigger id="structure-filter" className="w-72">
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

        <div className="space-y-1 w-56">
          <Label htmlFor="type-cr-filter">Type CR</Label>
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

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={activesUniquement}
            onChange={(e) => setActivesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Actifs uniquement
        </label>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        total={total}
        page={1}
        limit={200}
        isLoading={loading}
        onPageChange={() => undefined}
        onRowClick={setSelected}
      />

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
                  <LinkIcon className="h-3.5 w-3.5" />
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
                restent rattachées à ce CR dans l'historique.
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
