/**
 * CreerDelegationDialog (Lot 4.2.C) — création d'une délégation
 * temporaire. Le délégant est l'utilisateur courant.
 *
 * Choix possibles :
 *   - délégataire (parmi les users actifs ≠ moi)
 *   - sous-ensemble de mes user_perimetres ACTIFS et NATIFS
 *     (origine ≠ DELEGATION — anti-chaînage strict côté UI ;
 *     le backend re-vérifie avec rejet 400)
 *   - permissions parmi SAISIE / SOUMISSION / VALIDATION / PUBLICATION
 *   - dates de_début / de_fin
 *   - motif libre (≥ 3 caractères, ≤ 2000)
 *
 * Validation côté client uniquement informative — la règle
 * définitive vit côté backend (anti-chaînage, inclusion permissions,
 * etc.).
 */
import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import {
  creerDelegation,
  PERMISSION_DELEGABLE_DESCRIPTIONS,
  PERMISSION_DELEGABLE_LABELS,
  type PermissionDelegable,
} from '@/lib/api/delegations';
import {
  type AffectationPerimetre,
  listerMesPerimetres,
} from '@/lib/api/perimetres';

interface CreerDelegationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** id de l'utilisateur courant (le délégant). */
  currentUserId: string;
  onCreated: () => void;
}

const PERMS_DELEGABLES: PermissionDelegable[] = [
  'SAISIE',
  'SOUMISSION',
  'VALIDATION',
  'PUBLICATION',
];

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    return Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function CreerDelegationDialog({
  isOpen,
  onClose,
  currentUserId,
  onCreated,
}: CreerDelegationDialogProps): JSX.Element {
  const [perimetres, setPerimetres] = useState<AffectationPerimetre[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fkDelegataire, setFkDelegataire] = useState('');
  const [perimetreIds, setPerimetreIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<PermissionDelegable[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    // Lot Administration ADMIN.C — la liste des délégataires possibles
    // est désormais gérée par <UserAutocomplete /> avec recherche
    // serveur. On ne charge plus que les périmètres natifs ici.
    listerMesPerimetres()
      .then((p) => {
        // Anti-chaînage côté UI : on n'expose que les périmètres natifs.
        setPerimetres(
          p.filter(
            (x) => x.actif && x.origine !== 'DELEGATION',
          ),
        );
      })
      .catch((err) => toast.error(`Chargement impossible : ${parseError(err)}`))
      .finally(() => setLoading(false));
  }, [isOpen, currentUserId]);

  function resetForm(): void {
    setFkDelegataire('');
    setPerimetreIds([]);
    setPermissions([]);
    setDateDebut(today);
    setDateFin('');
    setMotif('');
  }

  function togglePerimetre(id: string): void {
    setPerimetreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function togglePermission(p: PermissionDelegable): void {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  const dateError = useMemo(() => {
    if (!dateFin) return 'date_fin requise';
    if (dateFin < dateDebut) return 'date_fin doit être ≥ date_debut';
    return null;
  }, [dateDebut, dateFin]);

  const peutCreer = useMemo(() => {
    return (
      fkDelegataire.length > 0 &&
      perimetreIds.length >= 1 &&
      permissions.length >= 1 &&
      motif.trim().length >= 3 &&
      !dateError
    );
  }, [fkDelegataire, perimetreIds, permissions, motif, dateError]);

  async function handleCreer(): Promise<void> {
    if (!peutCreer) return;
    setSubmitting(true);
    try {
      const r = await creerDelegation({
        fkDelegataire,
        perimetreUserPerimetreIds: perimetreIds,
        permissions,
        motif: motif.trim(),
        dateDebut,
        dateFin,
      });
      if (r.warnings.length > 0) {
        toast.success(
          `Délégation créée — ${r.warnings.length} avertissement(s) : ${r.warnings.join(' / ')}`,
        );
      } else {
        toast.success('Délégation créée.');
      }
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(`Création refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une délégation</DialogTitle>
          <DialogDescription>
            Déléguez temporairement vos droits sur un sous-ensemble de
            vos périmètres natifs. <strong>Anti-chaînage strict</strong> :
            les périmètres reçus eux-mêmes par délégation ne sont pas
            re-déléguables.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-(--muted-foreground)">Chargement…</p>
        ) : (
          <div className="space-y-4">
            {/* Délégataire — Lot Administration ADMIN.C : autocomplete
                avec recherche serveur (remplace la liste fixe) */}
            <div className="space-y-1">
              <Label htmlFor="delegataire">
                Délégataire <span className="text-red-500">*</span>
              </Label>
              <UserAutocomplete
                testId="select-delegataire"
                value={fkDelegataire || null}
                onChange={(id) => setFkDelegataire(id ?? '')}
                excludeUserIds={[currentUserId]}
                placeholder="Rechercher un utilisateur (email, nom, prénom)…"
              />
            </div>

            {/* Périmètres délégables */}
            <div className="space-y-2">
              <Label>
                Périmètres à déléguer <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-(--muted-foreground) ml-2">
                  (vos affectations natives uniquement — anti-chaînage)
                </span>
              </Label>
              <div
                className="space-y-1 rounded-md border border-(--border) p-2 max-h-48 overflow-y-auto"
                data-testid="liste-perimetres-delegables"
              >
                {perimetres.length === 0 && (
                  <p className="text-xs text-(--muted-foreground)">
                    Aucun périmètre natif délégable.
                  </p>
                )}
                {perimetres.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    data-testid={`perimetre-${p.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={perimetreIds.includes(p.id)}
                      onChange={() => togglePerimetre(p.id)}
                    />
                    <span className="font-mono text-xs bg-(--muted) px-1 rounded">
                      {p.cibleType}
                    </span>
                    <span>
                      {p.cibleType === 'CR_SET'
                        ? `${p.cibleCrIds?.length ?? 0} CR`
                        : (p.cibleId ?? '?')}
                    </span>
                    <span className="text-xs text-(--muted-foreground)">
                      du {p.dateDebut} au {p.dateFin ?? '∞'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>
                Permissions à déléguer <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMS_DELEGABLES.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-(--border) px-2 py-1"
                    data-testid={`permission-${p}`}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(p)}
                      onChange={() => togglePermission(p)}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="underline decoration-dotted underline-offset-2"
                          data-testid={`permission-label-${p}`}
                        >
                          {PERMISSION_DELEGABLE_LABELS[p]}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {PERMISSION_DELEGABLE_DESCRIPTIONS[p]}
                      </TooltipContent>
                    </Tooltip>
                  </label>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-debut">Date début *</Label>
                <Input
                  id="date-debut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  data-testid="input-date-debut"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-fin">Date fin *</Label>
                <Input
                  id="date-fin"
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  data-testid="input-date-fin"
                />
                {dateError && dateFin && (
                  <p className="text-xs text-red-500">{dateError}</p>
                )}
              </div>
            </div>

            {/* Motif */}
            <div className="space-y-1">
              <Label htmlFor="motif">
                Motif <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="motif"
                data-testid="input-motif"
                className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm"
                rows={2}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex : Mission BCEAO du 15/01 au 31/01."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleCreer}
            disabled={!peutCreer || submitting}
            data-testid="btn-creer-delegation"
          >
            {submitting ? 'Création…' : 'Créer la délégation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
