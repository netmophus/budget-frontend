/**
 * AffectationsPage (Lot 4.1.C + Lot 4.1-fix.A) — page admin pour
 * gérer les affectations multi-périmètres.
 *
 * Lot 4.1-fix.A : la page liste désormais TOUS les utilisateurs
 * actifs (même ceux à 0 périmètre — on doit pouvoir leur en créer).
 * Pour les users à 0 → badge gris « 0 périmètre » + bouton dédié
 * « Ajouter une affectation ». Pour les users avec ≥ 1 → badge
 * coloré + bouton « Gérer ». 1 seul fetch grâce au flag
 * `withPerimetresCount=true` exposé par l'endpoint /users (évite le
 * N+1 du Lot 4.1).
 */
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AffectationsDialog } from '@/components/admin/AffectationsDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listUsers } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

type UserListItem = UserResponse;

export function AffectationsPage(): JSX.Element {
  const [rows, setRows] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [dialogTarget, setDialogTarget] = useState<UserListItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(emailFilter), 300);
    return () => clearTimeout(t);
  }, [emailFilter]);

  useEffect(() => {
    setLoading(true);
    listUsers({
      limit: 100,
      page: 1,
      estActif: true,
      withPerimetresCount: true,
      ...(debouncedEmail ? { email: debouncedEmail } : {}),
    })
      .then((res) => setRows(res.items))
      .catch(() => toast.error('Impossible de charger les utilisateurs'))
      .finally(() => setLoading(false));
  }, [refreshKey, debouncedEmail]);

  const columns: ColumnDef<UserListItem, unknown>[] = [
    {
      id: 'nom',
      header: 'Utilisateur',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div>
            <p className="font-medium">
              {u.prenom} {u.nom}
            </p>
            <p className="text-xs text-(--muted-foreground)">{u.email}</p>
          </div>
        );
      },
    },
    {
      id: 'perimetres',
      header: 'Périmètres actifs',
      cell: ({ row }) => {
        const n = row.original.nombrePerimetresActifs ?? 0;
        if (n === 0) {
          return (
            <span
              className="inline-flex items-center rounded-full bg-(--muted) text-(--muted-foreground) px-2 py-0.5 text-xs"
              data-testid={`badge-zero-${row.original.id}`}
            >
              0 périmètre
            </span>
          );
        }
        return (
          <span
            className="inline-flex items-center rounded-full bg-(--primary)/10 text-(--primary) px-2 py-0.5 text-xs font-semibold"
            data-testid={`badge-count-${row.original.id}`}
          >
            {n} périmètre{n > 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const n = row.original.nombrePerimetresActifs ?? 0;
        if (n === 0) {
          return (
            <Button
              size="sm"
              onClick={() => setDialogTarget(row.original)}
              data-testid={`btn-ajouter-${row.original.id}`}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter une affectation
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogTarget(row.original)}
            data-testid={`btn-gerer-${row.original.id}`}
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            Gérer
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Affectations multi-périmètres"
        description="Gérez les périmètres budgétaires (Structure, CR, ensemble de CR) attribués à chaque utilisateur. Les utilisateurs à 0 périmètre sont listés pour permettre une première affectation."
      />

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="email-filter">Recherche email</Label>
          <Input
            id="email-filter"
            placeholder="ex. dir.retail"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-64"
            data-testid="input-email-filter"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        total={rows.length}
        page={1}
        limit={100}
        isLoading={loading}
        onPageChange={() => {}}
      />

      <AffectationsDialog
        isOpen={dialogTarget !== null}
        onClose={() => {
          setDialogTarget(null);
          setRefreshKey((k) => k + 1);
        }}
        userId={dialogTarget?.id ?? null}
        userLibelle={
          dialogTarget
            ? `${dialogTarget.prenom} ${dialogTarget.nom}`
            : ''
        }
      />
    </div>
  );
}
