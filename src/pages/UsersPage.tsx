/**
 * UsersPage (Lot Administration) — page admin avec actions complètes :
 * créer, modifier, reset password, forcer déconnexion, désactiver/
 * réactiver, gérer les rôles. Réservée à USER.GERER (côté route).
 */
import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  KeyRound,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CreerUserDialog } from '@/components/admin/users/CreerUserDialog';
import { GererRolesSection } from '@/components/admin/users/GererRolesSection';
import { ModifierUserDialog } from '@/components/admin/users/ModifierUserDialog';
import { ResetPasswordDialog } from '@/components/admin/users/ResetPasswordDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  desactiverUser,
  forcerDeconnexionUser,
  getHistoriqueConnexion,
  type HistoriqueConnexionItem,
  listUsers,
  reactiverUser,
} from '@/lib/api/users';
import { useAuthStore } from '@/lib/auth/auth-store';
import type { UserResponse } from '@/lib/api/types';

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [data, setData] = useState<UserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [creerOpen, setCreerOpen] = useState(false);
  const [modifierTarget, setModifierTarget] = useState<UserResponse | null>(null);
  const [resetTarget, setResetTarget] = useState<UserResponse | null>(null);
  const [rolesTarget, setRolesTarget] = useState<UserResponse | null>(null);
  const [historiqueTarget, setHistoriqueTarget] = useState<UserResponse | null>(
    null,
  );
  const [historique, setHistorique] = useState<HistoriqueConnexionItem[]>([]);

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
  }, [page, debouncedEmail, refreshKey]);

  function refresh(): void {
    setRefreshKey((k) => k + 1);
  }

  async function handleDesactiver(u: UserResponse): Promise<void> {
    if (!window.confirm(`Désactiver le compte ${u.email} ?`)) return;
    try {
      await desactiverUser(u.id);
      toast.success('Utilisateur désactivé.');
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Refusé : ${msg}`);
    }
  }

  async function handleReactiver(u: UserResponse): Promise<void> {
    try {
      await reactiverUser(u.id);
      toast.success('Utilisateur réactivé.');
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec : ${msg}`);
    }
  }

  async function handleForcerDeconnexion(u: UserResponse): Promise<void> {
    if (
      !window.confirm(
        `Forcer la déconnexion de ${u.email} ? Toutes ses sessions actives seront révoquées.`,
      )
    )
      return;
    try {
      await forcerDeconnexionUser(u.id);
      toast.success('Sessions révoquées.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec : ${msg}`);
    }
  }

  async function handleVoirHistorique(u: UserResponse): Promise<void> {
    setHistoriqueTarget(u);
    try {
      const r = await getHistoriqueConnexion(u.id);
      setHistorique(r);
    } catch {
      toast.error('Impossible de charger l\'historique.');
      setHistorique([]);
    }
  }

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
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const u = row.original;
        const isMe = currentUser?.id === u.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Actions"
                data-testid={`btn-actions-${u.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setModifierTarget(u)}
                data-testid={`act-modifier-${u.id}`}
              >
                <Pencil className="h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRolesTarget(u)}
                data-testid={`act-roles-${u.id}`}
              >
                <ShieldCheck className="h-4 w-4" /> Gérer les rôles
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setResetTarget(u)}
                data-testid={`act-reset-${u.id}`}
              >
                <KeyRound className="h-4 w-4" /> Réinitialiser le mot de passe
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleForcerDeconnexion(u)}
                data-testid={`act-deconnexion-${u.id}`}
              >
                <LogOut className="h-4 w-4" /> Forcer la déconnexion
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleVoirHistorique(u)}
                data-testid={`act-historique-${u.id}`}
              >
                Voir l'historique de connexion
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {u.estActif ? (
                <DropdownMenuItem
                  onClick={() => handleDesactiver(u)}
                  disabled={isMe}
                  data-testid={`act-desactiver-${u.id}`}
                >
                  <Power className="h-4 w-4" />
                  {isMe ? 'Désactiver (interdit pour soi-même)' : 'Désactiver'}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleReactiver(u)}
                  data-testid={`act-reactiver-${u.id}`}
                >
                  <Power className="h-4 w-4" /> Réactiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisateurs"
        description="Création, modification, désactivation et gestion des rôles. Permission USER.GERER requise."
        actions={
          <Button
            onClick={() => setCreerOpen(true)}
            data-testid="btn-nouvel-utilisateur"
          >
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
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

      <CreerUserDialog
        isOpen={creerOpen}
        onClose={() => setCreerOpen(false)}
        onCreated={refresh}
      />
      <ModifierUserDialog
        isOpen={modifierTarget !== null}
        onClose={() => setModifierTarget(null)}
        user={modifierTarget}
        onUpdated={refresh}
      />
      <ResetPasswordDialog
        isOpen={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        user={resetTarget}
      />

      {/* Modal gestion rôles */}
      <Dialog
        open={rolesTarget !== null}
        onOpenChange={(o) => !o && setRolesTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rôles de {rolesTarget?.email}</DialogTitle>
            <DialogDescription>
              Cumul autorisé. Un user doit toujours avoir au moins un rôle
              actif.
            </DialogDescription>
          </DialogHeader>
          {rolesTarget && (
            <GererRolesSection
              userId={rolesTarget.id}
              userEmail={rolesTarget.email}
            />
          )}
          <DialogFooter>
            <Button onClick={() => setRolesTarget(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal historique connexion */}
      <Dialog
        open={historiqueTarget !== null}
        onOpenChange={(o) => !o && setHistoriqueTarget(null)}
      >
        <DialogContent className="!max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Historique de connexion — {historiqueTarget?.email}
            </DialogTitle>
            <DialogDescription>
              50 dernières lignes (LOGIN / LOGIN_FAILED / LOGOUT).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto" data-testid="historique-table">
            <table className="w-full text-xs">
              <thead className="text-(--muted-foreground) border-b border-(--border)">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Statut</th>
                  <th className="text-left p-2">IP</th>
                  <th className="text-left p-2">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {historique.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-2 text-(--muted-foreground)">
                      Aucune connexion enregistrée.
                    </td>
                  </tr>
                )}
                {historique.map((h) => (
                  <tr key={h.id} className="border-b border-(--border)/50">
                    <td className="p-2 whitespace-nowrap">
                      {format(new Date(h.dateAction), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="p-2">
                      {h.typeAction === 'LOGIN' && 'Connexion'}
                      {h.typeAction === 'LOGIN_FAILED' && 'Échec'}
                      {h.typeAction === 'LOGOUT' && 'Déconnexion'}
                    </td>
                    <td className="p-2">{h.statut}</td>
                    <td className="p-2">{h.ipSource ?? '—'}</td>
                    <td className="p-2 max-w-md truncate" title={h.userAgent ?? ''}>
                      {h.userAgent ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoriqueTarget(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
