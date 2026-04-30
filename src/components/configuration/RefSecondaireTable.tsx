import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { RefSecondaireFormDrawer } from '@/components/configuration/RefSecondaireFormDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deleteRefSecondaire,
  listRefSecondaires,
  type RefKey,
  type RefSecondaire,
  toggleActifRefSecondaire,
} from '@/lib/api/configuration';
import { useHasPermission } from '@/lib/auth/permissions';
import { refMeta } from '@/lib/labels/configuration';

const PAGE_SIZE = 50;

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const part = iso.split('T')[0];
  if (!part) return iso;
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

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

export interface RefSecondaireTableProps {
  refKey: RefKey;
  /**
   * Callback appelé après chaque action mutative (create / update /
   * toggle / delete) — permet au parent (ConfigurationPage) de
   * rafraîchir le count par référentiel dans la sidebar.
   */
  onMutate?: () => void;
}

export function RefSecondaireTable({
  refKey,
  onMutate,
}: RefSecondaireTableProps) {
  const meta = refMeta(refKey);
  const Icon = meta.icon;
  const canGerer = useHasPermission('CONFIGURATION.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showInactives, setShowInactives] = useState(false);
  const [systemeUniquement, setSystemeUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RefSecondaire[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<RefSecondaire | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<RefSecondaire | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RefSecondaire | null>(null);

  // Reset au changement de référentiel.
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setShowInactives(false);
    setSystemeUniquement(false);
    setPage(1);
    setSelected(null);
  }, [refKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, showInactives, systemeUniquement]);

  useEffect(() => {
    setLoading(true);
    listRefSecondaires(refKey, {
      page,
      limit: PAGE_SIZE,
      estActif: showInactives ? undefined : true,
      estSysteme: systemeUniquement ? true : undefined,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() =>
        toast.error(`Impossible de charger ${meta.label.toLowerCase()}.`),
      )
      .finally(() => setLoading(false));
  }, [
    refKey,
    page,
    debouncedSearch,
    showInactives,
    systemeUniquement,
    refreshKey,
    meta.label,
  ]);

  function refresh(): void {
    setRefreshKey((k) => k + 1);
    onMutate?.();
  }

  async function handleToggle(): Promise<void> {
    if (!confirmToggle) return;
    try {
      const r = await toggleActifRefSecondaire(refKey, confirmToggle.id);
      const verbe = r.entity.estActif ? 'réactivée' : 'désactivée';
      toast.success(`Valeur '${r.entity.code}' ${verbe}.`);
      if (r.warning) toast.info(r.warning);
      setConfirmToggle(null);
      refresh();
    } catch (err) {
      const { message } = parseApiError(err);
      toast.error(message || 'Échec du toggle.');
      throw err;
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteRefSecondaire(refKey, confirmDelete.id);
      toast.success(`Valeur '${confirmDelete.code}' supprimée.`);
      setConfirmDelete(null);
      setSelected(null);
      refresh();
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else {
        toast.error(message || 'Suppression refusée.');
      }
      throw err;
    }
  }

  const columns: ColumnDef<RefSecondaire, unknown>[] = useMemo(() => {
    const cols: ColumnDef<RefSecondaire, unknown>[] = [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono font-bold">{row.original.code}</span>
        ),
      },
      {
        accessorKey: 'libelle',
        header: 'Libellé',
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => {
          const d = row.original.description;
          if (!d) {
            return <span className="text-(--muted-foreground)">—</span>;
          }
          if (d.length > 60) {
            return (
              <span title={d} className="text-sm">
                {d.slice(0, 57)}…
              </span>
            );
          }
          return <span className="text-sm">{d}</span>;
        },
      },
      {
        accessorKey: 'ordre',
        header: 'Ordre',
        cell: ({ row }) => (
          <span className="font-mono text-xs block text-right">
            {row.original.ordre}
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
        accessorKey: 'estSysteme',
        header: 'Système',
        cell: ({ row }) =>
          row.original.estSysteme ? (
            <Badge className="bg-blue-500 text-white border-transparent">
              Système
            </Badge>
          ) : (
            <span className="text-(--muted-foreground) text-xs">—</span>
          ),
      },
    ];
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const v = row.original;
        return (
          <div className="flex items-center gap-1 justify-end">
            {canGerer && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(v);
                    setFormMode('edit');
                  }}
                  aria-label="Modifier"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmToggle(v);
                  }}
                  aria-label={v.estActif ? 'Désactiver' : 'Réactiver'}
                  title={v.estActif ? 'Désactiver' : 'Réactiver'}
                >
                  {v.estActif ? (
                    <PowerOff className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Power className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(v);
                  }}
                  disabled={v.estSysteme}
                  aria-label="Supprimer"
                  title={
                    v.estSysteme
                      ? 'Valeur système — non supprimable'
                      : 'Supprimer'
                  }
                >
                  <Trash2 className="h-4 w-4 text-(--destructive)" />
                </Button>
              </>
            )}
          </div>
        );
      },
    });
    return cols;
  }, [canGerer]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {meta.label}
            <span className="text-sm font-normal text-(--muted-foreground)">
              ({total})
            </span>
          </h2>
          <p className="text-sm text-(--muted-foreground) mt-1 max-w-2xl">
            {meta.description}
          </p>
        </div>
        {canGerer && (
          <Button onClick={() => setFormMode('create')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle valeur
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-config">Recherche libellé</Label>
          <Input
            id="search-config"
            placeholder="ex. agence"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={showInactives}
            onChange={(e) => setShowInactives(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Afficher les valeurs inactives
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={systemeUniquement}
            onChange={(e) => setSystemeUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Afficher uniquement les valeurs système
        </label>
      </div>

      {/* Tableau */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={(v) => {
          setSelected(v);
          setFormMode(null);
        }}
      />

      {/* Drawer détail (lecture) */}
      <DetailDrawer<RefSecondaire, never>
        open={selected !== null && formMode === null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        entity={selected ?? undefined}
        title={selected ? `${meta.labelSingular} — ${selected.code}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                { label: 'Code', value: <span className="font-mono">{selected.code}</span> },
                { label: 'Libellé', value: selected.libelle },
                { label: 'Description', value: selected.description },
                { label: 'Ordre', value: selected.ordre },
                {
                  label: 'Statut',
                  value: selected.estActif ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  ),
                },
                {
                  label: 'Système',
                  value: selected.estSysteme ? 'Oui' : 'Non',
                },
                { label: 'Créée le', value: formatDateFr(selected.dateCreation) },
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
      />

      {/* Drawer création / édition */}
      <RefSecondaireFormDrawer
        refKey={refKey}
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={() => {
          setFormMode(null);
          setSelected(null);
          refresh();
        }}
      />

      {/* Confirmation toggle */}
      {confirmToggle && (
        <ConfirmDialog
          isOpen={confirmToggle !== null}
          onClose={() => setConfirmToggle(null)}
          onConfirm={handleToggle}
          title={
            confirmToggle.estActif
              ? `Désactiver '${confirmToggle.code}' ?`
              : `Réactiver '${confirmToggle.code}' ?`
          }
          description={
            confirmToggle.estActif
              ? `${confirmToggle.libelle} ne pourra plus être choisie pour de nouvelles saisies. Les saisies existantes restent intactes.`
              : `${confirmToggle.libelle} redeviendra disponible dans les selects.`
          }
          confirmText={confirmToggle.estActif ? 'Désactiver' : 'Réactiver'}
          destructive={confirmToggle.estActif}
        />
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title={`Supprimer définitivement '${confirmDelete.code}' ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.code} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Cette action est irréversible. Si la valeur est référencée
                par une dimension, le backend renverra une erreur — vous
                pouvez la <em>désactiver</em> à la place pour la masquer
                des futurs selects sans perdre les saisies historiques.
              </p>
            </>
          }
          confirmText="Supprimer"
          destructive
        />
      )}
    </div>
  );
}
