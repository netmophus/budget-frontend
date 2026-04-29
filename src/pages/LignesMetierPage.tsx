import { type ColumnDef } from '@tanstack/react-table';
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
  type LigneMetier,
  getLigneMetierHistorique,
  listLignesMetier,
} from '@/lib/api/referentiels';

const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function LignesMetierPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<LigneMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LigneMetier | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

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
  }, [page, limit, debouncedSearch]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeLigneMetier.localeCompare(b.codeLigneMetier);
    });
  }, [data]);

  const columns: ColumnDef<LigneMetier, unknown>[] = [
    {
      accessorKey: 'codeLigneMetier',
      header: 'Code',
      cell: ({ row }) => (
        <span
          className="font-mono font-bold"
          style={{ paddingLeft: `${(row.original.niveau - 1) * 16}px` }}
        >
          {row.original.codeLigneMetier}
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
      accessorKey: 'niveau',
      header: 'Niveau',
      cell: ({ row }) => (
        <span className="font-mono block text-center">
          {row.original.niveau}
        </span>
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
        title="Lignes de métier"
        description="Axes d'activité bancaire (retail, corporate, trésorerie, support)."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-lm">Recherche libellé</Label>
          <Input
            id="search-lm"
            placeholder="ex. retail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="lm-limit">Lignes / page</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger id="lm-limit" className="w-24">
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
          )
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
    </div>
  );
}
