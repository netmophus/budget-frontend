import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { LigneMetierFormDrawer } from '@/components/lignes-metier/LigneMetierFormDrawer';
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
  deleteLigneMetier,
  getLigneMetierHistorique,
  type LigneMetier,
  listLignesMetier,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';

const ALL_NIVEAUX = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];
const NIVEAUX = [1, 2, 3, 4];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function LignesMetierPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [niveauFilter, setNiveauFilter] = useState<string>(ALL_NIVEAUX);
  const [racinesUniquement, setRacinesUniquement] = useState(false);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<LigneMetier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<LigneMetier | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LigneMetier | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [niveauFilter, racinesUniquement, activesUniquement, debouncedSearch, limit]);

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
  }, [page, limit, debouncedSearch, refreshKey]);

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
      await deleteLigneMetier(confirmDelete.codeLigneMetier);
      toast.success(
        `Ligne métier ${confirmDelete.codeLigneMetier} désactivée.`,
      );
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Ligne métier introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  // Filtres niveau / racines / actives appliqués côté client
  // (le backend ne supporte que search + versionCouranteUniquement).
  const filtered = useMemo(() => {
    return data.filter((l) => {
      if (racinesUniquement && l.fkLigneMetierParent !== null) return false;
      if (activesUniquement && !l.estActif) return false;
      if (niveauFilter !== ALL_NIVEAUX && String(l.niveau) !== niveauFilter)
        return false;
      return true;
    });
  }, [data, racinesUniquement, activesUniquement, niveauFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeLigneMetier.localeCompare(b.codeLigneMetier);
    });
  }, [filtered]);

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
      id: 'parent',
      header: 'Parent',
      cell: ({ row }) =>
        row.original.parentCourant ? (
          <span className="text-sm">
            {row.original.parentCourant.codeLigneMetier}
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
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lignes métier"
        description="Référentiel hiérarchique des axes d'activité bancaire (SCD2)."
        actions={
          canGerer ? (
            <Button onClick={() => setFormMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle ligne métier
            </Button>
          ) : undefined
        }
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
          <Label htmlFor="niveau-lm">Niveau</Label>
          <Select value={niveauFilter} onValueChange={setNiveauFilter}>
            <SelectTrigger id="niveau-lm" className="w-32">
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
            checked={activesUniquement}
            onChange={(e) => setActivesUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Actives uniquement
        </label>

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
                  value: selected.estActif ? 'Active' : 'Inactive',
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
                      Ligne métier inactive — pour la réactiver, utilisez
                      Modifier puis cochez Active.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
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

      <LigneMetierFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(ligne) => {
          if (formMode === 'create') {
            toast.success(`Ligne métier ${ligne.codeLigneMetier} créée.`);
          }
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
          title={`Désactiver la ligne métier ${confirmDelete.codeLigneMetier} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeLigneMetier} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Cette ligne ne pourra plus être utilisée pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à cette ligne dans l'historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si cette ligne a des enfants courants, le backend
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
