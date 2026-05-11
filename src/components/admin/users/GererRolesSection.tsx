/**
 * GererRolesSection (Lot Administration ADMIN.B) — section "Rôles
 * attribués" affichée dans la fiche user. Liste les rôles actifs en
 * badges + dropdown "Ajouter un rôle" (filtre ceux déjà attribués) +
 * bouton X par badge avec confirmation.
 *
 * Cumul de rôles autorisé (D2). Garde-fou ≥ 1 rôle géré côté backend.
 */
import { AxiosError } from 'axios';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listRoles } from '@/lib/api/roles';
import type { RoleResponse } from '@/lib/api/types';
import {
  attribuerRoleUser,
  listerRolesUser,
  retirerRoleUser,
  type UserRoleResume,
} from '@/lib/api/users';

interface GererRolesSectionProps {
  userId: string;
  userEmail: string;
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    return Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function GererRolesSection({
  userId,
  userEmail,
}: GererRolesSectionProps): JSX.Element {
  const [rolesActifs, setRolesActifs] = useState<UserRoleResume[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<RoleResponse[]>([]);
  const [selection, setSelection] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh est une fonction locale stable definie inline (pas useCallback) ; pattern intentionnel "refetch quand userId change"
  }, [userId]);

  function refresh(): void {
    Promise.all([listerRolesUser(userId), listRoles()])
      .then(([actifs, all]) => {
        setRolesActifs(actifs);
        const idsActifs = new Set(actifs.map((a) => a.fkRole));
        setRolesDisponibles(all.filter((r) => r.estActif && !idsActifs.has(r.id)));
      })
      .catch(() => toast.error('Impossible de charger les rôles.'));
  }

  async function handleAjouter(): Promise<void> {
    if (!selection) return;
    setSubmitting(true);
    try {
      await attribuerRoleUser(userId, { fkRole: selection });
      toast.success('Rôle attribué.');
      setSelection('');
      refresh();
    } catch (err) {
      toast.error(`Échec : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetirer(role: UserRoleResume): Promise<void> {
    if (!window.confirm(`Retirer le rôle ${role.codeRole} à ${userEmail} ?`)) {
      return;
    }
    try {
      await retirerRoleUser(userId, role.fkRole);
      toast.success('Rôle retiré.');
      refresh();
    } catch (err) {
      toast.error(`Échec : ${parseError(err)}`);
    }
  }

  return (
    <div
      className="rounded-md border border-(--border) p-3 space-y-3"
      data-testid="gerer-roles-section"
    >
      <Label className="text-sm font-semibold">Rôles attribués</Label>
      <div className="flex flex-wrap gap-2" data-testid="roles-actifs">
        {rolesActifs.length === 0 && (
          <span className="text-xs text-(--muted-foreground)">
            Aucun rôle (le user ne pourra pas se connecter utilement).
          </span>
        )}
        {rolesActifs.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-1 rounded-full bg-(--accent)/40 px-2 py-1 text-xs"
            data-testid={`badge-role-${r.codeRole}`}
          >
            <span className="font-medium">{r.codeRole}</span>
            <span className="text-(--muted-foreground)">— {r.libelle}</span>
            <button
              type="button"
              onClick={() => handleRetirer(r)}
              className="ml-1 hover:text-red-500"
              aria-label={`Retirer ${r.codeRole}`}
              data-testid={`btn-retirer-${r.codeRole}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {rolesDisponibles.length > 0 && (
        <div className="flex items-end gap-2 pt-2 border-t border-(--border)">
          <div className="flex-1">
            <Label htmlFor="add-role" className="text-xs">
              Ajouter un rôle
            </Label>
            <Select
              value={selection || undefined}
              onValueChange={setSelection}
            >
              <SelectTrigger id="add-role" data-testid="select-role-ajout">
                <SelectValue placeholder="Choisir un rôle…" />
              </SelectTrigger>
              <SelectContent>
                {rolesDisponibles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.codeRole} — {r.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAjouter}
            disabled={!selection || submitting}
            data-testid="btn-ajouter-role"
          >
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
}
