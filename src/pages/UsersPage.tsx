/**
 * UsersPage (Lot Administration + refonte Lot 7.3 V26 Charte v1).
 *
 * Page admin avec actions complètes : créer, modifier, reset password,
 * forcer déconnexion, désactiver/réactiver, gérer les rôles. Réservée
 * à USER.GERER (côté route).
 *
 * Refonte V26 (pattern unifié V11→V25) :
 *  - Header custom : cercle Users catégorie COLLABORATION (terracotta
 *    --miznas-cat-collaboration #B05D3F) + titre + sous-titre avec
 *    code USER.GERER en chip mono + CTA "Nouvel utilisateur" bleu nuit
 *  - 4 KPI cards (Total / Actifs / Inactifs / Connectés 7j) avec
 *    pastille colorée
 *  - Barre de filtres dans cadre gris (Search email + Statut)
 *  - Tableau grid CSS modernisé avec UserAvatar (initiales déterministes
 *    par email), StatutBadge dot Charte v1, dernière connexion en mono
 *    tabular-nums, kebab DropdownMenu d'actions
 *  - Bandeau erreur Charte v1 + état vide grand format
 *
 * Logique métier 100 % préservée : listUsers + pagination, debounce
 * email, currentUser pour bloquer auto-désactivation, toutes les
 * actions (desactiverUser/reactiverUser/forcerDeconnexionUser/
 * getHistoriqueConnexion), modales CreerUserDialog/ModifierUserDialog/
 * ResetPasswordDialog/GererRolesSection inchangées (testées
 * séparément), data-testid critiques préservés.
 */
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreerUserDialog } from '@/components/admin/users/CreerUserDialog';
import { GererRolesSection } from '@/components/admin/users/GererRolesSection';
import { ModifierUserDialog } from '@/components/admin/users/ModifierUserDialog';
import { ResetPasswordDialog } from '@/components/admin/users/ResetPasswordDialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

const ALL = '__all__';
const STATUT_ACTIF = 'ACTIF';
const STATUT_INACTIF = 'INACTIF';

const SEUIL_CONNEXION_MS = 7 * 24 * 60 * 60 * 1000;

