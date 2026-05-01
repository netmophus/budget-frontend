/**
 * Drawer de création / édition d'un segment (Lot 2.5B).
 *
 * Pattern symétrique à StructureFormDrawer (Lot 2.5A) — bandeau SCD2
 * conditionnel selon les champs touchés, code immuable en édition,
 * select catégorie alimenté dynamiquement par le hook
 * useRefSecondaireOptions (Lot 2.5-bis-D).
 *
 * TODO Lot 2.5C/2.5D : extraire le pattern commun
 * (`<RefSecondaireSelect>`, mode toggle create/edit, bandeau SCD2)
 * dans un composant générique quand on aura 3 cas concrets
 * (Structure + Segment + Produit).
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CreateSegmentDto,
  createSegment,
  type Segment,
  type SegmentModeMaj,
  type UpdateSegmentDto,
  updateSegment,
} from '@/lib/api/referentiels';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';

interface FormState {
  codeSegment: string;
  libelle: string;
  categorie: string;
  estActif: boolean;
}

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
  const [form, setForm] = useState<FormState>(initialFromSegment(initial ?? null));
  const [submitting, setSubmitting] = useState(false);

  // Catégories chargées dynamiquement via le référentiel secondaire.
  const {
    options: categorieOptions,
    loading: loadingCategories,
    error: errorCategories,
  } = useRefSecondaireOptions('categorie-segment');

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromSegment(initial ?? null));
    }
  }, [isOpen, initial]);

  // Détecte une catégorie courante (édition) qui n'est plus active
  // dans /configuration → conservée sélectionnable mais avertissement.
  const categorieDesactivee =
    mode === 'edit' &&
    form.categorie !== '' &&
    !loadingCategories &&
    !categorieOptions.some((o) => o.value === form.categorie);

  const categoriesAffichees = useMemo(() => {
    if (categorieDesactivee && form.categorie !== '') {
      return [
        {
          value: form.categorie,
          libelle: `${form.categorie} (désactivé)`,
          estSysteme: false,
        },
        ...categorieOptions,
      ];
    }
    return categorieOptions;
  }, [categorieOptions, categorieDesactivee, form.categorie]);

  // Validation côté UI alignée sur le DTO backend (regex / longueur).
  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{1,50}$/.test(form.codeSegment);
  const optionsIndisponibles =
    errorCategories !== null && categorieOptions.length === 0;

  const canSubmit =
    !submitting &&
    !optionsIndisponibles &&
    form.libelle.trim() !== '' &&
    form.categorie !== '' &&
    codeValide;

  // ─── Bandeau SCD2 conditionnel (mode édition uniquement)

  const bandeau = useMemo(() => {
    if (mode !== 'edit' || !initial) return null;

    const scd2Touched =
      form.libelle !== initial.libelle ||
      form.categorie !== initial.categorie;
    const estActifTouched = form.estActif !== initial.estActif;

    // Si seul est_actif est modifié → in-place (bandeau bleu)
    if (estActifTouched && !scd2Touched) {
      return {
        kind: 'info' as const,
        title: 'Mise à jour en place',
        text: 'Modification orthogonale au SCD2 — aucune nouvelle version ne sera créée.',
      };
    }

    if (scd2Touched) {
      // Détecte le cas écrasement intra-jour : version courante créée
      // aujourd'hui (date_debut_validite = today).
      const today = new Date().toISOString().slice(0, 10);
      const intraJour = initial.dateDebutValidite === today;
      if (intraJour) {
        return {
          kind: 'info' as const,
          title: 'Écrasement intra-jour',
          text: "Modification du jour : la version courante sera écrasée sans créer de nouvelle ligne historique.",
        };
      }
      return {
        kind: 'warn' as const,
        title: 'SCD2 — Modification d\'attribut historisé',
        text:
          "Une nouvelle version SCD2 sera créée. L'ancienne reste consultable dans l'historique et continue de référencer les saisies budgétaires antérieures.",
      };
    }
    return null;
  }, [mode, initial, form]);

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
      // Mode 'edit' : envoyer uniquement le diff
      if (!initial) return;
      const dto: UpdateSegmentDto = {};
      if (form.libelle !== initial.libelle) dto.libelle = form.libelle;
      if (form.categorie !== initial.categorie) dto.categorie = form.categorie;
      if (form.estActif !== initial.estActif) dto.estActif = form.estActif;
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
      } else if (status === 422) {
        toast.error(message);
      } else if (status === 400) {
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
              bandeau.kind === 'warn'
                ? 'rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm space-y-1'
                : 'rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1'
            }
          >
            <div className="flex items-center gap-2 font-semibold">
              {bandeau.kind === 'warn' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              {bandeau.title}
            </div>
            <p>{bandeau.text}</p>
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
            <Select
              value={form.categorie || undefined}
              onValueChange={(v) => setForm({ ...form, categorie: v })}
              disabled={submitting || loadingCategories}
            >
              <SelectTrigger id="categorie">
                <SelectValue
                  placeholder={loadingCategories ? 'Chargement…' : '—'}
                />
              </SelectTrigger>
              <SelectContent>
                {categoriesAffichees.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorCategories && categorieOptions.length === 0 && (
              <p className="text-xs text-red-600">
                ⚠ Impossible de charger les catégories. Vérifiez avec
                l'administrateur que le référentiel
                <code className="font-mono mx-1">categorie-segment</code>
                n'est pas vide.
              </p>
            )}
            {categorieDesactivee && (
              <p className="text-xs text-yellow-700">
                ⚠ La valeur '{form.categorie}' a été désactivée dans
                Configuration. Conservez-la ou choisissez une catégorie
                active.
              </p>
            )}
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
