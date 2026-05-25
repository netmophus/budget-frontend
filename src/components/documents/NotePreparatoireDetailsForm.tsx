/**
 * NotePreparatoireDetailsForm (Lot 8.3.C P3) — formulaire de saisie
 * du détail métier structuré d'une Note préparatoire DG (émise AVANT
 * la réunion du Comité, en début de cycle budgétaire BSIC).
 *
 * Pattern strictement aligné `LettreMobilisationDetailsForm`
 * (Lot 8.3.B) avec 7 sections cards :
 *  1. En-tête note préparatoire (référence + date + convocation + lieu)
 *  2. Participants convoqués (textarea multi-lignes max 2000)
 *  3. Exercice budgétaire concerné (exercice + dates début/butoir)
 *  4. Ordre du jour → `<RichTextEditor>` TipTap (réutilisé Lot 8.3.A)
 *  5. Documents pré-lus attendus (textarea multi-lignes max 2000)
 *  6. Points clés à débattre (textarea max 2000)
 *  7. Décisions attendues (textarea max 2000)
 *
 * `exerciceConcerne` validé en string (regex) puis converti en number
 * dans `formValuesToDto` pour matcher backend `@IsInt` (approche
 * pragmatique Lot 8.3.A — type inféré stable pour le resolver RHF).
 * Pas de `nbObjectifsPrioritaires` ici (champ spécifique D5).
 *
 * Mode lecture seule cohérent Lots 8.2.C / 8.3.A / 8.3.B.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Controller,
  useForm,
  type UseFormRegister,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { mettreAJourDetailNotePreparatoire } from '@/lib/api/documents';
import type {
  MettreAJourDetailNotePreparatoireDto,
  NotePreparatoireDetail,
} from '@/types/note-preparatoire';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

const optionalDateStr = z.string().optional().or(z.literal(''));

// Validation string-typée puis conversion → number dans formValuesToDto
// (pattern Lot 8.3.A pour `exerciceConcerne` — type inféré stable).
const optionalExercice = z
  .string()
  .regex(/^\d{4}$/, 'Exercice : 4 chiffres')
  .refine(
    (s) => {
      const n = Number.parseInt(s, 10);
      return n >= 2020 && n <= 2050;
    },
    { message: 'Exercice entre 2020 et 2050' },
  )
  .optional()
  .or(z.literal(''));

const schema = z.object({
  referenceNote: optionalString(100),
  dateEmission: optionalDateStr,
  dateConvocationComite: optionalDateStr,
  lieuReunion: optionalString(255),
  participantsConvoques: optionalString(2000),
  exerciceConcerne: optionalExercice,
  dateDebutPreparation: optionalDateStr,
  dateButoirPreparation: optionalDateStr,
  ordreDuJourHtml: optionalString(10000),
  documentsPreLus: optionalString(2000),
  pointsClesDebattre: optionalString(2000),
  decisionsAttendues: optionalString(2000),
});

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    referenceNote: '',
    dateEmission: '',
    dateConvocationComite: '',
    lieuReunion: '',
    participantsConvoques: '',
    exerciceConcerne: '',
    dateDebutPreparation: '',
    dateButoirPreparation: '',
    ordreDuJourHtml: '',
    documentsPreLus: '',
    pointsClesDebattre: '',
    decisionsAttendues: '',
  };
}

function detailToFormValues(
  d: NotePreparatoireDetail | null,
): FormValues {
  if (!d) return emptyValues();
  return {
    referenceNote: d.referenceNote ?? '',
    dateEmission: d.dateEmission ?? '',
    dateConvocationComite: d.dateConvocationComite ?? '',
    lieuReunion: d.lieuReunion ?? '',
    participantsConvoques: d.participantsConvoques ?? '',
    exerciceConcerne:
      d.exerciceConcerne != null ? String(d.exerciceConcerne) : '',
    dateDebutPreparation: d.dateDebutPreparation ?? '',
    dateButoirPreparation: d.dateButoirPreparation ?? '',
    ordreDuJourHtml: d.ordreDuJourHtml ?? '',
    documentsPreLus: d.documentsPreLus ?? '',
    pointsClesDebattre: d.pointsClesDebattre ?? '',
    decisionsAttendues: d.decisionsAttendues ?? '',
  };
}

const INTEGER_FIELDS: ReadonlySet<keyof FormValues> = new Set([
  'exerciceConcerne',
]);

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailNotePreparatoireDto {
  const dto: MettreAJourDetailNotePreparatoireDto = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined || v === null) continue;
    if (INTEGER_FIELDS.has(k as keyof FormValues)) {
      const n = Number.parseInt(String(v), 10);
      if (!Number.isNaN(n)) {
        (dto as Record<string, unknown>)[k] = n;
      }
      continue;
    }
    (dto as Record<string, unknown>)[k] = v;
  }
  return dto;
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const dataMsg = (
      err.response?.data as { message?: string | string[] } | undefined
    )?.message;
    if (Array.isArray(dataMsg)) return dataMsg.join(' ; ');
    if (typeof dataMsg === 'string') return dataMsg;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Erreur';
}

// ─── Sous-composants ──────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-(--border) rounded-md p-5">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-(--muted-foreground) mb-4">
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

interface FieldProps {
  name: keyof FormValues;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  register: UseFormRegister<FormValues>;
  error?: string;
  disabled: boolean;
  fullWidth?: boolean;
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  register,
  error,
  disabled,
  fullWidth,
}: FieldProps) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <Label htmlFor={`npd-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`npd-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`npd-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`npd-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaFieldProps {
  name: keyof FormValues;
  label: string;
  placeholder?: string;
  rows?: number;
  register: UseFormRegister<FormValues>;
  error?: string;
  disabled: boolean;
}

function TextareaField({
  name,
  label,
  placeholder,
  rows = 4,
  register,
  error,
  disabled,
}: TextareaFieldProps) {
  return (
    <div className="md:col-span-2">
      <Label htmlFor={`npd-${name}`} className="text-xs">
        {label}
      </Label>
      <textarea
        id={`npd-${name}`}
        {...register(name)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
        data-testid={`npd-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`npd-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface NotePreparatoireDetailsFormProps {
  documentId: string;
  canEditer: boolean;
  detail: NotePreparatoireDetail | null;
  onSaved: (detail: NotePreparatoireDetail) => void;
}

export function NotePreparatoireDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: NotePreparatoireDetailsFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const initial = useMemo(() => detailToFormValues(detail), [detail]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  useEffect(() => {
    reset(initial);
  }, [initial, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const dto = formValuesToDto(values);
      const updated = await mettreAJourDetailNotePreparatoire(
        documentId,
        dto,
      );
      toast.success('Note préparatoire enregistrée.');
      onSaved(updated);
    } catch (err) {
      toast.error(extractApiMessage(err) || "Échec de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !canEditer || submitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="note-preparatoire-form"
    >
      {/* 1. En-tête note préparatoire */}
      <SectionCard title="1. En-tête note préparatoire">
        <Field
          name="referenceNote"
          label="Référence note"
          placeholder="DG/BSIC-NIGER/2028/PREP-01"
          register={register}
          error={errors.referenceNote?.message}
          disabled={disabled}
        />
        <Field
          name="dateEmission"
          label="Date d'émission"
          type="date"
          register={register}
          error={errors.dateEmission?.message}
          disabled={disabled}
        />
        <Field
          name="dateConvocationComite"
          label="Date convocation Comité"
          type="date"
          register={register}
          error={errors.dateConvocationComite?.message}
          disabled={disabled}
        />
        <Field
          name="lieuReunion"
          label="Lieu de la réunion"
          placeholder="Salle CODIR — Siège BSIC NIGER"
          register={register}
          error={errors.lieuReunion?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 2. Participants convoqués */}
      <SectionCard title="2. Participants convoqués">
        <TextareaField
          name="participantsConvoques"
          label="Liste des participants (un par ligne, max 2 000 caractères)"
          rows={4}
          placeholder={
            'M. Issoufou BARRY (DG)\nMme Halima OUSMANE (DGA Opérations)\n…'
          }
          register={register}
          error={errors.participantsConvoques?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 3. Exercice budgétaire concerné */}
      <SectionCard title="3. Exercice budgétaire concerné">
        <Field
          name="exerciceConcerne"
          label="Exercice concerné"
          type="number"
          placeholder="2028"
          register={register}
          error={errors.exerciceConcerne?.message}
          disabled={disabled}
        />
        <Field
          name="dateDebutPreparation"
          label="Début de préparation"
          type="date"
          register={register}
          error={errors.dateDebutPreparation?.message}
          disabled={disabled}
        />
        <Field
          name="dateButoirPreparation"
          label="Date butoir préparation"
          type="date"
          register={register}
          error={errors.dateButoirPreparation?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 4. Ordre du jour (TipTap riche) */}
      <SectionCard title="4. Ordre du jour (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Points, sous-points, durées estimées — utilisez les outils de
            mise en forme
          </Label>
          <Controller
            control={control}
            name="ordreDuJourHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Saisissez l'ordre du jour avec points, sous-points, durées estimées…"
                testId="npd-input-ordreDuJourHtml"
              />
            )}
          />
          {errors.ordreDuJourHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="npd-err-ordreDuJourHtml"
            >
              {errors.ordreDuJourHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 5. Documents pré-lus attendus */}
      <SectionCard title="5. Documents pré-lus attendus">
        <TextareaField
          name="documentsPreLus"
          label="Liste des documents (un par ligne, max 2 000 caractères)"
          rows={4}
          placeholder={
            "Rapport d'activité S1 2027\nNote macro UEMOA novembre 2027\n…"
          }
          register={register}
          error={errors.documentsPreLus?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 6. Points clés à débattre */}
      <SectionCard title="6. Points clés à débattre">
        <TextareaField
          name="pointsClesDebattre"
          label="Texte libre (max 2 000 caractères)"
          rows={4}
          placeholder="Priorités investissement IT 2028 — Politique de provisionnement…"
          register={register}
          error={errors.pointsClesDebattre?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 7. Décisions attendues */}
      <SectionCard title="7. Décisions attendues">
        <TextareaField
          name="decisionsAttendues"
          label="Texte libre (max 2 000 caractères)"
          rows={4}
          placeholder="Validation des axes stratégiques 2028 — Cadrage chiffré du PNB cible — Calendrier d'exécution."
          register={register}
          error={errors.decisionsAttendues?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* Bouton enregistrer */}
      {canEditer && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="btn-save-preparatoire"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Enregistrer la note préparatoire
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
