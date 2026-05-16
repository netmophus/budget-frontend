/**
 * LigneMetierFormDrawer (Lot 2.5D + Lot 7.3 V14 refonte Charte v1).
 *
 * Modale de création / édition d'une ligne métier (axe d'activité
 * bancaire). SCD2 + auto-référence parent.
 *
 * Refondue V14 dans le pattern unifié des modales (V11/V12) :
 *   - header gradient bleu nuit dark→light avec icône LayoutGrid ambre
 *   - body scrollable flex-1 + footer sticky shrink-0
 *   - Niveau via 4 tiles (1/2/3/4) au lieu d'un input number
 *
 * Logique métier 100 % préservée :
 *   - useScd2EditDiff (bandeau jaune/bleu en mode édition)
 *   - parentsEligibles avec anti-cycle BFS (descendance exclue)
 *   - Conversion automatique en MAJUSCULES côté code
 *   - 4 modes maj SCD2 (no_op / in_place_est_actif /
 *     ecrasement_intra_jour / nouvelle_version)
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Check,
  Hash,
  Info,
  LayoutGrid,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CreateLigneMetierDto,
  createLigneMetier,
  type LigneMetier,
  type LigneMetierModeMaj,
  listLignesMetier,
  type UpdateLigneMetierDto,
  updateLigneMetier,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { cn } from '@/lib/utils';

const NONE = '__none__';
const NIVEAU_MAX = 4;

interface FormState extends Record<string, unknown> {
  codeLigneMetier: string;
  libelle: string;
  niveau: number;
  fkLigneMetierParent: string;
  estActif: boolean;
}

const SCD2_FIELDS = ['libelle', 'niveau', 'fkLigneMetierParent'] as const;

function initialFromLigne(l: LigneMetier | null): FormState {
  if (!l) {
    return {
      codeLigneMetier: '',
      libelle: '',
      niveau: 1,
      fkLigneMetierParent: '',
      estActif: true,
    };
  }
  return {
    codeLigneMetier: l.codeLigneMetier,
    libelle: l.libelle,
    niveau: l.niveau,
    fkLigneMetierParent: l.fkLigneMetierParent ?? '',
    estActif: l.estActif,
  };
}

function parseApiError(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const dataMsg =
      (err.response?.data as { message?: string | string[] } | undefined)
        ?.message;
    const message = Array.isArray(dataMsg)
      ? dataMsg.join(' ; ')
      : (dataMsg ?? err.message);
    return { status, message };
  }
  return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
}

interface LigneMetierFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: LigneMetier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ligne: LigneMetier, modeMaj: LigneMetierModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<LigneMetierModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

export function LigneMetierFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: LigneMetierFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromLigne(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [allLignes, setAllLignes] = useState<LigneMetier[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listLignesMetier({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setAllLignes(res.items))
      .catch(() =>
        toast.error('Impossible de charger les lignes métier parentes'),
      );
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromLigne(initial ?? null));
    }
  }, [isOpen, initial]);

  const idsExclus = useMemo(() => {
    if (mode !== 'edit' || !initial) return new Set<string>();
    const exclus = new Set<string>([initial.id]);
    let frontier = [initial.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const l of allLignes) {
        if (
          l.fkLigneMetierParent !== null &&
          frontier.includes(l.fkLigneMetierParent)
        ) {
          if (!exclus.has(l.id)) {
            exclus.add(l.id);
            next.push(l.id);
          }
        }
      }
      frontier = next;
    }
    return exclus;
  }, [allLignes, mode, initial]);

  const parentsEligibles = useMemo(() => {
    return allLignes.filter((l) => {
      if (idsExclus.has(l.id)) return false;
      if (l.niveau >= form.niveau) return false;
      if (!l.estActif) return false;
      return true;
    });
  }, [allLignes, idsExclus, form.niveau]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_]{2,50}$/.test(form.codeLigneMetier);
  const isRacine = form.niveau === 1;

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.niveau >= 1 &&
    form.niveau <= NIVEAU_MAX &&
    codeValide &&
    (isRacine || form.fkLigneMetierParent !== '');

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromLigne(initial ?? null),
    form,
    scd2Fields: [...SCD2_FIELDS],
    dateDebutValiditeInitiale: initial?.dateDebutValidite,
  });
  const bandeau = mode === 'edit' && initial ? editDiff.bandeau : null;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const dto: CreateLigneMetierDto = {
          codeLigneMetier: form.codeLigneMetier.toUpperCase(),
          libelle: form.libelle,
          niveau: form.niveau,
          ...(form.fkLigneMetierParent
            ? { fkLigneMetierParent: form.fkLigneMetierParent }
            : {}),
        };
        const created = await createLigneMetier(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateLigneMetierDto = {
        ...(editDiff.diff as UpdateLigneMetierDto),
      };
      if (
        'fkLigneMetierParent' in dto &&
        (dto.fkLigneMetierParent as string) === ''
      ) {
        dto.fkLigneMetierParent = null;
      }
      const updated = await updateLigneMetier(initial.codeLigneMetier, dto);
      onSuccess(updated, updated.modeMaj ?? null);
      if (updated.modeMaj && updated.modeMaj !== 'no_op') {
        toast.success(MODE_MAJ_LIBELLES[updated.modeMaj]);
      } else if (updated.modeMaj === 'no_op') {
        toast.info(MODE_MAJ_LIBELLES.no_op);
      }
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        if (mode === 'create') {
          toast.error(`Le code '${form.codeLigneMetier}' existe déjà.`);
        } else {
          toast.error(message);
        }
      } else if (status === 422 || status === 400) {
        toast.error(message);
      } else {
        toast.error(message || "Échec de l'enregistrement.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const titre =
    mode === 'create' ? 'Nouvelle ligne métier' : 'Modifier la ligne métier';
  const sousTitre =
    mode === 'create'
      ? "Créer un axe d'activité bancaire dans la hiérarchie SCD2."
      : `Code business : ${initial?.codeLigneMetier ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* Header gradient (shrink-0) */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
          data-testid="lm-form-header"
        >
          <div className="flex items-start gap-2.5">
            <LayoutGrid
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                {titre}
              </DialogTitle>
              <p className="text-xs text-white/95 mt-1.5">{sousTitre}</p>
            </div>
          </div>
        </div>

        {/* Body scrollable (flex-1) */}
        <div className="px-7 py-5 overflow-y-auto flex-1">
          {bandeau && (
            <div
              className={cn(
                'rounded-md border p-3 text-sm space-y-1 mb-4',
                bandeau.type === 'jaune'
                  ? 'border-yellow-300 bg-yellow-50'
                  : bandeau.type === 'bleu'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-sky-300 bg-sky-50',
              )}
              data-testid="lm-form-bandeau-scd2"
            >
              <div className="flex items-center gap-2 font-semibold">
                {bandeau.type === 'jaune' ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4" aria-hidden="true" />
                )}
                {bandeau.titre}
              </div>
              <p>{bandeau.message}</p>
            </div>
          )}

          {/* Code */}
          <div className="mb-4">
            <Label
              htmlFor="codeLigneMetier"
              className="text-sm font-medium text-(--foreground)"
            >
              Code ligne métier{' '}
              <span className="text-(--destructive)">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Hash
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="codeLigneMetier"
                value={form.codeLigneMetier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codeLigneMetier: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ex. RETAIL_PARTICULIERS"
                disabled={mode === 'edit' || submitting}
                maxLength={50}
                className="pl-9 h-9 font-mono"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _, max 50 caractères.'}
              {mode === 'create' &&
                form.codeLigneMetier !== '' &&
                !codeValide && (
                  <span className="block text-(--destructive) mt-1">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
          </div>

          {/* Libellé */}
          <div className="mb-4">
            <Label
              htmlFor="libelle"
              className="text-sm font-medium text-(--foreground)"
            >
              Libellé <span className="text-(--destructive)">*</span>
            </Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="ex. Particuliers"
              disabled={submitting}
              maxLength={200}
              className="h-9 mt-1.5"
            />
          </div>

          {/* Niveau — 4 tiles */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Niveau <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-4 gap-1.5 mt-1.5"
              role="radiogroup"
              aria-label="Niveau"
            >
              {[1, 2, 3, 4].map((n) => (
                <NiveauTile
                  key={n}
                  n={n as 1 | 2 | 3 | 4}
                  selected={form.niveau === n}
                  onSelect={() => setForm({ ...form, niveau: n })}
                  disabled={submitting}
                />
              ))}
              <input
                id="niveau"
                type="hidden"
                value={form.niveau}
                readOnly
                aria-label="Niveau (caché)"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              1 = racine, 4 = feuille
            </p>
          </div>

          {/* Parent */}
          <div className="mb-2">
            <Label
              htmlFor="parent"
              className="text-sm font-medium text-(--foreground)"
            >
              Ligne parente
              {!isRacine && <span className="text-(--destructive)"> *</span>}
            </Label>
            <Select
              value={form.fkLigneMetierParent || NONE}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  fkLigneMetierParent: v === NONE ? '' : v,
                })
              }
              disabled={submitting}
            >
              <SelectTrigger id="parent" className="h-9 mt-1.5">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune (racine)</SelectItem>
                {parentsEligibles.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.codeLigneMetier} — {l.libelle} (niveau {l.niveau})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {isRacine
                ? 'Optionnel — une ligne niveau 1 est typiquement racine.'
                : 'Liste filtrée : niveau strictement inférieur, courantes, actives, hors descendants.'}
            </p>
          </div>

          {mode === 'edit' && (
            <div className="mt-4 pt-4 border-t border-(--border)">
              <Label
                htmlFor="estActif"
                className="text-sm font-medium text-(--foreground)"
              >
                Statut
              </Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1.5">
                <input
                  id="estActif"
                  type="checkbox"
                  checked={form.estActif}
                  onChange={(e) =>
                    setForm({ ...form, estActif: e.target.checked })
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
                />
                {form.estActif ? 'Actif' : 'Inactif'}
              </label>
            </div>
          )}
        </div>

        {/* Footer sticky (shrink-0) */}
        <div
          className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0"
          data-testid="lm-form-footer"
        >
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting} className="gap-1.5">
              <X className="w-3 h-3" />
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Check className="w-3 h-3" />
            {submitting
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Créer'
                : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface NiveauTileProps {
  n: 1 | 2 | 3 | 4;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function NiveauTile({
  n,
  selected,
  onSelect,
  disabled,
}: NiveauTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`lm-niveau-tile-${n}`}
      className={cn(
        'h-9 border rounded-md flex items-center justify-center text-[13px] font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'border-(--miznas-ambre) bg-(--miznas-ambre)/[0.06] text-(--miznas-ambre) font-semibold'
          : 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      {n}
    </button>
  );
}