// Helper hors composant pour isoler Date.now() (react-hooks/purity).
function computeKpi(users: UserResponse[]): {
  totalCount: number;
  actifs: number;
  inactifs: number;
  connectes7j: number;
} {
  const totalCount = users.length;
  const actifs = users.filter((u) => u.estActif).length;
  const inactifs = totalCount - actifs;
  const refNow = Date.now();
  const connectes7j = users.filter((u) => {
    if (!u.dateDerniereConnexion) return false;
    return (
      refNow - new Date(u.dateDerniereConnexion).getTime() <=
      SEUIL_CONNEXION_MS
    );
  }).length;
  return { totalCount, actifs, inactifs, connectes7j };
}

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>(ALL);
  const [data, setData] = useState<UserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [creerOpen, setCreerOpen] = useState(false);
  const [modifierTarget, setModifierTarget] = useState<UserResponse | null>(
    null,
  );
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
    setError(null);
    listUsers({ page, limit, email: debouncedEmail || undefined })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
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
      toast.error("Impossible de charger l'historique.");
      setHistorique([]);
    }
  }

  // 4 KPI cards (calcul direct, ≤20 users par page).
  const kpi = computeKpi(data);

  // Filtre client par statut (l'endpoint backend ne supporte que email).
  const filteredUsers = useMemo(() => {
    if (statutFilter === ALL) return data;
    if (statutFilter === STATUT_ACTIF) return data.filter((u) => u.estActif);
    return data.filter((u) => !u.estActif);
  }, [data, statutFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            style={{ backgroundColor: '#B05D3F1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <UsersIcon className="w-5 h-5" style={{ color: '#B05D3F' }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Utilisateurs
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Création, modification, désactivation et gestion des rôles —{' '}
              <code className="font-mono text-[11px] bg-(--secondary) px-1.5 py-0.5 rounded-sm">
                USER.GERER
              </code>{' '}
              requise
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreerOpen(true)}
          data-testid="btn-nouvel-utilisateur"
          className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
        <KpiNumberCard
          label="Total"
          value={kpi.totalCount}
          colorHex="#0C447C"
          testId="kpi-users-total"
        />
        <KpiWithDotCard
          label="Actifs"
          value={kpi.actifs}
          colorHex="#0F6E56"
          testId="kpi-users-actifs"
        />
        <KpiWithDotCard
          label="Inactifs"
          value={kpi.inactifs}
          colorHex="#5F6B7A"
          testId="kpi-users-inactifs"
        />
        <KpiWithDotCard
          label="Connectés 7j"
          value={kpi.connectes7j}
          colorHex="#0C447C"
          testId="kpi-users-connectes-7j"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="email-filter" className="text-xs mb-1 block">
              Recherche email
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="email-filter"
                placeholder="ex. admin"
                value={emailFilter}
                onChange={(e) => {
                  setEmailFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="statut-filter" className="text-xs mb-1 block">
              Statut
            </Label>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger id="statut-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                <SelectItem value={STATUT_ACTIF}>Actifs</SelectItem>
                <SelectItem value={STATUT_INACTIF}>Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && !loading && (
        <div
          className="rounded-md border p-3 text-sm mb-3 flex items-start gap-2"
          style={{
            borderColor: '#DC262640',
            backgroundColor: '#DC26260D',
            color: '#DC2626',
          }}
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── Tableau grid CSS modernisé ────────────────────── */}
      <div className="bg-white border border-(--border) rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_120px_90px_140px_60px] bg-(--secondary) px-3.5 py-2.5 border-b border-(--border) gap-2.5">
          <ColumnHeader>Utilisateur</ColumnHeader>
          <ColumnHeader>Nom</ColumnHeader>
          <ColumnHeader>Prénom</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>Dernière conn.</ColumnHeader>
          <ColumnHeader>Act.</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="px-7 py-12 text-center">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: '#B05D3F14' }}
              aria-hidden="true"
            >
              <UsersIcon
                className="w-6 h-6"
                style={{ color: '#B05D3F' }}
              />
            </div>
            <div className="text-sm font-semibold mb-1">
              {data.length === 0
                ? 'Aucun utilisateur'
                : 'Aucun utilisateur ne correspond aux filtres'}
            </div>
            <p className="text-xs text-(--muted-foreground)">
              {data.length === 0
                ? 'Créez le premier utilisateur via « Nouvel utilisateur ».'
                : 'Ajustez votre recherche ou réinitialisez les filtres.'}
            </p>
          </div>
        )}
        {!loading &&
          filteredUsers.map((u) => {
            const isMe = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_140px_120px_90px_140px_60px] px-3.5 py-2.5 border-b border-(--border) last:border-b-0 gap-2.5 items-center hover:bg-(--muted)/30 transition-colors"
                data-testid={`user-row-${u.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar email={u.email} prenom={u.prenom} nom={u.nom} />
                  <span
                    className="text-xs truncate"
                    title={u.email}
                  >
                    {u.email}
                  </span>
                </div>
                <div className="text-xs truncate" title={u.nom ?? ''}>
                  {u.nom || '—'}
                </div>
                <div className="text-xs truncate" title={u.prenom ?? ''}>
                  {u.prenom || '—'}
                </div>
                <div>
                  <StatutBadge actif={u.estActif} />
                </div>
                <div className="text-[11px] text-(--muted-foreground) tabular-nums font-mono">
                  {u.dateDerniereConnexion
                    ? format(
                        new Date(u.dateDerniereConnexion),
                        'dd/MM HH:mm',
                      )
                    : '—'}
                </div>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Actions"
                        data-testid={`btn-actions-${u.id}`}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
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
                        <KeyRound className="h-4 w-4" /> Réinitialiser le mot
                        de passe
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
                        Voir l&apos;historique de connexion
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.estActif ? (
                        <DropdownMenuItem
                          onClick={() => handleDesactiver(u)}
                          disabled={isMe}
                          data-testid={`act-desactiver-${u.id}`}
                        >
                          <Power className="h-4 w-4" />
                          {isMe
                            ? 'Désactiver (interdit pour soi-même)'
                            : 'Désactiver'}
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
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex justify-between items-center mt-3.5">
          <div className="text-xs text-(--muted-foreground)">
            {total} ligne{total > 1 ? 's' : ''} — page {page} sur {totalPages}
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              <ChevronLeft className="w-3 h-3" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 gap-1 text-xs"
            >
              Suivant
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

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
          <div
            className="max-h-96 overflow-y-auto"
            data-testid="historique-table"
          >
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
                      {format(
                        new Date(h.dateAction),
                        'dd/MM/yyyy HH:mm:ss',
                      )}
                    </td>
                    <td className="p-2">
                      {h.typeAction === 'LOGIN' && 'Connexion'}
                      {h.typeAction === 'LOGIN_FAILED' && 'Échec'}
                      {h.typeAction === 'LOGOUT' && 'Déconnexion'}
                    </td>
                    <td className="p-2">{h.statut}</td>
                    <td className="p-2">{h.ipSource ?? '—'}</td>
                    <td
                      className="p-2 max-w-md truncate"
                      title={h.userAgent ?? ''}
                    >
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

// ─── Sous-composants ─────────────────────────────────────────────

function ColumnHeader({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}

function KpiNumberCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiWithDotCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        />
        <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}

const AVATAR_PALETTE = [
  { bg: 'rgba(60, 52, 137, 0.12)', text: '#3C3489' },
  { bg: 'rgba(15, 110, 86, 0.12)', text: '#085041' },
  { bg: 'rgba(186, 117, 23, 0.12)', text: '#854F0B' },
  { bg: 'rgba(91, 78, 145, 0.12)', text: '#26215C' },
  { bg: 'rgba(95, 94, 90, 0.12)', text: '#444441' },
  { bg: 'rgba(176, 93, 63, 0.12)', text: '#712B13' },
];

function UserAvatar({
  email,
  prenom,
  nom,
}: {
  email: string;
  prenom?: string | null;
  nom?: string | null;
}): JSX.Element {
  const initials = useMemo(() => {
    const p = prenom?.charAt(0) ?? '';
    const n = nom?.charAt(0) ?? '';
    const computed = (p + n).toUpperCase();
    return computed || email.charAt(0).toUpperCase();
  }, [prenom, nom, email]);

  const palette = useMemo(() => {
    const hash = email
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
  }, [email]);

  return (
    <div
      className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
      style={{ background: palette.bg, color: palette.text }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function StatutBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit',
          'bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)',
        )}
        data-testid="statut-user-actif"
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
          aria-hidden="true"
        />
        Actif
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)"
      data-testid="statut-user-inactif"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactif
    </span>
  );
}
