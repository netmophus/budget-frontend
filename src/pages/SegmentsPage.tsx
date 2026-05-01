import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
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
import {
  badgeClassCategorieSegment,
  libelleCategorieSegment,
} from '@/lib/labels/referentiels';

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
  // Catégories alimentées dynamiquement depuis ref_categorie_segment
  // (Lot 2.5-bis-D — pattern selects dynamiques).
  const { options: categorieOptions } = useRefSecondaireOptions(
    'categorie-segment',
  );

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<string>(ALL);
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
  }, [categorieFilter, debouncedSearch, limit]);

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
      toast.success(
        `Segment ${confirmDelete.codeSegment} désactivé.`,
      );
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

  const columns: ColumnDef<Segment, unknown>[] = [
    {
      accessorKey: 'codeSegment',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold">{row.original.codeSegment}</span>
      ),
    },
    { accessorKey: 'libelle', header: 'Libellé' },
    {
      accessorKey: 'categorie',
      header: 'Catégorie',
      cell: ({ row }) => (
        <Badge className={badgeClassCategorieSegment(row.original.categorie)}>
          {libelleCategorieSegment(row.original.categorie)}
        </Badge>
      ),
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Segments clientèle"
        description="Référentiel des segments commerciaux et catégories clientèle (SCD2 plat). Cliquez sur une ligne pour voir le détail et l'historique."
        actions={
          canGerer ? (
            <Button onClick={() => setFormMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau segment
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-segments">Recherche libellé</Label>
          <Input
            id="search-segments"
            placeholder="ex. PME"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="categorie-filter">Catégorie</Label>
          <Select value={categorieFilter} onValueChange={setCategorieFilter}>
            <SelectTrigger id="categorie-filter" className="w-56">
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

        <div className="space-y-1">
          <Label htmlFor="seg-limit">Lignes / page</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger id="seg-limit" className="w-24">
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

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

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
                    <Badge
                      className={badgeClassCategorieSegment(selected.categorie)}
                    >
                      {libelleCategorieSegment(selected.categorie)}
                    </Badge>
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
                restent rattachées à ce segment dans l'historique.
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
