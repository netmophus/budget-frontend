import { type ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
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
  listVersions,
  type StatutVersion,
  type TypeVersion,
  type Version,
} from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassStatutVersion,
  badgeClassTypeVersion,
  formatDateFr,
  libelleStatutVersion,
  libelleTypeVersion,
  STATUTS_VERSION,
  TYPES_VERSION,
} from '@/lib/labels/budget';

const ALL = '__all__';
const DEFAULT_LIMIT = 20;
const EXERCICES = [2025, 2026, 2027, 2028];

export function VersionsPage() {
  const navigate = useNavigate();
  const canSaisir = useHasPermission('BUDGET.SAISIR');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exerciceFilter, setExerciceFilter] = useState<string>(ALL);
  const [statutFilter, setStatutFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Version[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Version | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, exerciceFilter, statutFilter, typeFilter]);

  useEffect(() => {
    setLoading(true);
    listVersions({
      page,
      limit: DEFAULT_LIMIT,
      exerciceFiscal:
        exerciceFilter === ALL ? undefined : Number(exerciceFilter),
      statut: statutFilter === ALL ? undefined : (statutFilter as StatutVersion),
      typeVersion: typeFilter === ALL ? undefined : (typeFilter as TypeVersion),
    })
      .then((res) => {
        // Filtre client sur le libellé/code (pas de search côté backend pour
        // dim_version au Lot 3.1).
        const term = debouncedSearch.trim().toLowerCase();
        const items = term
          ? res.items.filter(
              (v) =>
                v.codeVersion.toLowerCase().includes(term) ||
                v.libelle.toLowerCase().includes(term),
            )
          : res.items;
        setData(items);
        setTotal(term ? items.length : res.total);
      })
      .catch(() => toast.error('Impossible de charger les versions'))
      .finally(() => setLoading(false));
  }, [page, exerciceFilter, statutFilter, typeFilter, debouncedSearch]);

  const columns: ColumnDef<Version, unknown>[] = [
    {
      accessorKey: 'codeVersion',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold">{row.original.codeVersion}</span>
      ),
    },
    {
      accessorKey: 'libelle',
      header: 'Libellé',
    },
    {
      accessorKey: 'typeVersion',
      header: 'Type',
      cell: ({ row }) => (
        <Badge className={badgeClassTypeVersion(row.original.typeVersion)}>
          {libelleTypeVersion(row.original.typeVersion)}
        </Badge>
      ),
    },
    {
      accessorKey: 'exerciceFiscal',
      header: 'Exercice',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.exerciceFiscal}</span>
      ),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: ({ row }) => (
        <Badge className={badgeClassStatutVersion(row.original.statut)}>
          {libelleStatutVersion(row.original.statut)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const v = row.original;
        if (v.statut !== 'ouvert' || !canSaisir) {
          return <span className="text-(--muted-foreground) text-xs">—</span>;
        }
        return (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/budget/versions/${v.codeVersion}/saisie`);
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" /> Saisir
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Versions de budget"
        description="Versions de budget par exercice fiscal. Cliquez sur Saisir pour ajouter des lignes à une version statut « ouvert »."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-versions">Recherche libellé / code</Label>
          <Input
            id="search-versions"
            placeholder="ex. budget initial"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="exercice-filter">Exercice</Label>
          <Select value={exerciceFilter} onValueChange={setExerciceFilter}>
            <SelectTrigger id="exercice-filter" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {EXERCICES.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="statut-filter">Statut</Label>
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger id="statut-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {STATUTS_VERSION.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="type-filter">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="type-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {TYPES_VERSION.map((t) => (
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
        page={page}
        limit={DEFAULT_LIMIT}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

      <DetailDrawer<Version, never>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Version ${selected.codeVersion}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <Badge className={badgeClassTypeVersion(selected.typeVersion)}>
                      {libelleTypeVersion(selected.typeVersion)}
                    </Badge>
                  ),
                },
                { label: 'Exercice fiscal', value: selected.exerciceFiscal },
                {
                  label: 'Statut',
                  value: (
                    <Badge className={badgeClassStatutVersion(selected.statut)}>
                      {libelleStatutVersion(selected.statut)}
                    </Badge>
                  ),
                },
                {
                  label: 'Date de gel',
                  value: selected.dateGel ? formatDateFr(selected.dateGel) : null,
                },
                {
                  label: 'Utilisateur de gel',
                  value: selected.utilisateurGel,
                },
                {
                  label: 'Commentaire',
                  value: selected.commentaire,
                },
                {
                  label: 'Créée le',
                  value: formatDateFr(selected.dateCreation),
                },
                { label: 'Créée par', value: selected.utilisateurCreation },
                {
                  label: 'Modifiée le',
                  value: selected.dateModification
                    ? formatDateFr(selected.dateModification)
                    : null,
                },
                {
                  label: 'Modifiée par',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected && selected.statut === 'ouvert' && canSaisir ? (
            <Button
              onClick={() =>
                navigate(`/budget/versions/${selected.codeVersion}/saisie`)
              }
              className="w-full"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Saisir des lignes pour cette version
            </Button>
          ) : null
        }
      />
    </div>
  );
}
