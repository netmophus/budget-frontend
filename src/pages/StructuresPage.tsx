import { type ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/common/DataTable';
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
import { listStructures, type Structure } from '@/lib/api/referentiels';
import {
  badgeClassTypeStructure,
  libelleTypeStructure,
  TYPES_STRUCTURE,
} from '@/lib/labels/referentiels';
import { libellePays, UEMOA_COUNTRIES } from '@/lib/labels/uemoa';

const ALL = '__all__';

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const columns: ColumnDef<Structure, unknown>[] = [
  {
    accessorKey: 'codeStructure',
    header: 'Code',
    cell: ({ row }) => (
      <span
        className="font-mono font-bold"
        style={{
          paddingLeft: `${(row.original.niveauHierarchique - 1) * 24}px`,
        }}
      >
        {row.original.codeStructure}
      </span>
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
    accessorKey: 'typeStructure',
    header: 'Type',
    cell: ({ row }) => (
      <Badge className={badgeClassTypeStructure(row.original.typeStructure)}>
        {libelleTypeStructure(row.original.typeStructure)}
      </Badge>
    ),
  },
  {
    accessorKey: 'niveauHierarchique',
    header: 'Niveau',
    cell: ({ row }) => (
      <span className="font-mono">{row.original.niveauHierarchique}</span>
    ),
  },
  {
    accessorKey: 'codePays',
    header: 'Pays',
    cell: ({ row }) => {
      if (!row.original.codePays) {
        return <span className="text-(--muted-foreground)">—</span>;
      }
      return (
        <span>
          <span className="font-mono text-xs mr-1">{row.original.codePays}</span>
          <span className="text-(--muted-foreground)">
            {libellePays(row.original.codePays)}
          </span>
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

export function StructuresPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pays, setPays] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [data, setData] = useState<Structure[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les structures');
      })
      .finally(() => setLoading(false));
  }, [pays, type, debouncedSearch]);

  // Tri client : niveau ASC puis code ASC pour rendre la table lisible
  // comme un arbre indenté.
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.niveauHierarchique !== b.niveauHierarchique) {
        return a.niveauHierarchique - b.niveauHierarchique;
      }
      return a.codeStructure.localeCompare(b.codeStructure);
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Structures organisationnelles"
        description="Hiérarchie de la banque (entités juridiques, branches, directions, départements, agences)."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-structures">Recherche libellé</Label>
          <Input
            id="search-structures"
            placeholder="ex. retail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pays-select">Pays</Label>
          <Select value={pays} onValueChange={setPays}>
            <SelectTrigger id="pays-select" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {UEMOA_COUNTRIES.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="type-select">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type-select" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {TYPES_STRUCTURE.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.libelle}
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
        page={1}
        limit={200}
        isLoading={loading}
        onPageChange={() => undefined}
      />
    </div>
  );
}
