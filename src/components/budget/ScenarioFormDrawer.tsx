/**
 * Drawer création / édition d'un scénario budgétaire (Lot 3.2 +
 * refonte Lot 7.3 V18 Charte v1).
 *
 * dim_scenario n'est PAS SCD2 — pas de bandeau jaune, pas de
 * useScd2EditDiff. La modification est autorisée uniquement tant
 * que le scénario est en statut 'actif' (le service rejette en 409
 * si archivé).
 *
 * Vocabulaire UI : 'central' s'affiche « Médian » (cf.
 * docs/modele-donnees.md §4.1.2).
 *
 * Pattern unifié V11–V17 : header gradient bleu nuit + body
 * scrollable + footer sticky. Le sélecteur de type est rendu en
 * 4 tiles (Médian / Optimiste / Pessimiste / Alternatif) plutôt
 * qu'un Select.
 */
import { AxiosError } from 'axios';
import {
  Layers,
  Minus,
  PieChart,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
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

interface TypeTileConfig {
  value: TypeScenario;
  label: string;
  description: string;
  hex: string;
  bgHex: string;
  Icon: LucideIcon;
}

const TYPE_TILES: TypeTileConfig[] = [
  {
    value: 'central',
    label: 'Médian',
    description: 'Hypothèse centrale, base de référence du budget.',
    hex: '#5F6B7A',
    bgHex: '#5F6B7A1A',
    Icon: Minus,
  },
  {
    value: 'optimiste',
    label: 'Optimiste',
    description: 'Hypothèse haute (croissance forte, taux favorables).',
    hex: '#0F6E56',
    bgHex: '#0F6E561A',
    Icon: TrendingUp,
  },
  {
    value: 'pessimiste',
    label: 'Pessimiste',
    description: 'Hypothèse basse (récession, choc taux ou liquidité).',
    hex: '#DC2626',
    bgHex: '#DC26261A',
    Icon: TrendingDown,
  },
  {
    value: 'alternatif',
    label: 'Alternatif',
    description: 'Variante exploratoire (stress, scénario macro spécifique).',
    hex: '#5B4E91',
    bgHex: '#5B4E911A',
    Icon: Layers,
  },
];

const CURRENT_YEAR = new Date().getFullYear();
const EXERCICE_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR + i);

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
  const sousTitre =
    mode === 'create'
      ? 'Cadrage macro-économique pour l\'élaboration budgétaire'
      : `Code business : ${initial?.codeScenario ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-2xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* ─── Header gradient bleu nuit ─────────────────────── */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              aria-hidden="true"
            >
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold tracking-tight m-0">
                {titre}
              </h3>
              <p className="text-xs opacity-80 mt-0.5">{sousTitre}</p>
            </div>
          </div>
        </div>

        {/* ─── Body scrollable ───────────────────────────────── */}
        <div className="px-7 py-5 overflow-y-auto flex-1 space-y-4">
          {/* Type → 4 tiles */}
          <div>
            <Label className="text-sm font-medium text-(--foreground)">
              Type de scénario <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {TYPE_TILES.map((tile) => {
                const selected = form.typeScenario === tile.value;
                const disabled = mode === 'edit' || submitting;
                const Icon = tile.Icon;
                return (
                  <button
                    key={tile.value}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setForm({ ...form, typeScenario: tile.value })
                    }
                    data-testid={`tile-type-scen-${tile.value}`}
                    aria-pressed={selected}
                    className={
                      'text-left rounded-md border p-3 transition-all ' +
                      (disabled && !selected
                        ? 'opacity-50 cursor-not-allowed '
                        : 'cursor-pointer ') +
                      (selected
                        ? 'border-2 shadow-sm '
                        : 'border-(--border) hover:border-(--muted-foreground)/40 ')
                    }
                    style={
                      selected
                        ? {
                            borderColor: tile.hex,
                            backgroundColor: tile.bgHex,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon
                        className="w-4 h-4"
                        style={{ color: tile.hex }}
                        aria-hidden="true"
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: selected ? tile.hex : undefined }}
                      >
                        {tile.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-(--muted-foreground) leading-snug">
                      {tile.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {mode === 'edit' && (
              <p className="text-xs text-(--muted-foreground) mt-1.5">
                Type immuable après création.
              </p>
            )}
          </div>

          {/* Code + Exercice en grid 2 cols */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="codeScenario"
                className="text-sm font-medium text-(--foreground)"
              >
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
                className="font-mono"
              />
              <p className="text-xs text-(--muted-foreground)">
                {mode === 'edit'
                  ? 'Le code business est immuable.'
                  : 'MAJUSCULES + chiffres + _ + -, 2 à 50 car.'}
                {mode === 'create' &&
                  form.codeScenario !== '' &&
                  !codeValide && (
                    <span className="block text-red-600">
                      ⚠ Format invalide.
                    </span>
                  )}
              </p>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="exerciceFiscal"
                className="text-sm font-medium text-(--foreground)"
              >
                Exercice fiscal
              </Label>
              <Select
                value={form.exerciceFiscal || '__none__'}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    exerciceFiscal: v === '__none__' ? '' : v,
                  })
                }
                disabled={submitting}
              >
                <SelectTrigger id="exerciceFiscal" className="tabular-nums">
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun</SelectItem>
                  {EXERCICE_OPTIONS.map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="tabular-nums"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-(--muted-foreground)">
                Optionnel — vide = scénario macro transversal.
              </p>
            </div>
          </div>

          {/* Libellé */}
          <div className="space-y-1">
            <Label
              htmlFor="libelle"
              className="text-sm font-medium text-(--foreground)"
            >
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

          {/* Commentaire */}
          <div className="space-y-1">
            <Label
              htmlFor="commentaire"
              className="text-sm font-medium text-(--foreground)"
            >
              Commentaire
            </Label>
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

        {/* ─── Footer sticky ─────────────────────────────────── */}
        <div className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
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
