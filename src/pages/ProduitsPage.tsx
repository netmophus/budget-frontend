import { type ColumnDef } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  type Produit,
  type TypeProduit,
  getProduitHistorique,
  listProduits,
} from '@/lib/api/referentiels';
import {
  badgeClassTypeProduit,
  libelleTypeProduit,
  TYPES_PRODUIT,
} from '@/lib/labels/referentiels';

const ALL = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

function CheckOrDash({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-4 w-4 text-green-600 mx-auto" />
  ) : (
    <span className="text-(--muted-foreground) block text-center">—</span>
  );
}

export function ProduitsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [porteursUniquement, setPorteursUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Produit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Produit | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, porteursUniquement, debouncedSearch, limit]);

  useEffect(() => {
    setLoading(true);
    listProduits({
      page,
      limit,
      typeProduit:
        typeFilter === ALL ? undefined : (typeFilter as TypeProduit),
      search: debouncedSearch || undefined,
      estPorteurInterets: porteursUniquement ? true : undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les produits');
      })
      .finally(() => setLoading(false));
  }, [page, limit, typeFilter, porteursUniquement, debouncedSearch]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeProduit.localeCompare(b.codeProduit);
    });
  }, [data]);

  const columns: ColumnDef<Produit, unknown>[] = [
    {
      accessorKey: 'codeProduit',
      header: 'Code',
      cell: ({ row }) => (
        <span
          className="font-mono font-bold"
          style={{ paddingLeft: `${(row.original.niveau - 1) * 16}px` }}
        >
          {row.original.codeProduit}
        </span>
      ),
    },
    {
      accessorKey: 'libelle',
      header: 'Libellé',
      cell: ({ row }) => (
        <span
          style={{ paddingLeft: `${(row.original.niveau - 1) * 16}px` }}
          className={row.original.niveau === 1 ? 'font-semibold' : ''}
        >
          {row.original.libelle}
        </span>
      ),
    },
    {
      accessorKey: 'typeProduit',
      header: 'Type',
      cell: ({ row }) => (
        <Badge className={badgeClassTypeProduit(row.original.typeProduit)}>
          {libelleTypeProduit(row.original.typeProduit)}
        </Badge>
      ),
    },
    {
      accessorKey: 'niveau',
      header: 'Niveau',
      cell: ({ row }) => (
        <span className="font-mono block text-center">
          {row.original.niveau}
        </span>
      ),
    },
    {
      accessorKey: 'estPorteurInterets',
      header: "Porteur d'intérêts",
      cell: ({ row }) => <CheckOrDash value={row.original.estPorteurInterets} />,
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
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Produits bancaires"
        description="Catalogue des produits crédit / dépôt / service / marché. Hiérarchie 3 niveaux."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-produits">Recherche libellé</Label>
          <Input
            id="search-produits"
            placeholder="ex. découvert"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="type-produit-filter">Type produit</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="type-produit-filter" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {TYPES_PRODUIT.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={porteursUniquement}
            onChange={(e) => setPorteursUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Porteurs d'intérêts uniquement
        </label>

        <div className="space-y-1">
          <Label htmlFor="prod-limit">Lignes / page</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger id="prod-limit" className="w-24">
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
        data={sorted}
        total={total}
        page={page}
        limit={limit}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

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
          selected?.parentCourant && (
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
                        p.codeProduit === selected.parentCourant!.codeProduit,
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
          )
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
    </div>
  );
}
