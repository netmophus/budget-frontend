/**
 * AffectationsPage (Lot 4.1.C) — page admin pour gérer les
 * affectations multi-périmètres des utilisateurs.
 *
 * Liste des users avec compteur d'affectations actives, bouton
 * « Gérer » qui ouvre AffectationsDialog.
 */
import { type ColumnDef } from '@tanstack/react-table';
import { Briefcase, Grid3x3, Settings, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AffectationsDialog } from '@/components/admin/AffectationsDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  type AffectationPerimetre,
  CIBLE_TYPE_LABEL,
  type CiblePerimetreType,
  listerPerimetresUser,
} from '@/lib/api/perimetres';
import { listUsers } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

type UserListItem = UserResponse;

interface UserAvecAffectations {
  user: UserListItem;
  affectations: AffectationPerimetre[];
}

function iconeCible(t: CiblePerimetreType): JSX.Element {
  if (t === 'STRUCTURE') return <Briefcase className="h-3 w-3" />;
  if (t === 'CR') return <Target className="h-3 w-3" />;
  return <Grid3x3 className="h-3 w-3" />;
}

export function AffectationsPage(): JSX.Element {
  const [rows, setRows] = useState<UserAvecAffectations[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogTarget, setDialogTarget] = useState<UserListItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listUsers({ limit: 200, page: 1 })
      .then(async (res) => {
        const enriched = await Promise.all(
          res.items.map(async (user) => {
            try {
              const affectations = await listerPerimetresUser(user.id, {
                actif: true,
              });
              return { user, affectations };
            } catch {
              return { user, affectations: [] };
            }
          }),
        );
        setRows(enriched);
      })
      .catch(() => toast.error('Impossible de charger les utilisateurs'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const columns: ColumnDef<UserAvecAffectations, unknown>[] = [
    {
      id: 'nom',
      header: 'Utilisateur',
      cell: ({ row }) => {
        const u = row.original.user;
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
        const aff = row.original.affectations;
        if (aff.length === 0) {
          return (
            <span className="text-xs text-(--muted-foreground)" data-testid="badge-vide">
              Aucun
            </span>
          );
        }
        const tooltip = aff
          .map((a) => `${a.cibleType} — ${a.cibleId ?? `${a.cibleCrIds?.length ?? 0} CR`}`)
          .join('\n');
        return (
          <div
            className="flex flex-wrap items-center gap-1"
            title={tooltip}
            data-testid={`badge-user-${row.original.user.id}`}
          >
            <span className="rounded-full bg-(--primary)/10 text-(--primary) px-2 py-0.5 text-xs font-semibold">
              {aff.length} périmètre{aff.length > 1 ? 's' : ''}
            </span>
            {aff.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-0.5 rounded bg-(--muted) px-1.5 py-0.5 text-[10px]"
                title={CIBLE_TYPE_LABEL[a.cibleType]}
              >
                {iconeCible(a.cibleType)}
                {a.cibleType}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogTarget(row.original.user)}
          data-testid={`btn-gerer-${row.original.user.id}`}
        >
          <Settings className="h-3.5 w-3.5 mr-1" />
          Gérer
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Affectations multi-périmètres"
        description="Gérez les périmètres budgétaires (Structure, CR, ensemble de CR) attribués à chaque utilisateur."
      />

      <DataTable
        columns={columns}
        data={rows}
        total={rows.length}
        page={1}
        limit={200}
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
