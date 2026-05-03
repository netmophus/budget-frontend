/**
 * Drawer création / édition d'un scénario budgétaire (Lot 3.2).
 *
 * dim_scenario n'est PAS SCD2 — pas de bandeau jaune, pas de
 * useScd2EditDiff. La modification est autorisée uniquement tant
 * que le scénario est en statut 'actif' (le service rejette en 409
 * si archivé).
 *
 * Vocabulaire UI : 'central' s'affiche « Médian » (cf.
 * docs/modele-donnees.md §4.1.2).
 */
import { AxiosError } from 'axios';
import { X } from 'lucide-react';
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
  type CreateScenarioDto,
  createScenario,
  type Scenario,
  type TypeScenario,
  type UpdateScenarioDto,
  updateScenario,
} from '@/lib/api/scenarios';
import { TYPES_SCENARIO } from '@/lib/labels/budget';

interface FormState {
  codeScenario: string;
  libelle: string;
  typeScenario: TypeScenario | '';
  exerciceFiscal: string; // saisi en string puis Number()
  commentaire: string;
}

function initialFromScenario(s: Scenario | null): FormState {
  if (!s) {
    return {
      codeScenario: '',
      libelle: '',
      typeScenario: '',
      exerciceFiscal: '',
      commentaire: '',
    };
  }
  return {
    codeScenario: s.codeScenario,
    libelle: s.libelle,
    typeScenario: s.typeScenario,
    exerciceFiscal: s.exerciceFiscal === null ? '' : String(s.exerciceFiscal),
    commentaire: s.commentaire ?? '',
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

interface ScenarioFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Scenario | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (s: Scenario) => void;
}

export function ScenarioFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: ScenarioFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromScenario(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(initialFromScenario(initial ?? null));
  }, [isOpen, initial]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{2,50}$/.test(form.codeScenario);
  const exerciceValide =
    form.exerciceFiscal === '' ||
    (Number.isInteger(Number(form.exerciceFiscal)) &&
      Number(form.exerciceFiscal) >= 2020 &&
      Number(form.exerciceFiscal) <= 2050);

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeScenario !== '' &&
    codeValide &&
    exerciceValide;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const exercice =
        form.exerciceFiscal === '' ? undefined : Number(form.exerciceFiscal);
      let scenario: Scenario;
      if (mode === 'create') {
        const dto: CreateScenarioDto = {
          codeScenario: form.codeScenario.toUpperCase(),
          libelle: form.libelle,
          typeScenario: form.typeScenario as TypeScenario,
          ...(form.commentaire ? { commentaire: form.commentaire } : {}),
          ...(exercice !== undefined ? { exerciceFiscal: exercice } : {}),
        };
        scenario = await createScenario(dto);
      } else {
        if (!initial) return;
        const dto: UpdateScenarioDto = {
          libelle: form.libelle,
          ...(form.commentaire !== (initial.commentaire ?? '')
            ? { commentaire: form.commentaire }
            : {}),
          ...(exercice !== (initial.exerciceFiscal ?? undefined)
            ? exercice !== undefined
              ? { exerciceFiscal: exercice }
              : {}
            : {}),
        };
        scenario = await updateScenario(initial.id, dto);
      }
      onSuccess(scenario);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        if (mode === 'create') {
          toast.error(`Le code '${form.codeScenario}' existe déjà.`);
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

  const titre = mode === 'create' ? 'Nouveau scénario' : 'Modifier le scénario';
  const description =
    mode === 'create'
      ? 'Créer un cadrage macro-économique (Médian, Optimiste, etc.).'
      : `Code business : ${initial?.codeScenario ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="codeScenario">
              Code scénario <span className="text-red-500">*</span>
            </Label>
            <Input
              id="codeScenario"
              value={form.codeScenario}
              onChange={(e) =>
                setForm({
                  ...form,
                  codeScenario: e.target.value.toUpperCase(),
                })
              }
              placeholder="ex. MEDIAN_2027"
              disabled={mode === 'edit' || submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable.'
                : 'MAJUSCULES + chiffres + _ + -, 2 à 50 caractères.'}
              {mode === 'create' && form.codeScenario !== '' && !codeValide && (
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
              placeholder="ex. Scénario médian 2027"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="typeScenario">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.typeScenario || undefined}
                onValueChange={(v) =>
                  setForm({ ...form, typeScenario: v as TypeScenario })
                }
                disabled={mode === 'edit' || submitting}
              >
                <SelectTrigger id="typeScenario">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_SCENARIO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-(--muted-foreground)">
                {mode === 'edit'
                  ? 'Type immuable après création.'
                  : 'Médian / Optimiste / Pessimiste / Alternatif.'}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="exerciceFiscal">Exercice fiscal</Label>
              <Input
                id="exerciceFiscal"
                type="number"
                min={2020}
                max={2050}
                value={form.exerciceFiscal}
                onChange={(e) =>
                  setForm({ ...form, exerciceFiscal: e.target.value })
                }
                placeholder="ex. 2027"
                disabled={submitting}
              />
              <p className="text-xs text-(--muted-foreground)">
                Optionnel — laisser vide pour un scénario macro
                transversal. Range 2020–2050.
                {form.exerciceFiscal !== '' && !exerciceValide && (
                  <span className="block text-red-600">
                    ⚠ Année invalide (2020–2050).
                  </span>
                )}
              </p>
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
              placeholder="Hypothèses, contexte, source…"
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
