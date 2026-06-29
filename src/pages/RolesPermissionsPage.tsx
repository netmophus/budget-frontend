/**
 * RolesPermissionsPage (PR B) — matrice d'édition rôle × permission.
 *
 * Tableau matriciel : lignes = permissions (groupées par module,
 * collapsibles), colonnes = 7 rôles métier. Chaque cellule est une case
 * à cocher reflétant la présence du lien dans `bridge_role_permission`.
 *
 * Édition groupée : les toggles alimentent un état « brouillon » local
 * (dirty-state) ; la sauvegarde diffe brouillon vs initial et émet un
 * POST/DELETE par changement (endpoints PR A backend, gate ROLE.GERER).
 *
 * Garde-fou visuel : les permissions racines (SYSTEM.ADMIN, ROLE.GERER,
 * USER.GERER) sur le rôle ADMIN sont verrouillées (cadenas, non
 * cliquables) — le backend les refuse de toute façon (403).
 */
import { Lock, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ajouterPermissionRole,
  listPermissions,
  listRoles,
  retirerPermissionRole,
} from '@/lib/api/roles';
import type { PermissionResponse, RoleResponse } from '@/lib/api/types';

/** Ordre figé des colonnes (rôles métier MIZNAS). */
const ROLE_ORDER = [
  'ADMIN',
  'PUBLICATEUR',
  'VALIDATEUR',
  'COORDINATEUR',
  'SAISISSEUR',
  'AUDITEUR',
  'LECTEUR',
] as const;

/** Modules pour le filtre (alphabétique). */
const MODULES = [
  'AI',
  'AUDIT',
  'BUDGET',
  'CONFIGURATION',
  'DELEGATION',
  'DOCUMENTS',
  'REALISE',
  'REFERENTIEL',
  'ROLE',
  'SYSTEM',
  'USER',
] as const;

const PROTECTED_PERMISSIONS = ['SYSTEM.ADMIN', 'ROLE.GERER', 'USER.GERER'];
const PROTECTED_ROLE = 'ADMIN';

const FILTRE_TOUS = 'TOUS';

/** Clé d'un lien rôle × permission dans les Set d'état. */
function lien(roleId: string, permId: string): string {
  return `${roleId}::${permId}`;
}

/** Une permission racine sur le rôle ADMIN est verrouillée. */
function estVerrouille(codeRole: string, codePermission: string): boolean {
  return (
    codeRole === PROTECTED_ROLE &&
    PROTECTED_PERMISSIONS.includes(codePermission)
  );
}

