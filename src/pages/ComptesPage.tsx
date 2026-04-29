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
  type Compte,
  getCompteHistorique,
  listComptes,
} from '@/lib/api/referentiels';
import {
  badgeClassClasseCompte,
  CLASSES_COMPTE,
  libelleSensCompte,
} from '@/lib/labels/referentiels';

const ALL = '__all__';
const DEFAULT_LIMIT = 50;

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

const PAGE_SIZES = [20, 50, 100];

export function ComptesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState<string>(ALL);
  const [feuillesUniquement, setFeuillesUniquement] = useState(false);
  const [porteursUniquement, setPorteursUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Compte[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Compte | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page → 1 quand un filtre change.
  useEffect(() => {
    setPage(1);
  }, [classeFilter, feuillesUniquement, porteursUniquement, debouncedSearch, limit]);

  useEffect(() => {
    setLoading(true);
    listComptes({
      page,
      limit,
      classe: classeFilter === ALL ? undefined : Number(classeFilter),
      search: debouncedSearch || undefined,
      // « feuilles uniquement » = est_compte_collectif=false
      estCompteCollectif: feuillesUniquement ? false : undefined,
      estPorteurInterets: porteursUniquement ? true : undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger les comptes');
      })
      .finally(() => setLoading(false));
  }, [
    page,
    limit,
    classeFilter,
    feuillesUniquement,
    porteursUniquement,
    debouncedSearch,
  ]);

  // Tri client par niveau ASC puis code ASC pour la lecture en arbre.
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeCompte.localeCompare(b.codeCompte);
    });
  }, [data]);

  const columns: ColumnDef<Compte, unknown>[] = [
    {
      accessorKey: 'codeCompte',
      header: 'Code',
      cell: ({ row }) => (
        <span
          className="font-mono font-bold"
          style={{ paddingLeft: `${(row.original.niveau - 1) * 16}px` }}
        >
          {row.original.codeCompte}
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
      accessorKey: 'classe',
      header: 'Classe',
      cell: ({ row }) => (
        <Badge className={badgeClassClasseCompte(row.original.classe)}>
          {row.original.classe}
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
      accessorKey: 'sens',
      header: 'Sens',
      cell: ({ row }) =>
        row.original.sens ? (
          <Badge
            variant="secondary"
            title={libelleSensCompte(row.original.sens)}
          >
            {row.original.sens}
          </Badge>
        ) : (
          <span className="text-(--muted-foreground) block text-center">—</span>
        ),
    },
    {
      accessorKey: 'codePosteBudgetaire',
      header: 'Poste budgétaire',
      cell: ({ row }) =>
        row.original.codePosteBudgetaire ? (
          <span className="font-mono text-xs">
            {row.original.codePosteBudgetaire}
          </span>
        ) : (
          <span className="text-(--muted-foreground)">—</span>
        ),
    },
    {
      accessorKey: 'estCompteCollectif',
      header: 'Collectif',
      cell: ({ row }) => <CheckOrDash value={row.original.estCompteCollectif} />,
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
        title="Comptes — PCB UMOA Révisé"
        description="Plan comptable bancaire UMOA révisé. Hiérarchie 4 niveaux (classe → sous-classe → poste → compte détaillé)."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-comptes">Recherche libellé</Label>
          <Input
            id="search-comptes"
            placeholder="ex. salaires"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="classe-filter">Classe PCB</Label>
          <Select value={classeFilter} onValueChange={setClasseFilter}>
            <SelectTrigger id="classe-filter" className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {CLASSES_COMPTE.map((c) => (
                <SelectItem key={c.value} value={String(c.value)}>
                  {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={feuillesUniquement}
            onChange={(e) => setFeuillesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Comptes feuilles uniquement
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={porteursUniquement}
            onChange={(e) => setPorteursUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Porteurs d'intérêts
        </label>

        <div className="space-y-1">
          <Label htmlFor="limit-select">Lignes / page</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v))}
          >
            <SelectTrigger id="limit-select" className="w-24">
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

      <DetailDrawer<Compte, Compte>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Compte ${selected.codeCompte}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                { label: 'Classe', value: selected.classe },
                { label: 'Sous-classe', value: selected.sousClasse },
                { label: 'Niveau', value: selected.niveau },
                {
                  label: 'Sens',
                  value: selected.sens
                    ? `${selected.sens} — ${libelleSensCompte(selected.sens)}`
                    : null,
                },
                {
                  label: 'Poste budgétaire',
                  value: selected.codePosteBudgetaire,
                },
                {
                  label: 'Collectif',
                  value: selected.estCompteCollectif ? 'Oui' : 'Non',
                },
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
                // Recharger en cliquant sur le parent
                listComptes({
                  search: selected.parentCourant.codeCompte,
                  page: 1,
                  limit: 1,
                })
                  .then((res) => {
                    const parent = res.items.find(
                      (c) =>
                        c.codeCompte === selected.parentCourant!.codeCompte,
                    );
                    if (parent) setSelected(parent);
                  })
                  .catch(() =>
                    toast.error('Impossible de charger le compte parent'),
                  );
              }}
            >
              Voir le parent : {selected.parentCourant.codeCompte} —{' '}
              {selected.parentCourant.libelle}
            </button>
          )
        }
        loadHistory={
          selected
            ? () => getCompteHistorique(selected.codeCompte)
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
                  : ' à aujourd\'hui'}
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
