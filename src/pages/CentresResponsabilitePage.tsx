import { type ColumnDef } from '@tanstack/react-table';
import { Link as LinkIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  type CentreResponsabilite,
  type Structure,
  listCrs,
  listStructures,
} from '@/lib/api/referentiels';
import {
  badgeClassTypeCr,
  libelleTypeCr,
  shortTypeCr,
  TYPES_CR,
} from '@/lib/labels/referentiels';

const ALL = '__all__';

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** U+00A0 (espace insécable) × niveau pour indenter dans un Select. */
function indentSelectLabel(structure: Structure): string {
  const indent = '  '.repeat(
    Math.max(0, structure.niveauHierarchique - 1),
  );
  return `${indent}${structure.codeStructure}`;
}

export function CentresResponsabilitePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [structureFilter, setStructureFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [data, setData] = useState<CentreResponsabilite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [structuresForFilter, setStructuresForFilter] = useState<Structure[]>([]);

  // Charger la liste des structures pour alimenter le Select de filtre.
  useEffect(() => {
    listStructures({ page: 1, limit: 100 })
      .then((res) => setStructuresForFilter(res.items))
      .catch(() => {
        // non bloquant : le filtre Structure restera vide, mais la page
        // CR continue de s'afficher.
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
      typeCr: typeFilter === ALL ? undefined : typeFilter,
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
  }, [structureFilter, typeFilter, debouncedSearch]);

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

  // Tri client par niveau puis code pour la liste hiérarchique du Select.
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
        description="Mailles de saisie budgétaire rattachées aux structures."
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

        <div className="space-y-1">
          <Label htmlFor="type-cr-filter">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="type-cr-filter" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {TYPES_CR.map((t) => (
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
        data={data}
        total={total}
        page={1}
        limit={200}
        isLoading={loading}
        onPageChange={() => undefined}
      />
    </div>
  );
}
