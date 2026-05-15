/**
 * Drawer création / édition d'une version budgétaire (Lot 3.2 +
 * refonte Lot 7.3 V19 Charte v1).
 *
 * dim_version n'est PAS SCD2 — pas de bandeau jaune, pas de
 * useScd2EditDiff. La modification est autorisée uniquement tant
 * que le statut est 'ouvert' (Brouillon en UI ; le service rejette
 * 409 sinon).
 *
 * En création, un bandeau d'information rappelle le hook Q9 :
 * « si aucun scénario n'existe pour {exercice}, MEDIAN_{exercice}
 * sera créé automatiquement ».
 *
 * Vocabulaire UI : statut 'ouvert' s'affiche « Brouillon » (cf.
 * docs/modele-donnees.md §4.1.2).
 *
 * Pattern unifié V11–V18 : header gradient bleu nuit + body
 * scrollable + footer sticky. Sélecteur de type rendu en 4 tiles
 * (Budget initial / Reforecast 1 / Reforecast 2 / Atterrissage).
 */
import { AxiosError } from 'axios';
import {
  CircleCheck,
  FilePlus,
  Flag,
  Info,
  Layers,
  RefreshCw,
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
  type CreateVersionDto,
  type CreateVersionResponse,
  createVersion,
  type TypeVersion,
  type UpdateVersionDto,
  updateVersion,
  type Version,
} from '@/lib/api/versions';

const EXERCICE_MIN = 2024;
const EXERCICE_MAX = 2030;
const EXERCICE_OPTIONS: number[] = [];
for (let y = EXERCICE_MIN; y <= EXERCICE_MAX; y += 1) {
  EXERCICE_OPTIONS.push(y);
}

interface FormState {
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion | '';
  exerciceFiscal: string;
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

interface TypeTileConfig {
  value: TypeVersion;
  label: string;
  description: string;
  hex: string;
  bgHex: string;
  Icon: LucideIcon;
}

const TYPE_TILES: TypeTileConfig[] = [
  {
    value: 'budget_initial',
    label: 'Budget initial',
    description: 'Cycle annuel principal de cadrage budgétaire.',
    hex: '#0C447C',
    bgHex: '#0C447C1A',
    Icon: FilePlus,
  },
  {
    value: 'reforecast_1',
    label: 'Reforecast 1',
    description: 'Réestimation 1er semestre / mi-année.',
    hex: '#BA7517',
    bgHex: '#BA75171A',
    Icon: RefreshCw,
  },
  {
    value: 'reforecast_2',
    label: 'Reforecast 2',
    description: 'Réestimation 2e semestre / fin d\'année.',
    hex: '#9C5F11',
    bgHex: '#9C5F111A',
    Icon: Layers,
  },
  {
    value: 'atterrissage',
    label: 'Atterrissage',
    description: 'Estimation finale en clôture d\'exercice.',
    hex: '#0F6E56',
    bgHex: '#0F6E561A',
    Icon: Flag,
  },
];

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
  const sousTitre =
    mode === 'create'
      ? 'Créer un cycle budgétaire ou un reforecast trimestriel'
      : `Code business : ${initial?.codeVersion ?? ''}`;

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
              <Layers className="w-5 h-5" />
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
          {/* Bandeau Hook Q9 (mode create uniquement) */}
          {mode === 'create' && (
            <div
              className="rounded-md border p-3 text-xs"
              style={{
                borderColor: '#BA7517',
                backgroundColor: '#BA75170D',
              }}
            >
              <div
                className="flex items-center gap-1.5 font-semibold mb-1"
                style={{ color: '#BA7517' }}
              >
                <Info className="h-3.5 w-3.5" />
                Hook Q9 — auto-création scénario médian
              </div>
              <p className="text-(--muted-foreground) leading-relaxed">
                Si aucun scénario n&apos;existe pour l&apos;exercice{' '}
                <strong>{form.exerciceFiscal || '<année>'}</strong>, un
                scénario{' '}
                <strong>MEDIAN_{form.exerciceFiscal || '<année>'}</strong>{' '}
                sera créé automatiquement à la création de cette version.
              </p>
            </div>
          )}

          {/* Type → 4 tiles */}
          <div>
            <Label className="text-sm font-medium text-(--foreground)">
              Type de version <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {TYPE_TILES.map((tile) => {
                const selected = form.typeVersion === tile.value;
                const disabled = submitting;
                const Icon = tile.Icon;
                return (
                  <button
                    key={tile.value}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setForm({ ...form, typeVersion: tile.value })
                    }
                    data-testid={`tile-type-vers-${tile.value}`}
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
          </div>

          {/* Code + Exercice en grid */}
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="codeVersion"
                className="text-sm font-medium text-(--foreground)"
              >
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
                className="font-mono"
              />
              <p className="text-xs text-(--muted-foreground)">
                {mode === 'edit'
                  ? 'Le code business est immuable.'
                  : 'MAJUSCULES + chiffres + _ + -, 2 à 50 car.'}
                {mode === 'create' &&
                  form.codeVersion !== '' &&
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
                Exercice fiscal <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.exerciceFiscal}
                onValueChange={(v) =>
                  setForm({ ...form, exerciceFiscal: v })
                }
                disabled={submitting}
              >
                <SelectTrigger
                  id="exerciceFiscal"
                  className="tabular-nums"
                  aria-label="Exercice fiscal"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                Range {EXERCICE_MIN}–{EXERCICE_MAX}.
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
              placeholder="ex. Budget initial 2027"
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
              placeholder="Cadrage initial DG, contexte exercice, etc."
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
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <CircleCheck className="w-3.5 h-3.5" />
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