export function RolesPermissionsPage(): JSX.Element {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [filtreModule, setFiltreModule] = useState<string>(FILTRE_TOUS);
  const [recherche, setRecherche] = useState('');
  const [rechercheDebounced, setRechercheDebounced] = useState('');
  const [modulesReplies, setModulesReplies] = useState<Set<string>>(new Set());

  // Debounce 300ms de la recherche.
  useEffect(() => {
    const t = setTimeout(() => setRechercheDebounced(recherche), 300);
    return () => clearTimeout(t);
  }, [recherche]);

  function chargerEtatInitial(
    rolesData: RoleResponse[],
    permsData: PermissionResponse[],
  ): void {
    const liens = new Set<string>();
    for (const r of rolesData) {
      for (const p of r.permissions) liens.add(lien(r.id, p.id));
    }
    setRoles(rolesData);
    setPermissions(permsData);
    setInitial(liens);
    setDraft(new Set(liens));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([listRoles(), listPermissions()])
      .then(([rolesData, permsData]) =>
        chargerEtatInitial(rolesData, permsData),
      )
      .catch(() =>
        toast.error('Impossible de charger la matrice rôles × permissions.'),
      )
      .finally(() => setLoading(false));
  }, []);

  // Colonnes : rôles dans l'ordre figé, restreints à ceux réellement
  // présents en base.
  const colonnes = useMemo(() => {
    const parCode = new Map(roles.map((r) => [r.codeRole, r]));
    return ROLE_ORDER.map((code) => parCode.get(code)).filter(
      (r): r is RoleResponse => Boolean(r),
    );
  }, [roles]);

  // Lignes filtrées (module + recherche) puis regroupées par module.
  const groupes = useMemo(() => {
    const q = rechercheDebounced.trim().toLowerCase();
    const filtrees = permissions.filter((p) => {
      if (filtreModule !== FILTRE_TOUS && p.module !== filtreModule)
        return false;
      if (
        q &&
        !p.codePermission.toLowerCase().includes(q) &&
        !p.libelle.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    const parModule = new Map<string, PermissionResponse[]>();
    for (const p of filtrees) {
      const liste = parModule.get(p.module) ?? [];
      liste.push(p);
      parModule.set(p.module, liste);
    }
    return [...parModule.entries()]
      .map(([module, perms]) => ({
        module,
        perms: perms.sort((a, b) =>
          a.codePermission.localeCompare(b.codePermission),
        ),
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [permissions, filtreModule, rechercheDebounced]);

  function toggle(role: RoleResponse, perm: PermissionResponse): void {
    if (estVerrouille(role.codeRole, perm.codePermission)) return;
    setDraft((prev) => {
      const next = new Set(prev);
      const k = lien(role.id, perm.id);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleModule(module: string): void {
    setModulesReplies((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  // Diff brouillon vs initial → liste des mutations à appliquer.
  const { ajouts, retraits } = useMemo(() => {
    const ajouts: string[] = [];
    const retraits: string[] = [];
    for (const k of draft) if (!initial.has(k)) ajouts.push(k);
    for (const k of initial) if (!draft.has(k)) retraits.push(k);
    return { ajouts, retraits };
  }, [draft, initial]);

  const dirty = ajouts.length + retraits.length > 0;

  // Résolution clé → libellés (rôle + permission) pour la confirmation.
  const roleById = useMemo(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles],
  );
  const permById = useMemo(
    () => new Map(permissions.map((p) => [p.id, p])),
    [permissions],
  );
  function decrire(k: string): { codeRole: string; codePermission: string } {
    const [roleId, permId] = k.split('::');
    return {
      codeRole: roleById.get(roleId)?.codeRole ?? roleId,
      codePermission: permById.get(permId)?.codePermission ?? permId,
    };
  }

  function annuler(): void {
    setDraft(new Set(initial));
  }

  async function enregistrer(): Promise<void> {
    setSaving(true);
    const ops: Promise<unknown>[] = [];
    for (const k of ajouts) {
      const [roleId, permId] = k.split('::');
      ops.push(ajouterPermissionRole(roleId, permId));
    }
    for (const k of retraits) {
      const [roleId, permId] = k.split('::');
      ops.push(retirerPermissionRole(roleId, permId));
    }
    const resultats = await Promise.allSettled(ops);
    const echecs = resultats.filter((r) => r.status === 'rejected').length;

    // Resync depuis le serveur : reflète les éventuels refus (garde-fous).
    try {
      const [rolesData, permsData] = await Promise.all([
        listRoles(),
        listPermissions(),
      ]);
      chargerEtatInitial(rolesData, permsData);
    } catch {
      /* resync best-effort */
    }

    setSaving(false);
    setConfirming(false);
    if (echecs === 0) {
      toast.success(
        `Matrice mise à jour : ${ajouts.length} ajout(s), ${retraits.length} retrait(s).`,
      );
    } else {
      toast.error(
        `${echecs} modification(s) refusée(s) (garde-fou). État resynchronisé.`,
      );
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rôles et permissions"
        description="Matrice d'attribution des permissions par rôle. Modification réservée au rôle ROLE.GERER."
        actions={
          <>
            <Button
              variant="outline"
              onClick={annuler}
              disabled={!dirty || saving}
              data-testid="btn-annuler"
            >
              Annuler
            </Button>
            <Button
              onClick={() => setConfirming(true)}
              disabled={!dirty || saving}
              data-testid="btn-enregistrer"
            >
              Enregistrer{dirty ? ` (${ajouts.length + retraits.length})` : ''}
            </Button>
          </>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={filtreModule} onValueChange={setFiltreModule}>
            <SelectTrigger data-testid="filter-module">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRE_TOUS}>Tous les modules</SelectItem>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)" />
          <Input
            className="pl-8"
            placeholder="Rechercher une permission…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            data-testid="search-permission"
          />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-md border border-(--border)">
          <table
            className="w-full border-collapse text-sm"
            data-testid="roles-permissions-table"
          >
            <thead className="bg-(--secondary)/40">
              <tr>
                <th className="sticky left-0 z-10 bg-(--secondary)/40 px-3 py-2 text-left font-semibold">
                  Permission
                </th>
                {colonnes.map((r) => (
                  <th
                    key={r.id}
                    className="px-3 py-2 text-center font-semibold whitespace-nowrap"
                    data-testid={`col-${r.codeRole}`}
                  >
                    {r.codeRole}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupes.map(({ module, perms }) => {
                const replie = modulesReplies.has(module);
                return (
                  <FragmentModule
                    key={module}
                    module={module}
                    perms={perms}
                    replie={replie}
                    colonnes={colonnes}
                    draft={draft}
                    onToggleModule={toggleModule}
                    onToggleCell={toggle}
                    nbColonnes={colonnes.length}
                  />
                );
              })}
              {groupes.length === 0 && (
                <tr>
                  <td
                    colSpan={colonnes.length + 1}
                    className="px-3 py-6 text-center text-(--muted-foreground)"
                  >
                    Aucune permission ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation avant sauvegarde groupée */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent data-testid="confirm-dialog">
          <DialogHeader>
            <DialogTitle>Confirmer les modifications</DialogTitle>
            <DialogDescription>
              Revue des changements avant application sur la matrice
              rôles × permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex gap-4">
              <span className="text-emerald-600" data-testid="confirm-count-add">
                + {ajouts.length} ajout(s)
              </span>
              <span className="text-red-600" data-testid="confirm-count-remove">
                − {retraits.length} retrait(s)
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {ajouts.map((k) => {
                const d = decrire(k);
                return (
                  <div key={`add-${k}`} className="text-emerald-700">
                    + {d.codePermission} → {d.codeRole}
                  </div>
                );
              })}
              {retraits.map((k) => {
                const d = decrire(k);
                return (
                  <div key={`rem-${k}`} className="text-red-700">
                    − {d.codePermission} ✕ {d.codeRole}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={enregistrer}
              disabled={saving || !dirty}
              data-testid="btn-confirmer"
            >
              {saving ? 'Enregistrement…' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FragmentModuleProps {
  module: string;
  perms: PermissionResponse[];
  replie: boolean;
  colonnes: RoleResponse[];
  draft: Set<string>;
  nbColonnes: number;
  onToggleModule: (module: string) => void;
  onToggleCell: (role: RoleResponse, perm: PermissionResponse) => void;
}

function FragmentModule({
  module,
  perms,
  replie,
  colonnes,
  draft,
  nbColonnes,
  onToggleModule,
  onToggleCell,
}: FragmentModuleProps): JSX.Element {
  return (
    <>
      <tr className="border-t border-(--border) bg-(--secondary)/20">
        <td colSpan={nbColonnes + 1} className="px-2 py-1">
          <button
            type="button"
            onClick={() => onToggleModule(module)}
            className="flex items-center gap-2 text-xs font-semibold uppercase text-(--muted-foreground) hover:text-(--foreground)"
            data-testid={`module-group-${module}`}
            aria-expanded={!replie}
          >
            <span>{replie ? '▸' : '▾'}</span>
            <span>{module}</span>
            <span className="font-normal lowercase">
              ({perms.length})
            </span>
          </button>
        </td>
      </tr>
      {!replie &&
        perms.map((perm) => (
          <tr
            key={perm.id}
            className="border-t border-(--border) hover:bg-(--secondary)/10"
          >
            <td className="sticky left-0 z-10 bg-(--background) px-3 py-1.5">
              <div className="font-medium">{perm.codePermission}</div>
              <div className="text-xs text-(--muted-foreground)">
                {perm.libelle}
              </div>
            </td>
            {colonnes.map((role) => {
              const verrouille = estVerrouille(
                role.codeRole,
                perm.codePermission,
              );
              const coche = draft.has(lien(role.id, perm.id));
              return (
                <td key={role.id} className="px-3 py-1.5 text-center">
                  {verrouille ? (
                    <span
                      className="inline-flex"
                      title="Permission verrouillée sur ADMIN (séparation des tâches)"
                      data-testid={`lock-${role.codeRole}-${perm.codePermission}`}
                    >
                      <Lock className="mx-auto h-4 w-4 text-(--muted-foreground)" />
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-(--primary)"
                      checked={coche}
                      onChange={() => onToggleCell(role, perm)}
                      aria-label={`${perm.codePermission} / ${role.codeRole}`}
                      data-testid={`cell-${role.codeRole}-${perm.codePermission}`}
                    />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}
