/**
 * CreerDelegationDialog (Lot 4.2.C + Lot 7.3 V9 refonte Charte v1).
 *
 * Création d'une délégation temporaire. Le délégant est l'utilisateur
 * courant.
 *
 * Choix possibles :
 *   - délégataire (parmi les users actifs ≠ moi, autocomplete serveur)
 *   - sous-ensemble de mes user_perimetres ACTIFS et NATIFS
 *     (origine ≠ DELEGATION — anti-chaînage strict côté UI ;
 *     le backend re-vérifie avec rejet 400)
 *   - permissions parmi SAISIE / SOUMISSION / VALIDATION / PUBLICATION
 *   - dates de_début / de_fin
 *   - motif libre (≥ 3 caractères, ≤ 2000)
 *
 * Validation côté client uniquement informative — la règle définitive
 * vit côté backend (anti-chaînage, inclusion permissions, etc.).
 *
 * Refonte V9 :
 *  - Header gradient bleu nuit dark→light avec icône Plus ambre
 *  - Bandeau ambre permanent rappelant la règle anti-chaînage métier
 *  - Champs avec icônes Lucide (Search/Calendar/FolderX)
 *  - Footer avec fond léger et bouton Check sur "Créer la délégation"
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Calendar,
  Check,
  FolderX,
  Plus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    listerMesPerimetres()
      .then((p) => {
        setPerimetres(
          p.filter((x) => x.actif && x.origine !== 'DELEGATION'),
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
      {/*
        Override DialogContent par défaut :
        - !p-0 : on gère nous-même les paddings par section
        - gap-0 : pas d'espacement vertical entre nos sections
        - overflow-hidden : pour que le gradient header soit clipé
          + bord arrondi shadcn préservé
        - flex flex-col : structure header/body/footer empilée pour
          que le footer reste sticky en bas (Lot 7.3 V9.1 fix)
        - max-h-[90vh] : limite la modale à 90 % du viewport
        - [&>button]:text-white : la <DialogPrimitive.Close> par défaut
          (X en haut à droite, posé en absolute) reçoit notre couleur
          blanche pour être lisible sur le gradient
      */}
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-2xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* ─── Header gradient (shrink-0 = jamais rétracté) ───── */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
          data-testid="creer-delegation-header"
        >
          <div className="flex items-start gap-2.5">
            <Plus
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                Créer une délégation
              </DialogTitle>
              <p className="text-xs opacity-70 mt-1.5 leading-relaxed max-w-md">
                Déléguez temporairement vos droits sur un sous-ensemble
                de vos périmètres natifs.
              </p>
            </div>
          </div>

          {/* Bandeau ambre permanent — règle métier anti-chaînage */}
          <div
            className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-sm border"
            style={{
              backgroundColor: '#BA751726',
              borderColor: '#BA75174D',
            }}
            data-testid="creer-delegation-bandeau-anti-chainage"
          >
            <AlertTriangle
              className="w-3 h-3 text-(--miznas-ambre)"
              aria-hidden="true"
            />
            <span className="text-[11px] text-(--miznas-ambre) opacity-90">
              Anti-chaînage : les périmètres reçus eux-mêmes ne sont
              pas re-délégables.
            </span>
          </div>
        </div>

        {/* ─── Corps (flex-1 = prend l'espace dispo, scrollable) ──
            Le `flex-1` est combiné à `overflow-y-auto` pour que
            seul le body scrolle quand le contenu dépasse — header
            et footer restent ancrés. */}
        <div className="px-7 py-6 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-(--muted-foreground)">Chargement…</p>
          ) : (
            <div className="space-y-4">
              {/* Délégataire */}
              <div className="space-y-1">
                <Label
                  htmlFor="delegataire"
                  className="text-sm font-medium text-(--foreground)"
                >
                  Délégataire <span className="text-(--destructive)">*</span>
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
                <Label className="text-sm font-medium text-(--foreground)">
                  Périmètres à déléguer{' '}
                  <span className="text-(--destructive)">*</span>
                  <span className="text-xs font-normal text-(--muted-foreground) ml-2">
                    (vos affectations natives uniquement)
                  </span>
                </Label>
                <div
                  className="rounded-md border border-(--border) p-2 max-h-48 overflow-y-auto"
                  data-testid="liste-perimetres-delegables"
                >
                  {perimetres.length === 0 ? (
                    <div
                      className="flex items-center gap-2 px-2 py-3"
                      data-testid="perimetres-empty-state"
                    >
                      <FolderX
                        className="w-4 h-4 shrink-0"
                        style={{ color: '#B05D3F' }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-(--muted-foreground)">
                        Aucun périmètre natif délégable.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
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
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-(--foreground)">
                  Permissions à déléguer{' '}
                  <span className="text-(--destructive)">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMS_DELEGABLES.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-(--border) px-2.5 py-1.5 hover:bg-(--secondary)/40 transition-colors"
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
                  <Label
                    htmlFor="date-debut"
                    className="text-sm font-medium text-(--foreground)"
                  >
                    Date début <span className="text-(--destructive)">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--muted-foreground) pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="date-debut"
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      data-testid="input-date-debut"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="date-fin"
                    className="text-sm font-medium text-(--foreground)"
                  >
                    Date fin <span className="text-(--destructive)">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--muted-foreground) pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="date-fin"
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      data-testid="input-date-fin"
                      className="pl-10"
                    />
                  </div>
                  {dateError && dateFin && (
                    <p className="text-xs text-(--destructive)">{dateError}</p>
                  )}
                </div>
              </div>

              {/* Motif */}
              <div className="space-y-1">
                <Label
                  htmlFor="motif"
                  className="text-sm font-medium text-(--foreground)"
                >
                  Motif <span className="text-(--destructive)">*</span>
                </Label>
                <textarea
                  id="motif"
                  data-testid="input-motif"
                  className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) min-h-16"
                  rows={3}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex : Mission BCEAO du 15/01 au 31/01."
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer (shrink-0 = sticky, toujours visible) ──────
            Le `shrink-0` empêche le body scrollable de pousser le
            footer hors de l'écran sur petits viewports — les
            actions Annuler / Créer restent ancrées en bas. */}
        <div
          className="px-7 py-3.5 border-t border-(--border) bg-(--secondary) flex justify-end gap-2.5 shrink-0"
          data-testid="creer-delegation-footer"
        >
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={handleCreer}
            disabled={!peutCreer || submitting}
            data-testid="btn-creer-delegation"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {submitting ? 'Création…' : 'Créer la délégation'}
          </Button>
        </div>

        {/* X de fermeture par défaut shadcn (rendu en absolute par
            DialogContent) : sa couleur est forcée en blanc via
            le sélecteur [&>button]:text-white du className parent
            pour rester lisible sur le header gradient. La X
            shadcn s'auto-positionne `absolute right-4 top-4` —
            elle tombe naturellement sur notre header. */}
      </DialogContent>
    </Dialog>
  );
}
