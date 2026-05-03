import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { Archive, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { ScenarioFormDrawer } from '@/components/budget/ScenarioFormDrawer';
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
  archiverScenario,
  listScenarios,
  type Scenario,
  type StatutScenario,
  type TypeScenario,
} from '@/lib/api/scenarios';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassTypeScenario,
  formatDateFr,
  libelleStatutScenario,
  libelleTypeScenario,
  STATUTS_VERSION as _STATUTS_VERSION_unused,
  TYPES_SCENARIO,
} from '@/lib/labels/budget';

void _STATUTS_VERSION_unused;

const ALL = '__all__';
const DEFAULT_LIMIT = 50;

export function ScenariosPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [actifsUniquement, setActifsUniquement] = useState(false);
  const [data, setData] = useState<Scenario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Scenario | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Scenario | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listScenarios({
      page: 1,
      limit: DEFAULT_LIMIT,
      typeScenario:
        typeFilter === ALL ? undefined : (typeFilter as TypeScenario),
      statut: actifsUniquement ? ('actif' as StatutScenario) : undefined,
    })
      .then((res) => {
        const term = debouncedSearch.trim().toLowerCase();
        const items = term
          ? res.items.filter(
              (s) =>
                s.codeScenario.toLowerCase().includes(term) ||
                s.libelle.toLowerCase().includes(term),
            )
          : res.items;
        setData(items);
        setTotal(term ? items.length : res.total);
      })
      .catch(() => toast.error('Impossible de charger les scénarios'))
      .finally(() => setLoading(false));
  }, [typeFilter, actifsUniquement, debouncedSearch, refreshKey]);

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

  async function handleArchiveConfirmed(): Promise<void> {
    if (!confirmArchive) return;
    try {
      await archiverScenario(confirmArchive.id);
      toast.success(`Scénario ${confirmArchive.codeScenario} archivé.`);
      setConfirmArchive(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { message } = parseApiError(err);
      toast.error(message || 'Archivage refusé.');
      throw err;
    }
  }

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => a.codeScenario.localeCompare(b.codeScenario)),
    [data],
  );

  const columns: ColumnDef<Scenario, unknown>[] = [
    {
      accessorKey: 'codeScenario',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold">
          {row.original.codeScenario}
        </span>
      ),
    },
    {
      accessorKey: 'libelle',
      header: 'Libellé',
    },
    {
      accessorKey: 'typeScenario',
      header: 'Type',
      cell: ({ row }) => (
        <Badge className={badgeClassTypeScenario(row.original.typeScenario)}>
          {libelleTypeScenario(row.original.typeScenario)}
        </Badge>
      ),
    },
    {
      id: 'exercice',
      header: 'Exercice',
      cell: ({ row }) =>
        row.original.exerciceFiscal !== null ? (
          <span className="font-mono">{row.original.exerciceFiscal}</span>
        ) : (
          <span className="text-(--muted-foreground)">—</span>
        ),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: ({ row }) =>
        row.original.statut === 'actif' ? (
          <Badge variant="success">{libelleStatutScenario('actif')}</Badge>
        ) : (
          <Badge variant="secondary">{libelleStatutScenario('archive')}</Badge>
        ),
    },
    {
      accessorKey: 'dateCreation',
      header: 'Créé le',
      cell: ({ row }) => (
        <span className="text-sm text-(--muted-foreground)">
          {formatDateFr(row.original.dateCreation)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scénarios budgétaires"
        description="Cadrages macro-économiques pour l'élaboration budgétaire."
        actions={
          canGerer ? (
            <Button onClick={() => setFormMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau scénario
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="search-scenarios">Recherche libellé / code</Label>
          <Input
            id="search-scenarios"
            placeholder="ex. MEDIAN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="type-scenario-filter">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="type-scenario-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {TYPES_SCENARIO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={actifsUniquement}
            onChange={(e) => setActifsUniquement(e.target.checked)}
            className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
          />
          Actifs uniquement
        </label>
      </div>

      <DataTable
        columns={columns}
        data={sorted}
        total={total}
        page={1}
        limit={DEFAULT_LIMIT}
        isLoading={loading}
        onPageChange={() => undefined}
        onRowClick={setSelected}
      />

      <DetailDrawer<Scenario, never>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Scénario ${selected.codeScenario}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Type',
                  value: (
                    <Badge
                      className={badgeClassTypeScenario(selected.typeScenario)}
                    >
                      {libelleTypeScenario(selected.typeScenario)}
                    </Badge>
                  ),
                },
                { label: 'Exercice fiscal', value: selected.exerciceFiscal },
                {
                  label: 'Statut',
                  value: libelleStatutScenario(selected.statut),
                },
                { label: 'Commentaire', value: selected.commentaire },
                {
                  label: 'Créé le',
                  value: formatDateFr(selected.dateCreation),
                },
                { label: 'Créé par', value: selected.utilisateurCreation },
                {
                  label: 'Modifié le',
                  value: selected.dateModification
                    ? formatDateFr(selected.dateModification)
                    : null,
                },
                {
                  label: 'Modifié par',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected && canGerer ? (
            <div className="flex items-center gap-2">
              {selected.statut === 'actif' && (
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
                    onClick={() => setConfirmArchive(selected)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </Button>
                </>
              )}
              {selected.statut === 'archive' && (
                <span className="text-xs text-(--muted-foreground)">
                  Scénario archivé — plus aucune saisie possible.
                </span>
              )}
            </div>
          ) : null
        }
      />

      <ScenarioFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(s) => {
          if (formMode === 'create') {
            toast.success(`Scénario ${s.codeScenario} créé.`);
          } else {
            toast.success(`Scénario ${s.codeScenario} modifié.`);
          }
          setFormMode(null);
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      {confirmArchive && (
        <ConfirmDialog
          isOpen={confirmArchive !== null}
          onClose={() => setConfirmArchive(null)}
          onConfirm={handleArchiveConfirmed}
          title={`Archiver le scénario ${confirmArchive.codeScenario} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmArchive.codeScenario} — {confirmArchive.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Le scénario ne pourra plus être utilisé pour de nouvelles
                saisies. Les saisies déjà effectuées restent rattachées.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Cette action est irréversible.
              </p>
            </>
          }
          confirmText="Archiver"
          cancelText="Annuler"
          destructive
        />
      )}
    </div>
  );
}
