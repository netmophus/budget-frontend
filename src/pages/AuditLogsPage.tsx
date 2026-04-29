import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { listAuditLogs, type ListAuditLogsQuery } from '@/lib/api/audit-logs';
import type { AuditLogResponse, AuditTypeAction } from '@/lib/api/types';

const TYPE_ACTIONS: AuditTypeAction[] = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REFRESH',
  'REFRESH_FORCED_REVOCATION',
  'PERMISSION_DENIED',
  'CREATE',
  'UPDATE',
  'DELETE',
  'VALIDATE',
  'FREEZE',
  'EXPORT',
  'IMPORT',
  'LIRE_AUDIT',
];

const columns: ColumnDef<AuditLogResponse, unknown>[] = [
  {
    accessorKey: 'dateAction',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.dateAction), 'dd/MM/yyyy HH:mm:ss'),
  },
  { accessorKey: 'utilisateur', header: 'Utilisateur' },
  {
    accessorKey: 'typeAction',
    header: "Type d'action",
    cell: ({ row }) => (
      <Badge
        variant={row.original.statut === 'success' ? 'success' : 'destructive'}
      >
        {row.original.typeAction}
      </Badge>
    ),
  },
  { accessorKey: 'entiteCible', header: 'Entité cible' },
  { accessorKey: 'statut', header: 'Statut' },
  {
    accessorKey: 'ipSource',
    header: 'IP',
    cell: ({ row }) => row.original.ipSource ?? '—',
  },
];

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const [filters, setFilters] = useState<ListAuditLogsQuery>({});
  const [data, setData] = useState<AuditLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);

  useEffect(() => {
    setLoading(true);
    listAuditLogs({ ...filters, page, limit })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  function applyFilter<K extends keyof ListAuditLogsQuery>(
    key: K,
    value: ListAuditLogsQuery[K] | undefined,
  ) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal d'audit"
        description="Piste d'audit applicative — consultation seule, conservation 10 ans."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>Type d'action</Label>
          <Select
            value={filters.typeAction ?? 'all'}
            onValueChange={(v) =>
              applyFilter('typeAction', v === 'all' ? undefined : (v as AuditTypeAction))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {TYPE_ACTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Utilisateur</Label>
          <Input
            placeholder="ex. admin@miznas.local"
            value={filters.utilisateur ?? ''}
            onChange={(e) => applyFilter('utilisateur', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Date début</Label>
          <Input
            type="date"
            value={filters.dateDebut?.slice(0, 10) ?? ''}
            onChange={(e) =>
              applyFilter('dateDebut', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)
            }
          />
        </div>

        <div className="space-y-1">
          <Label>Date fin</Label>
          <Input
            type="date"
            value={filters.dateFin?.slice(0, 10) ?? ''}
            onChange={(e) =>
              applyFilter('dateFin', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)
            }
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.typeAction} — {selected?.entiteCible}
            </DialogTitle>
            <DialogDescription>
              {selected && format(new Date(selected.dateAction), "dd/MM/yyyy 'à' HH:mm:ss")} —
              utilisateur : {selected?.utilisateur} — IP : {selected?.ipSource ?? '—'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 max-h-[60vh] overflow-auto text-xs">
              {selected.commentaire && (
                <div>
                  <p className="font-medium mb-1">Commentaire</p>
                  <p className="rounded bg-(--muted) p-2 text-(--foreground)">
                    {selected.commentaire}
                  </p>
                </div>
              )}
              <div>
                <p className="font-medium mb-1">payload_avant</p>
                <pre className="rounded bg-(--muted) p-2 overflow-auto">
                  {selected.payloadAvant
                    ? JSON.stringify(selected.payloadAvant, null, 2)
                    : 'null'}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-1">payload_apres</p>
                <pre className="rounded bg-(--muted) p-2 overflow-auto">
                  {selected.payloadApres
                    ? JSON.stringify(selected.payloadApres, null, 2)
                    : 'null'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
