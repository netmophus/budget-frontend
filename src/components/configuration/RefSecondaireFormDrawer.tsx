import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  type CreateRefSecondaireDto,
  createRefSecondaire,
  type RefKey,
  type RefSecondaire,
  type UpdateRefSecondaireDto,
  updateRefSecondaire,
} from '@/lib/api/configuration';
import { refMeta } from '@/lib/labels/configuration';

interface FormState {
  code: string;
  libelle: string;
  description: string;
  ordre: number;
  estActif: boolean;
}

function initialFromValue(v: RefSecondaire | null): FormState {
  if (!v) {
    return {
      code: '',
      libelle: '',
      description: '',
      ordre: 0,
      estActif: true,
    };
  }
  return {
    code: v.code,
    libelle: v.libelle,
    description: v.description ?? '',
    ordre: v.ordre,
    estActif: v.estActif,
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

interface RefSecondaireFormDrawerProps {
  refKey: RefKey;
  mode: 'create' | 'edit';
  initial?: RefSecondaire | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entity: RefSecondaire) => void;
}

export function RefSecondaireFormDrawer({
  refKey,
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: RefSecondaireFormDrawerProps) {
  const meta = refMeta(refKey);
  const [form, setForm] = useState<FormState>(initialFromValue(initial ?? null));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromValue(initial ?? null));
    }
  }, [isOpen, initial]);

  const isSysteme = mode === 'edit' && initial?.estSysteme === true;
  const codePattern = meta.codePattern ?? /^[A-Za-z0-9_-]+$/;
  const codeMaxLen = 50;

  const codeValide =
    mode === 'edit'
      ? true
      : form.code.length >= 1 &&
        form.code.length <= codeMaxLen &&
        codePattern.test(form.code);

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.ordre >= 0 &&
    codeValide;

  function applyCodeMask(raw: string): string {
    return meta.forceUppercase ? raw.toUpperCase() : raw;
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const dto: CreateRefSecondaireDto = {
          code: form.code,
          libelle: form.libelle,
          ...(form.description ? { description: form.description } : {}),
          ordre: form.ordre,
        };
        const created = await createRefSecondaire(refKey, dto);
        toast.success(`${meta.labelSingular} '${created.code}' créée.`);
        onSuccess(created);
        return;
      }
      // mode 'edit' : envoyer uniquement le diff
      if (!initial) return;
      const dto: UpdateRefSecondaireDto = {};
      if (form.libelle !== initial.libelle) dto.libelle = form.libelle;
      const initialDescription = initial.description ?? '';
      if (form.description !== initialDescription) {
        dto.description = form.description || null;
      }
      if (form.ordre !== initial.ordre) dto.ordre = form.ordre;
      if (form.estActif !== initial.estActif) dto.estActif = form.estActif;
      // Renommer le code n'est autorisé que sur valeurs custom (estSysteme=false)
      if (!isSysteme && form.code !== initial.code) {
        dto.code = form.code;
      }
      const updated = await updateRefSecondaire(refKey, initial.id, dto);
      toast.success(`${meta.labelSingular} '${updated.code}' modifiée.`);
      onSuccess(updated);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        if (mode === 'create') {
          toast.error(`Le code '${form.code}' existe déjà.`);
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
    mode === 'create'
      ? `Nouvelle valeur — ${meta.label}`
      : `Modifier — ${initial?.code ?? ''}`;
  const descriptionTitre =
    mode === 'create'
      ? `Ajoute un ${meta.labelSingular}.`
      : `${meta.labelSingular} : ${initial?.libelle ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{descriptionTitre}</DialogDescription>
        </DialogHeader>

        {mode === 'edit' && isSysteme && (
          <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4" />
              Valeur système
            </div>
            <p>
              Le <strong>code</strong> ne peut pas être modifié — le code
              applicatif s'appuie dessus pour l'orchestration. Vous pouvez
              ajuster le libellé, la description ou l'ordre.
            </p>
          </div>
        )}

        {mode === 'edit' && !isSysteme && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Modification d'une valeur custom
            </div>
            <p>
              Le code peut être renommé. Si la valeur est référencée par une
              dimension, l'opération met à jour les FK en cascade (ON UPDATE
              CASCADE — Lot 2.5-bis-B).
            </p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="code">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: applyCodeMask(e.target.value) })
              }
              placeholder={meta.codeHint ?? 'ex. succursale'}
              disabled={
                (mode === 'edit' && isSysteme) || submitting
              }
              maxLength={codeMaxLen}
              inputMode={meta.inputMode}
            />
            <p className="text-xs text-(--muted-foreground)">
              {meta.codeHint ?? 'Lettres, chiffres, _ ou -, max 50 caractères.'}
              {mode === 'create' &&
                form.code !== '' &&
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
              placeholder={`Libellé du ${meta.labelSingular}`}
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optionnel — texte long expliquant l'usage."
              disabled={submitting}
              rows={3}
              className="flex w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-(--ring) resize-y"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ordre">Ordre d'affichage</Label>
            <Input
              id="ordre"
              type="number"
              min={0}
              max={99999}
              value={form.ordre}
              onChange={(e) =>
                setForm({ ...form, ordre: Number(e.target.value) })
              }
              disabled={submitting}
            />
            <p className="text-xs text-(--muted-foreground)">
              Croissant — utilisé pour trier les valeurs dans les selects UI.
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
