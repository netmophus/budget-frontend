/**
 * Drawer création / édition d'une version budgétaire (Lot 3.2).
 *
 * dim_version n'est PAS SCD2 — pas de bandeau jaune, pas de
 * useScd2EditDiff. La modification est autorisée uniquement tant
 * que le statut est 'ouvert' (Brouillon en UI ; le service rejette
 * 409 sinon).
 *
 * En création, un bandeau d'information bleu rappelle le hook Q9 :
 * « si aucun scénario n'existe pour {exercice}, MEDIAN_{exercice}
 * sera créé automatiquement ».
 *
 * Vocabulaire UI : statut 'ouvert' s'affiche « Brouillon » (cf.
 * docs/modele-donnees.md §4.1.2).
 */
import { AxiosError } from 'axios';
import { Info, X } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CreateVersionDto,
  type CreateVersionResponse,
  createVersion,
  type TypeVersion,
  type UpdateVersionDto,
  updateVersion,
  type Version,
} from '@/lib/api/versions';
import { TYPES_VERSION } from '@/lib/labels/budget';

const EXERCICE_MIN = 2024;
const EXERCICE_MAX = 2030;

interface FormState {
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion | '';
  exerciceFiscal: string; // string puis Number()
  commentaire: string;
}

function initialFromVersion(v: Version | null): FormState {
  if (!v) {
    return {
      codeVersion: '',
      libelle: '',
      typeVersion: '',
      exerciceFiscal: String(new Date().getFullYear() + 1),
      commentaire: '',
    };
  }
  return {
    codeVersion: v.codeVersion,
    libelle: v.libelle,
    typeVersion: v.typeVersion,
    exerciceFiscal: String(v.exerciceFiscal),
    commentaire: v.commentaire ?? '',
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

interface VersionFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Version | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (v: Version | CreateVersionResponse) => void;
}

export function VersionFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: VersionFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromVersion(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(initialFromVersion(initial ?? null));
  }, [isOpen, initial]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{2,50}$/.test(form.codeVersion);
  const exerciceN = Number(form.exerciceFiscal);
  const exerciceValide =
    Number.isInteger(exerciceN) &&
    exerciceN >= EXERCICE_MIN &&
    exerciceN <= EXERCICE_MAX;

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeVersion !== '' &&
    codeValide &&
    exerciceValide;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const dto: CreateVersionDto = {
          codeVersion: form.codeVersion.toUpperCase(),
          libelle: form.libelle,
          typeVersion: form.typeVersion as TypeVersion,
          exerciceFiscal: exerciceN,
          ...(form.commentaire ? { commentaire: form.commentaire } : {}),
        };
        const created = await createVersion(dto);
        onSuccess(created);
        return;
      }
      if (!initial) return;
      const dto: UpdateVersionDto = {
        libelle: form.libelle,
        typeVersion: form.typeVersion as TypeVersion,
        exerciceFiscal: exerciceN,
        ...(form.commentaire !== (initial.commentaire ?? '')
          ? { commentaire: form.commentaire }
          : {}),
      };
      const updated = await updateVersion(initial.id, dto);
      onSuccess(updated);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        if (mode === 'create') {
          toast.error(`Le code '${form.codeVersion}' existe déjà.`);
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

  const titre = mode === 'create' ? 'Nouvelle version' : 'Modifier la version';
  const description =
    mode === 'create'
      ? 'Créer une version budgétaire (Brouillon par défaut).'
      : `Code business : ${initial?.codeVersion ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {mode === 'create' && (
          <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4" />
              Hook Q9 — auto-création scénario médian
            </div>
            <p>
              Si aucun scénario n'existe pour l'exercice{' '}
              <strong>{form.exerciceFiscal || '<année>'}</strong>, un
              scénario <strong>MEDIAN_{form.exerciceFiscal || '<année>'}</strong>{' '}
              sera créé automatiquement à la création de cette version. Vous
              pourrez ensuite ajouter d'autres scénarios (Optimiste,
              Pessimiste) depuis la page Scénarios.
            </p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="codeVersion">
              Code version <span className="text-red-500">*</span>
            </Label>
            <Input
              id="codeVersion"
              value={form.codeVersion}
              onChange={(e) =>
                setForm({
                  ...form,
                  codeVersion: e.target.value.toUpperCase(),
                })
              }
              placeholder="ex. BUDGET_INITIAL_2027"
              disabled={mode === 'edit' || submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable.'
                : 'MAJUSCULES + chiffres + _ + -, 2 à 50 caractères.'}
              {mode === 'create' && form.codeVersion !== '' && !codeValide && (
                <span className="block text-red-600">⚠ Format invalide.</span>
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
              placeholder="ex. Budget initial 2027"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="exerciceFiscal">
                Exercice fiscal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exerciceFiscal"
                type="number"
                min={EXERCICE_MIN}
                max={EXERCICE_MAX}
                value={form.exerciceFiscal}
                onChange={(e) =>
                  setForm({ ...form, exerciceFiscal: e.target.value })
                }
                disabled={submitting}
              />
              <p className="text-xs text-(--muted-foreground)">
                Range {EXERCICE_MIN}–{EXERCICE_MAX}.
                {form.exerciceFiscal !== '' && !exerciceValide && (
                  <span className="block text-red-600">
                    ⚠ Année invalide.
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="typeVersion">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.typeVersion || undefined}
                onValueChange={(v) =>
                  setForm({ ...form, typeVersion: v as TypeVersion })
                }
                disabled={submitting}
              >
                <SelectTrigger id="typeVersion">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_VERSION.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="commentaire">Commentaire</Label>
            <textarea
              id="commentaire"
              value={form.commentaire}
              onChange={(e) =>
                setForm({ ...form, commentaire: e.target.value })
              }
              placeholder="Cadrage initial DG, contexte exercice, etc."
              disabled={submitting}
              rows={3}
              className="flex w-full rounded-md border border-(--border) bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) resize-y"
            />
          </div>
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
