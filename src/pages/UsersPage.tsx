import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
// TODO Lot 2 : remplacer le useEffect+useState par TanStack Query (cache + invalidation).
import { listUsers } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

const columns: ColumnDef<UserResponse, unknown>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'nom', header: 'Nom' },
  { accessorKey: 'prenom', header: 'Prénom' },
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
    accessorKey: 'dateDerniereConnexion',
    header: 'Dernière connexion',
    cell: ({ row }) =>
      row.original.dateDerniereConnexion
        ? format(new Date(row.original.dateDerniereConnexion), 'dd/MM/yyyy HH:mm')
        : '—',
  },
];

export function UsersPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [data, setData] = useState<UserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(emailFilter), 300);
    return () => clearTimeout(t);
  }, [emailFilter]);

  useEffect(() => {
    setLoading(true);
    listUsers({ page, limit, email: debouncedEmail || undefined })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedEmail]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisateurs"
        description="Liste des comptes ayant accès à MIZNAS (lecture seule au Lot 1)."
      />

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="email-filter">Filtre email</Label>
          <Input
            id="email-filter"
            placeholder="ex. admin"
            value={emailFilter}
            onChange={(e) => {
              setEmailFilter(e.target.value);
              setPage(1);
            }}
            className="w-64"
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
      />
    </div>
  );
}
