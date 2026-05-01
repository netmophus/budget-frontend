import { type ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { StructureFormDrawer } from '@/components/structures/StructureFormDrawer';
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
  deleteStructure,
  getStructureHistorique,
  listStructures,
  type Structure,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import {
  badgeClassTypeStructure,
  libelleTypeStructure,
} from '@/lib/labels/referentiels';
import { libellePays } from '@/lib/labels/uemoa';

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
  const canGerer = useHasPermission('REFERENTIEL.GERER');
  // Lot 2.5-bis-D : selects de filtre alimentés dynamiquement par les
  // référentiels secondaires (cache 60s).
  const { options: typeOptions } = useRefSecondaireOptions('type-structure');
  const { options: paysOptions } = useRefSecondaireOptions('pays');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pays, setPays] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [data, setData] = useState<Structure[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Drawer detail (lecture)
  const [selected, setSelected] = useState<Structure | null>(null);
  // Mode édition / création
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  // Confirmation désactivation
  const [confirmDelete, setConfirmDelete] = useState<Structure | null>(null);

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
  }, [pays, type, debouncedSearch, refreshKey]);

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

  async function handleDeleteConfirmed(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteStructure(confirmDelete.codeStructure);
      toast.success(
        `Structure ${confirmDelete.codeStructure} désactivée.`,
      );
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      // ConfirmDialog rethrow ne ferme pas la modale — on
      // affiche le toast ici puis re-throw pour le pattern.
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      const message = (
        (err as { response?: { data?: { message?: string | string[] } } })
          .response?.data?.message ?? 'Désactivation refusée.'
      );
      const text = Array.isArray(message) ? message.join(' ; ') : message;
      if (status === 409) {
        toast.error(text);
      } else if (status === 404) {
        toast.error('Structure introuvable.');
      } else {
        toast.error(text);
      }
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Structures organisationnelles"
        description="Hiérarchie de la banque (entités juridiques, branches, directions, départements, agences)."
        actions={
          canGerer ? (
            <Button onClick={() => setFormMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle structure
            </Button>
          ) : undefined
        }
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
              {paysOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
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
              {typeOptions.map((t) => (
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
        onRowClick={setSelected}
      />

      <DetailDrawer<Structure, Structure>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Structure ${selected.codeStructure}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <Badge
                      className={badgeClassTypeStructure(selected.typeStructure)}
                    >
                      {libelleTypeStructure(selected.typeStructure)}
                    </Badge>
                  ),
                },
                { label: 'Niveau hiérarchique', value: selected.niveauHierarchique },
                {
                  label: 'Pays',
                  value: selected.codePays
                    ? `${selected.codePays} — ${libellePays(selected.codePays)}`
                    : null,
                },
                {
                  label: 'Libellé court',
                  value: selected.libelleCourt,
                },
                {
                  label: 'Statut',
                  value: selected.estActif ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  ),
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
                { label: 'Créée par', value: selected.utilisateurCreation },
                {
                  label: 'Dernière modification',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected && canGerer ? (
            <div className="flex items-center gap-2">
              {selected.estActif && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormMode('edit');
                    }}
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
                  Structure inactive — pour la réactiver, utilisez Modifier
                  puis cochez Actif.
                </span>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getStructureHistorique(selected.codeStructure)
            : undefined
        }
        renderHistoryRow={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">
                {row.libelle}
                {row.libelleCourt && (
                  <span className="text-(--muted-foreground) text-xs ml-2">
                    ({row.libelleCourt})
                  </span>
                )}
              </div>
              <div className="text-xs text-(--muted-foreground)">
                {libelleTypeStructure(row.typeStructure)} • niveau{' '}
                {row.niveauHierarchique}
                {row.codePays && ` • ${row.codePays}`}
                {' • '}
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

      <StructureFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(structure) => {
          if (formMode === 'create') {
            toast.success(`Structure ${structure.codeStructure} créée.`);
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
          title={`Désactiver la structure ${confirmDelete.codeStructure} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeStructure} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Cette structure ne pourra plus être utilisée pour de nouvelles
                saisies budgétaires. Les saisies budget déjà effectuées
                restent rattachées à cette structure dans l'historique.
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
