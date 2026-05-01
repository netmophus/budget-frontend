/**
 * Drawer de création / édition d'un segment (Lot 2.5B, refactor 2.5C).
 *
 * Consomme depuis le Lot 2.5C les composants factorisés :
 *  - <RefSecondaireSelect> pour le sélect catégorie
 *  - useScd2EditDiff pour le diff + le bandeau SCD2
 *
 * Pattern miroir StructureFormDrawer (refactor symétrique).
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
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
  type CreateSegmentDto,
  createSegment,
  type Segment,
  type SegmentModeMaj,
  type UpdateSegmentDto,
  updateSegment,
} from '@/lib/api/referentiels';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';

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

  // On garde une lecture du hook au niveau parent UNIQUEMENT pour
  // bloquer le submit si l'API référentiel est en erreur (le sélect
  // gère déjà loading + warning désactivée en interne).
  const { options: categorieOptions, error: errorCategories } =
    useRefSecondaireOptions('categorie-segment');
  const optionsIndisponibles =
    errorCategories !== null && categorieOptions.length === 0;

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromSegment(initial ?? null));
    }
  }, [isOpen, initial]);

  // Diff + modeMaj prédit + bandeau via le hook factorisé (Lot 2.5C).
  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromSegment(initial ?? null),
    form,
    scd2Fields: [...SCD2_FIELDS],
    dateDebutValiditeInitiale: initial?.dateDebutValidite,
  });
  const bandeau = mode === 'edit' && initial ? editDiff.bandeau : null;

  // Validation côté UI alignée sur le DTO backend (regex / longueur).
  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{1,50}$/.test(form.codeSegment);

  const canSubmit =
    !submitting &&
    !optionsIndisponibles &&
    form.libelle.trim() !== '' &&
    form.categorie !== '' &&
    codeValide;

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
        toast.success(`Segment ${created.codeSegment} créé.`);
        onSuccess(created, null);
        return;
      }
      // Mode 'edit' : envoyer uniquement le diff (calculé par le hook).
      if (!initial) return;
      const updated = await updateSegment(
        initial.codeSegment,
        editDiff.diff as UpdateSegmentDto,
      );
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
  const description =
    mode === 'create'
      ? 'Renseignez les informations pour créer un segment clientèle.'
      : `Code business : ${initial?.codeSegment ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {bandeau && (
          <div
            className={
              bandeau.type === 'jaune'
                ? 'rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm space-y-1'
                : 'rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1'
            }
          >
            <div className="flex items-center gap-2 font-semibold">
              {bandeau.type === 'jaune' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              {bandeau.titre}
            </div>
            <p>{bandeau.message}</p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="codeSegment">
              Code segment <span className="text-red-500">*</span>
            </Label>
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
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _ ou -, max 50 caractères.'}
              {mode === 'create' &&
                form.codeSegment !== '' &&
                !codeValide && (
                  <span className="block text-red-600">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="libelle">
              Libellé <span className="text-red-500">*</span>
            </Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="ex. Clients agricoles"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="categorie">
              Catégorie <span className="text-red-500">*</span>
            </Label>
            <RefSecondaireSelect
              id="categorie"
              refKey="categorie-segment"
              value={form.categorie}
              onValueChange={(v) => setForm({ ...form, categorie: v })}
              disabled={submitting}
              labelChamp="les catégories de segment"
            />
          </div>

          {mode === 'edit' && (
            <div className="space-y-1">
              <Label htmlFor="estActif">Statut</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            <X className="h-4 w-4 mr-2" /> Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Créer'
                : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
