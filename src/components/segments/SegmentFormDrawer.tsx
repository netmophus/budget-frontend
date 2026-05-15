/**
 * SegmentFormDrawer (Lot 2.5B + Lot 7.3 V16 refonte Charte v1).
 *
 * Modale de création / édition d'un segment commercial.
 *
 * Refondue V16 dans le pattern unifié des modales (V11/V12/V14/V15) :
 *   - header gradient bleu nuit dark→light avec icône Target ambre
 *   - body scrollable flex-1 + footer sticky shrink-0
 *   - Catégorie via 6 tiles statiques (PARTICULIER/PME/GRANDE_ENTREPRISE
 *     /PROFESSIONNEL/INSTITUTIONNEL/SECTEUR_PUBLIC) en grid 3×2 avec
 *     couleurs distinctes au sélectionné
 *
 * Logique métier 100 % préservée :
 *   - useScd2EditDiff (bandeau jaune/bleu/sky en mode édition)
 *   - 4 modes maj SCD2 (no_op / in_place_est_actif /
 *     ecrasement_intra_jour / nouvelle_version)
 *   - Conversion automatique en MAJUSCULES côté code
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Check,
  Hash,
  Info,
  Target,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  type CreateSegmentDto,
  createSegment,
  type Segment,
  type SegmentModeMaj,
  type UpdateSegmentDto,
  updateSegment,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { cn } from '@/lib/utils';

interface FormState extends Record<string, unknown> {
  codeSegment: string;
  libelle: string;
  categorie: string;
  estActif: boolean;
}

const SCD2_FIELDS = ['libelle', 'categorie'] as const;

function initialFromSegment(s: Segment | null): FormState {
  if (!s) {
    return {
      codeSegment: '',
      libelle: '',
      categorie: '',
      estActif: true,
    };
  }
  return {
    codeSegment: s.codeSegment,
    libelle: s.libelle,
    categorie: s.categorie,
    estActif: s.estActif,
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

interface SegmentFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Segment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (segment: Segment, modeMaj: SegmentModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<SegmentModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

const CATEGORIE_TILES: Array<{
  cat: string;
  label: string;
  hex: string;
}> = [
  { cat: 'particulier', label: 'Particulier', hex: '#0C447C' },
  { cat: 'pme', label: 'PME', hex: '#0F6E56' },
  { cat: 'grande_entreprise', label: 'Grande entreprise', hex: '#5B4E91' },
  { cat: 'professionnel', label: 'Professionnel', hex: '#B05D3F' },
  { cat: 'institutionnel', label: 'Institutionnel', hex: '#5B4E91' },
  { cat: 'secteur_public', label: 'Secteur public', hex: '#BA7517' },
];

export function SegmentFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: SegmentFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromSegment(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromSegment(initial ?? null));
    }
  }, [isOpen, initial]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_]{2,50}$/.test(form.codeSegment);

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.categorie !== '' &&
    codeValide;

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromSegment(initial ?? null),
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
        const dto: CreateSegmentDto = {
          codeSegment: form.codeSegment.toUpperCase(),
          libelle: form.libelle,
          categorie: form.categorie,
        };
        const created = await createSegment(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateSegmentDto = { ...(editDiff.diff as UpdateSegmentDto) };
      const updated = await updateSegment(initial.codeSegment, dto);
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
          toast.error(`Le code '${form.codeSegment}' existe déjà.`);
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
    mode === 'create' ? 'Nouveau segment' : 'Modifier le segment';
  const sousTitre =
    mode === 'create'
      ? 'Créer un segment commercial pour la clientèle.'
      : `Code business : ${initial?.codeSegment ?? ''}`;

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
          data-testid="seg-form-header"
        >
          <div className="flex items-start gap-2.5">
            <Target
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
              data-testid="seg-form-bandeau-scd2"
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

          {/* Code segment */}
          <div className="mb-4">
            <Label
              htmlFor="codeSegment"
              className="text-sm font-medium text-(--foreground)"
            >
              Code segment <span className="text-(--destructive)">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Hash
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="codeSegment"
                value={form.codeSegment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codeSegment: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ex. AGRICOLE"
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
                form.codeSegment !== '' &&
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
              placeholder="ex. Clients agricoles UEMOA"
              disabled={submitting}
              maxLength={200}
              className="h-9 mt-1.5"
            />
          </div>

          {/* Catégorie commerciale — 6 tiles en grid 3×2 */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Catégorie commerciale{' '}
              <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-3 gap-1.5 mt-1.5"
              role="radiogroup"
              aria-label="Catégorie commerciale"
            >
              {CATEGORIE_TILES.map((tile) => (
                <CategorieTile
                  key={tile.cat}
                  cat={tile.cat}
                  label={tile.label}
                  hex={tile.hex}
                  selected={form.categorie === tile.cat}
                  onSelect={() =>
                    setForm({ ...form, categorie: tile.cat })
                  }
                  disabled={submitting}
                />
              ))}
              <input
                id="categorie"
                type="hidden"
                value={form.categorie}
                readOnly
                aria-label="Catégorie (caché)"
              />
            </div>
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
          data-testid="seg-form-footer"
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

interface CategorieTileProps {
  cat: string;
  label: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function CategorieTile({
  cat,
  label,
  hex,
  selected,
  onSelect,
  disabled,
}: CategorieTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`seg-categorie-tile-${cat}`}
      style={
        selected
          ? { borderColor: hex, backgroundColor: `${hex}10` }
          : undefined
      }
      className={cn(
        'border rounded-md py-2.5 px-2 text-center transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !selected && 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      <span
        className={cn('text-xs font-medium')}
        style={selected ? { color: hex, fontWeight: 600 } : undefined}
      >
        {label}
      </span>
    </button>
  );
}
