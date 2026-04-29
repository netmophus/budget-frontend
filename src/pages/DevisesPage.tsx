import { type ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listDevises, type Devise } from '@/lib/api/referentiels';

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

const columns: ColumnDef<Devise, unknown>[] = [
  {
    accessorKey: 'codeIso',
    header: 'Code ISO',
    cell: ({ row }) => (
      <span className="font-mono font-bold">{row.original.codeIso}</span>
    ),
  },
  { accessorKey: 'libelle', header: 'Libellé' },
  {
    accessorKey: 'symbole',
    header: 'Symbole',
    cell: ({ row }) => (
      <span className="block text-center">{row.original.symbole ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'nbDecimales',
    header: 'Décimales',
    cell: ({ row }) => (
      <span className="block text-center">{row.original.nbDecimales}</span>
    ),
  },
  {
    accessorKey: 'estDevisePivot',
    header: 'Pivot',
    cell: ({ row }) =>
      row.original.estDevisePivot ? (
        <Badge className="bg-amber-500 text-white border-transparent">
          PIVOT
        </Badge>
      ) : null,
  },
  {
    accessorKey: 'estActive',
    header: 'Statut',
    cell: ({ row }) =>
      row.original.estActive ? (
        <Badge variant="success">Actif</Badge>
      ) : (
        <Badge variant="secondary">Inactif</Badge>
      ),
  },
  {
    accessorKey: 'dateCreation',
    header: 'Créé le',
    cell: ({ row }) => formatDateFr(row.original.dateCreation),
  },
];

export function DevisesPage() {
  const [codeFilter, setCodeFilter] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');
  const [actifsUniquement, setActifsUniquement] = useState(true);
  const [data, setData] = useState<Devise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCode(codeFilter), 300);
    return () => clearTimeout(t);
  }, [codeFilter]);

  useEffect(() => {
    setLoading(true);
    listDevises({
      page: 1,
      limit: 100,
      codeIso: debouncedCode || undefined,
      estActive: actifsUniquement || undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les devises');
      })
      .finally(() => setLoading(false));
  }, [debouncedCode, actifsUniquement]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devises"
        description="Référentiel des devises BCEAO/UEMOA et devises convertibles."
      />

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="code-filter">Code ISO</Label>
          <Input
            id="code-filter"
            placeholder="ex. XOF"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value.toUpperCase())}
            maxLength={3}
            className="w-40"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={actifsUniquement}
            onChange={(e) => setActifsUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Actives uniquement
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={1}
        limit={100}
        isLoading={loading}
        onPageChange={() => undefined}
      />
    </div>
  );
}
