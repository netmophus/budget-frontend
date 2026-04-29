import { type ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
  type CategorieSegment,
  type Segment,
  getSegmentHistorique,
  listSegments,
} from '@/lib/api/referentiels';
import {
  badgeClassCategorieSegment,
  CATEGORIES_SEGMENT,
  libelleCategorieSegment,
} from '@/lib/labels/referentiels';

const ALL = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function SegmentsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Segment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Segment | null>(null);

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
        categorieFilter === ALL ? undefined : (categorieFilter as CategorieSegment),
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
  }, [page, limit, categorieFilter, debouncedSearch]);

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
        description="Segmentation plate (6 catégories UEMOA : particuliers, professionnels, PME, grandes entreprises, institutionnels, secteur public)."
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
              {CATEGORIES_SEGMENT.map((c) => (
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
    </div>
  );
}
