/**
 * Drawer de création / édition d'un centre de responsabilité (Lot 2.5F).
 *
 * 6ᵉ et dernier CRUD UI de la série 2.5A → 2.5F. Pas de hiérarchie
 * auto-référencée — le CR est plat, mais a une FK SCD2-vers-SCD2
 * vers `dim_structure` (stratégie A : `relinkAfterStructureRevision`
 * côté backend, transparent ici).
 *
 * 6ᵉ consommateur de useScd2EditDiff. Consomme 1× <RefSecondaireSelect>
 * pour le type CR (cdc/cdp/cdr/autre).
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

export function CrFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: CrFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromCr(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [structures, setStructures] = useState<Structure[]>([]);

  // Charger toutes les structures courantes pour alimenter le Select.
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

  // Tri pour affichage hiérarchique du Select (niveau ASC, code ASC).
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
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{2,50}$/.test(form.codeCr);

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
          ...(form.libelleCourt
            ? { libelleCourt: form.libelleCourt }
            : {}),
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
  const description =
    mode === 'create'
      ? "Renseignez les informations pour créer un CR."
      : `Code business : ${initial?.codeCr ?? ''}`;

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
                : bandeau.type === 'bleu'
                  ? 'rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1'
                  : 'rounded-md border border-sky-300 bg-sky-50 dark:bg-sky-950/30 p-3 text-sm space-y-1'
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
            <Label htmlFor="codeCr">
              Code CR <span className="text-red-500">*</span>
            </Label>
            <Input
              id="codeCr"
              value={form.codeCr}
              onChange={(e) =>
                setForm({ ...form, codeCr: e.target.value.toUpperCase() })
              }
              placeholder="ex. CR_AG_ABJ_PLATEAU"
              disabled={mode === 'edit' || submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _ + -, max 50 caractères.'}
              {mode === 'create' &&
                form.codeCr !== '' &&
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
              placeholder="ex. CR Agence Plateau"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="libelleCourt">Libellé court</Label>
            <Input
              id="libelleCourt"
              value={form.libelleCourt}
              onChange={(e) =>
                setForm({ ...form, libelleCourt: e.target.value })
              }
              placeholder="ex. CR Plateau"
              disabled={submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              Optionnel — affichage compact dans les tables.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="typeCr">
              Type CR <span className="text-red-500">*</span>
            </Label>
            <RefSecondaireSelect
              id="typeCr"
              refKey="type-cr"
              value={form.typeCr}
              onValueChange={(v) => setForm({ ...form, typeCr: v })}
              disabled={submitting}
              labelChamp="les types de CR"
            />
            <p className="text-xs text-(--muted-foreground)">
              CDC = centre de coût, CDP = centre de profit, CDR = centre
              de revenu.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fkStructure">
              Structure rattachée <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.fkStructure || undefined}
              onValueChange={(v) => setForm({ ...form, fkStructure: v })}
              disabled={submitting}
            >
              <SelectTrigger id="fkStructure">
                <SelectValue placeholder="Choisir une structure…" />
              </SelectTrigger>
              <SelectContent>
                {structuresTriees.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono">
                      {'  '.repeat(
                        Math.max(0, s.niveauHierarchique - 1),
                      )}
                      {s.codeStructure}
                    </span>
                    <span className="ml-2 text-(--muted-foreground)">
                      — {s.libelle}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)">
              Le CR est rattaché à la version courante de la structure ;
              le hook backend gère le relink lors d'une révision SCD2 de
              la structure parente.
            </p>
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
