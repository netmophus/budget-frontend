/**
 * CrFormDrawer (Lot 2.5F + Lot 7.3 V11 refonte Charte v1).
 *
 * Modale de création / édition d'un centre de responsabilité. Malgré
 * son nom historique "Drawer", c'est en réalité une `<Dialog>` shadcn
 * — refondue V11 pour adopter le pattern unifié des modales :
 *   - header gradient bleu nuit dark→light (cohérence avec
 *     CreerDelegationDialog et PublicLayout)
 *   - body scrollable flex-1 + footer sticky shrink-0 (anti-bug
 *     "boutons hors écran" sur viewports ≤ 768 px de hauteur)
 *   - Type CR sélectionné via 4 tiles (CDC / CDP / CDR / Autre) avec
 *     bordure colorée et icône TypeCRBadge — plus visuel que
 *     l'ancien <RefSecondaireSelect>
 *
 * Logique métier 100 % préservée :
 *   - Hook `useScd2EditDiff` (bandeau jaune/bleu en mode édition)
 *   - Modes de mise à jour SCD2 (no_op, in_place_est_actif,
 *     ecrasement_intra_jour, nouvelle_version)
 *   - Validation côté client (codeValide, canSubmit)
 *   - Conversion automatique en MAJUSCULES côté code CR
 *   - Toggle estActif (mode edit)
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Building2,
  Check,
  Hash,
  Info,
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
  type CentreResponsabilite,
  type CreateCrDto,
  type CrModeMaj,
  createCr,
  listStructures,
  type Structure,
  type TypeCr,
  type UpdateCrDto,
  updateCr,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { cn } from '@/lib/utils';

import { TypeCRBadge } from '@/pages/CentresResponsabilitePage';

interface FormState extends Record<string, unknown> {
  codeCr: string;
  libelle: string;
  libelleCourt: string;
  typeCr: string;
  fkStructure: string;
  estActif: boolean;
}

const SCD2_FIELDS = [
  'libelle',
  'libelleCourt',
  'typeCr',
  'fkStructure',
] as const;

function initialFromCr(c: CentreResponsabilite | null): FormState {
  if (!c) {
    return {
      codeCr: '',
      libelle: '',
      libelleCourt: '',
      typeCr: '',
      fkStructure: '',
      estActif: true,
    };
  }
  return {
    codeCr: c.codeCr,
    libelle: c.libelle,
    libelleCourt: c.libelleCourt ?? '',
    typeCr: c.typeCr,
    fkStructure: c.fkStructure,
    estActif: c.estActif,
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

interface CrFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: CentreResponsabilite | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cr: CentreResponsabilite, modeMaj: CrModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<CrModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

const TYPE_CR_TILES: Array<{
  type: TypeCr;
  label: string;
  description: string;
  hex: string;
}> = [
  { type: 'cdc', label: 'Coût', description: 'Centre de coût', hex: '#BA7517' },
  { type: 'cdp', label: 'Profit', description: 'Centre de profit', hex: '#0C447C' },
  { type: 'cdr', label: 'Revenu', description: 'Centre de revenu', hex: '#5B4E91' },
  { type: 'autre', label: 'Autre', description: 'Hors typologie standard', hex: '#5F6B7A' },
];

export function CrFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: CrFormDrawerProps) {
  const [form, setForm] = useState<FormState>(initialFromCr(initial ?? null));
  const [submitting, setSubmitting] = useState(false);
  const [structures, setStructures] = useState<Structure[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listStructures({ page: 1, limit: 200 })
      .then((res) => setStructures(res.items))
      .catch(() =>
        toast.error('Impossible de charger les structures rattachables'),
      );
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromCr(initial ?? null));
    }
  }, [isOpen, initial]);

  const structuresTriees = useMemo(() => {
    return [...structures]
      .filter((s) => s.estActif)
      .sort((a, b) => {
        if (a.niveauHierarchique !== b.niveauHierarchique) {
          return a.niveauHierarchique - b.niveauHierarchique;
        }
        return a.codeStructure.localeCompare(b.codeStructure);
      });
  }, [structures]);

  const codeValide =
    mode === 'edit' ? true : /^[A-Z0-9_-]{2,50}$/.test(form.codeCr);

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeCr !== '' &&
    form.fkStructure !== '' &&
    codeValide;

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromCr(initial ?? null),
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
        const dto: CreateCrDto = {
          codeCr: form.codeCr.toUpperCase(),
          libelle: form.libelle,
          typeCr: form.typeCr as TypeCr,
          fkStructure: form.fkStructure,
          ...(form.libelleCourt ? { libelleCourt: form.libelleCourt } : {}),
        };
        const created = await createCr(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateCrDto = { ...(editDiff.diff as UpdateCrDto) };
      const updated = await updateCr(initial.codeCr, dto);
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
          toast.error(`Le code '${form.codeCr}' existe déjà.`);
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
    mode === 'create'
      ? 'Nouveau centre de responsabilité'
      : 'Modifier le centre de responsabilité';
  const sousTitre =
    mode === 'create'
      ? 'Renseignez les informations pour créer un CR.'
      : `Code business : ${initial?.codeCr ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-2xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* ─── Header gradient (shrink-0) ──────────────────────── */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
          data-testid="cr-form-header"
        >
          <div className="flex items-start gap-2.5">
            <Building2
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

        {/* ─── Body scrollable (flex-1) ────────────────────────── */}
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
              data-testid="cr-form-bandeau-scd2"
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

          {/* Code CR */}
          <div className="mb-4">
            <Label
              htmlFor="codeCr"
              className="text-sm font-medium text-(--foreground)"
            >
              Code CR <span className="text-(--destructive)">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Hash
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="codeCr"
                value={form.codeCr}
                onChange={(e) =>
                  setForm({ ...form, codeCr: e.target.value.toUpperCase() })
                }
                placeholder="ex. CR_AG_ABJ_PLATEAU"
                disabled={mode === 'edit' || submitting}
                maxLength={50}
                className="pl-9 h-9 font-mono"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _ + -, max 50 caractères.'}
              {mode === 'create' &&
                form.codeCr !== '' &&
                !codeValide && (
                  <span className="block text-(--destructive) mt-1">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
          </div>

          {/* Libellé + Libellé court */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
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
                placeholder="ex. CR Agence Plateau"
                disabled={submitting}
                maxLength={200}
                className="h-9 mt-1.5"
              />
            </div>
            <div>
              <Label
                htmlFor="libelleCourt"
                className="text-sm font-medium text-(--foreground)"
              >
                Libellé court
              </Label>
              <Input
                id="libelleCourt"
                value={form.libelleCourt}
                onChange={(e) =>
                  setForm({ ...form, libelleCourt: e.target.value })
                }
                placeholder="ex. CR Plateau"
                disabled={submitting}
                maxLength={50}
                className="h-9 mt-1.5"
              />
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                Optionnel — affichage compact
              </p>
            </div>
          </div>

          {/* Type CR — 4 tiles */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Type CR <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2"
              role="radiogroup"
              aria-label="Type CR"
            >
              {TYPE_CR_TILES.map((tile) => (
                <TypeCRTile
                  key={tile.type}
                  type={tile.type}
                  label={tile.label}
                  description={tile.description}
                  hex={tile.hex}
                  selected={form.typeCr === tile.type}
                  onSelect={() => setForm({ ...form, typeCr: tile.type })}
                  disabled={submitting}
                />
              ))}
            </div>
          </div>

          {/* Structure rattachée */}
          <div className="mb-2">
            <Label
              htmlFor="fkStructure"
              className="text-sm font-medium text-(--foreground)"
            >
              Structure rattachée{' '}
              <span className="text-(--destructive)">*</span>
            </Label>
            <Select
              value={form.fkStructure || undefined}
              onValueChange={(v) => setForm({ ...form, fkStructure: v })}
              disabled={submitting}
            >
              <SelectTrigger id="fkStructure" className="h-9 mt-1.5">
                <SelectValue placeholder="Choisir une structure…" />
              </SelectTrigger>
              <SelectContent>
                {structuresTriees.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono">
                      {'  '.repeat(Math.max(0, s.niveauHierarchique - 1))}
                      {s.codeStructure}
                    </span>
                    <span className="ml-2 text-(--muted-foreground)">
                      — {s.libelle}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5 leading-relaxed">
              Rattachement à la version courante de la structure. Le hook
              backend gère le relink lors d&apos;une révision SCD2.
            </p>
          </div>

          {/* Statut estActif (mode edit uniquement) */}
          {mode === 'edit' && (
            <div className="mt-4">
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

        {/* ─── Footer sticky (shrink-0) ─────────────────────────── */}
        <div
          className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0"
          data-testid="cr-form-footer"
        >
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={submitting}
              className="gap-1.5"
            >
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

// ─── TypeCRTile (3+1 tiles sélectionnables) ─────────────────────

interface TypeCRTileProps {
  type: TypeCr;
  label: string;
  description: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function TypeCRTile({
  type,
  label,
  description,
  hex,
  selected,
  onSelect,
  disabled,
}: TypeCRTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`type-cr-tile-${type}`}
      style={
        selected
          ? {
              borderColor: hex,
              backgroundColor: `${hex}10`,
            }
          : undefined
      }
      className={cn(
        'border rounded-md p-2.5 text-left transition-colors',
        'hover:bg-(--muted)/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !selected && 'border-(--border) bg-white',
      )}
    >
      <div className="flex items-center gap-1.5">
        <TypeCRBadge type={type} />
        <span
          className={cn('text-xs font-medium')}
          style={selected ? { color: hex } : undefined}
        >
          {label}
        </span>
      </div>
      <div className="text-[11px] text-(--muted-foreground) mt-1">
        {description}
      </div>
    </button>
  );
}
