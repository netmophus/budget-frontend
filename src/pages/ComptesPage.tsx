import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Check, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
import { CompteFormDrawer } from '@/components/comptes/CompteFormDrawer';
import { CompteImportDialog } from '@/components/comptes/CompteImportDialog';
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
  type Compte,
  deleteCompte,
  getCompteHistorique,
  listComptes,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassClasseCompte,
  libelleSensCompte,
} from '@/lib/labels/referentiels';

const ALL_NIVEAUX = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];
const NIVEAUX = [1, 2, 3, 4];

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

export function ComptesPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState<string>('');
  const [niveauFilter, setNiveauFilter] = useState<string>(ALL_NIVEAUX);
  const [racinesUniquement, setRacinesUniquement] = useState(false);
  const [feuillesUniquement, setFeuillesUniquement] = useState(false);
  const [porteursUniquement, setPorteursUniquement] = useState(false);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Compte[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Compte | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Compte | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    classeFilter,
    niveauFilter,
    racinesUniquement,
    feuillesUniquement,
    porteursUniquement,
    activesUniquement,
    debouncedSearch,
    limit,
  ]);

  useEffect(() => {
    setLoading(true);
    listComptes({
      page,
      limit,
      classe: classeFilter || undefined,
      search: debouncedSearch || undefined,
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
    refreshKey,
  ]);

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
      await deleteCompte(confirmDelete.codeCompte);
      toast.success(`Compte ${confirmDelete.codeCompte} désactivé.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Compte introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  // Filtres niveau / racines / actives uniquement appliqués côté client
  // (le backend ne supporte pas ces 3 filtres).
  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (racinesUniquement && c.fkCompteParent !== null) return false;
      if (activesUniquement && !c.estActif) return false;
      if (niveauFilter !== ALL_NIVEAUX && String(c.niveau) !== niveauFilter)
        return false;
      return true;
    });
  }, [data, racinesUniquement, activesUniquement, niveauFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeCompte.localeCompare(b.codeCompte);
    });
  }, [filtered]);

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
      header: 'N',
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
      accessorKey: 'estCompteCollectif',
      header: 'Type',
      cell: ({ row }) =>
        row.original.estCompteCollectif ? (
          <span title="Collectif (agrégat)" className="block text-center">
            🗂️
          </span>
        ) : (
          <span title="Feuille (saisissable)" className="block text-center">
            📄
          </span>
        ),
    },
    {
      accessorKey: 'estPorteurInterets',
      header: 'Int.',
      cell: ({ row }) => <CheckOrDash value={row.original.estPorteurInterets} />,
    },
    {
      accessorKey: 'codePosteBudgetaire',
      header: 'Poste',
      cell: ({ row }) =>
        row.original.codePosteBudgetaire ? (
          <span
            className="font-mono text-xs"
            title={row.original.codePosteBudgetaire}
          >
            {row.original.codePosteBudgetaire.length > 20
              ? row.original.codePosteBudgetaire.slice(0, 20) + '…'
              : row.original.codePosteBudgetaire}
          </span>
        ) : (
          <span className="text-(--muted-foreground)">—</span>
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
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comptes (PCB UMOA)"
        description="Plan Comptable Bancaire UMOA — référentiel hiérarchique 4 niveaux (SCD2)."
        actions={
          canGerer ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => setFormMode('create')}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau compte
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-comptes">Recherche libellé / code</Label>
          <Input
            id="search-comptes"
            placeholder="ex. salaires"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1 w-48">
          <Label htmlFor="classe-filter">Classe PCB</Label>
          <RefSecondaireSelect
            id="classe-filter"
            refKey="classe-compte"
            value={classeFilter}
            onValueChange={setClasseFilter}
            labelChamp="les classes PCB"
            placeholder="Toutes"
            showWarningIfDisabled={false}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="niveau-filter">Niveau</Label>
          <Select value={niveauFilter} onValueChange={setNiveauFilter}>
            <SelectTrigger id="niveau-filter" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_NIVEAUX}>Tous</SelectItem>
              {NIVEAUX.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Niveau {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={racinesUniquement}
            onChange={(e) => setRacinesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Racines uniquement
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={feuillesUniquement}
            onChange={(e) => setFeuillesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Feuilles uniquement (saisissables)
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

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={activesUniquement}
            onChange={(e) => setActivesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Actifs uniquement
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
                {
                  label: 'Classe',
                  value: (
                    <Badge className={badgeClassClasseCompte(selected.classe)}>
                      {selected.classe}
                    </Badge>
                  ),
                },
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
                  label: 'Type',
                  value: selected.estCompteCollectif
                    ? 'Collectif (agrégat)'
                    : 'Feuille (saisissable budget)',
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
          selected ? (
            <div className="space-y-3">
              {selected.parentCourant && (
                <button
                  type="button"
                  className="text-sm text-(--primary) hover:underline"
                  onClick={() => {
                    if (!selected?.parentCourant) return;
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
                      Compte inactif — pour le réactiver, utilisez Modifier
                      puis cochez Actif.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
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

      <CompteFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(compte) => {
          if (formMode === 'create') {
            toast.success(`Compte ${compte.codeCompte} créé.`);
          }
          setFormMode(null);
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      <CompteImportDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />

      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirmed}
          title={`Désactiver le compte ${confirmDelete.codeCompte} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeCompte} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Ce compte ne pourra plus être utilisé pour de nouvelles
                saisies budgétaires. Les saisies déjà effectuées
                restent rattachées à ce compte dans l'historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si ce compte a des enfants courants, le backend
                refusera la désactivation (409) — désactivez d'abord
                les descendants.
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
