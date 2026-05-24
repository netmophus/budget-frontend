/**
 * LettreMobilisationDetailsForm (Lot 8.3.B P3) — formulaire de saisie
 * du détail métier structuré d'une Lettre de mobilisation DG.
 *
 * Pattern strictement aligné `NoteOrientationDetailsForm` (Lot 8.3.A)
 * avec 7 sections cards :
 *  1. En-tête lettre officielle (3 champs)
 *  2. Période d'exécution (3 champs)
 *  3. Objectifs globaux BSIC (4 NUMERIC)
 *  4. Indicateurs de mobilisation (2 NUMERIC + 1 INTEGER)
 *  5. Échéances clés (5 dates)
 *  6. Message DG → `<RichTextEditor>` TipTap (réutilisé Lot 8.3.A)
 *  7. Engagement attendu (textarea max 2000)
 *
 * `exerciceConcerne` et `nbObjectifsPrioritaires` sont validés en
 * string (regex) puis convertis en number dans `formValuesToDto`
 * pour matcher backend `@IsInt` (approche pragmatique Lot 8.3.A —
 * type inféré stable pour le resolver RHF).
 *
 * Mode lecture seule cohérent Lots 8.2.C / 8.3.A.
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
import { mettreAJourDetailLettreMobilisation } from '@/lib/api/documents';
import type {
  LettreMobilisationDetail,
  MettreAJourDetailLettreMobilisationDto,
} from '@/types/lettre-mobilisation';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

const optionalNumberStr = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Nombre invalide (ex: 14500.00)')
  .optional()
  .or(z.literal(''));

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

// Nombre d'objectifs prioritaires : INTEGER >= 0 côté backend.
// Pattern aligné `optionalExercice` : string validée puis convertie.
const optionalNbObjectifs = z
  .string()
  .regex(/^\d+$/, 'Entier positif requis')
  .refine(
    (s) => {
      const n = Number.parseInt(s, 10);
      return n >= 0;
    },
    { message: 'Nombre négatif interdit' },
  )
  .optional()
  .or(z.literal(''));

const schema = z.object({
  referenceLettre: optionalString(100),
  dateEmission: optionalDateStr,
  destinatairesDirections: optionalString(1000),
  exerciceConcerne: optionalExercice,
  dateDebutExecution: optionalDateStr,
  dateFinExecution: optionalDateStr,
  pnbConsolideMfcfa: optionalNumberStr,
  rnConsolideMfcfa: optionalNumberStr,
  croissanceCreditsGlobalePct: optionalNumberStr,
  croissanceDepotsGlobalePct: optionalNumberStr,
  tauxParticipationVisePct: optionalNumberStr,
  nbObjectifsPrioritaires: optionalNbObjectifs,
  tauxConformiteBudgetairePct: optionalNumberStr,
  dateReunionMobilisation: optionalDateStr,
  dateDebutSaisieObjectifs: optionalDateStr,
  datePremierPointAvancement: optionalDateStr,
  dateValidationFinale: optionalDateStr,
  dateCommunicationBceao: optionalDateStr,
  messageDgHtml: optionalString(10000),
  engagementAttendu: optionalString(2000),
});

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    referenceLettre: '',
    dateEmission: '',
    destinatairesDirections: '',
    exerciceConcerne: '',
    dateDebutExecution: '',
    dateFinExecution: '',
    pnbConsolideMfcfa: '',
    rnConsolideMfcfa: '',
    croissanceCreditsGlobalePct: '',
    croissanceDepotsGlobalePct: '',
    tauxParticipationVisePct: '',
    nbObjectifsPrioritaires: '',
    tauxConformiteBudgetairePct: '',
    dateReunionMobilisation: '',
    dateDebutSaisieObjectifs: '',
    datePremierPointAvancement: '',
    dateValidationFinale: '',
    dateCommunicationBceao: '',
    messageDgHtml: '',
    engagementAttendu: '',
  };
}

function detailToFormValues(
  d: LettreMobilisationDetail | null,
): FormValues {
  if (!d) return emptyValues();
  return {
    referenceLettre: d.referenceLettre ?? '',
    dateEmission: d.dateEmission ?? '',
    destinatairesDirections: d.destinatairesDirections ?? '',
    exerciceConcerne:
      d.exerciceConcerne != null ? String(d.exerciceConcerne) : '',
    dateDebutExecution: d.dateDebutExecution ?? '',
    dateFinExecution: d.dateFinExecution ?? '',
    pnbConsolideMfcfa: d.pnbConsolideMfcfa ?? '',
    rnConsolideMfcfa: d.rnConsolideMfcfa ?? '',
    croissanceCreditsGlobalePct: d.croissanceCreditsGlobalePct ?? '',
    croissanceDepotsGlobalePct: d.croissanceDepotsGlobalePct ?? '',
    tauxParticipationVisePct: d.tauxParticipationVisePct ?? '',
    nbObjectifsPrioritaires:
      d.nbObjectifsPrioritaires != null
        ? String(d.nbObjectifsPrioritaires)
        : '',
    tauxConformiteBudgetairePct: d.tauxConformiteBudgetairePct ?? '',
    dateReunionMobilisation: d.dateReunionMobilisation ?? '',
    dateDebutSaisieObjectifs: d.dateDebutSaisieObjectifs ?? '',
    datePremierPointAvancement: d.datePremierPointAvancement ?? '',
    dateValidationFinale: d.dateValidationFinale ?? '',
    dateCommunicationBceao: d.dateCommunicationBceao ?? '',
    messageDgHtml: d.messageDgHtml ?? '',
    engagementAttendu: d.engagementAttendu ?? '',
  };
}

const INTEGER_FIELDS: ReadonlySet<keyof FormValues> = new Set([
  'exerciceConcerne',
  'nbObjectifsPrioritaires',
]);

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailLettreMobilisationDto {
  const dto: MettreAJourDetailLettreMobilisationDto = {};
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
      <Label htmlFor={`lmd-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`lmd-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`lmd-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`lmd-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface LettreMobilisationDetailsFormProps {
  documentId: string;
  canEditer: boolean;
  detail: LettreMobilisationDetail | null;
  onSaved: (detail: LettreMobilisationDetail) => void;
}

export function LettreMobilisationDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: LettreMobilisationDetailsFormProps) {
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
      const updated = await mettreAJourDetailLettreMobilisation(
        documentId,
        dto,
      );
      toast.success('Lettre de mobilisation enregistrée.');
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
      data-testid="lettre-mobilisation-form"
    >
      {/* 1. En-tête lettre officielle */}
      <SectionCard title="1. En-tête lettre officielle">
        <Field
          name="referenceLettre"
          label="Référence lettre"
          placeholder="DG/BSIC-NIGER/2028/MOBIL-01"
          register={register}
          error={errors.referenceLettre?.message}
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
        <div className="md:col-span-2">
          <Label
            htmlFor="lmd-destinatairesDirections"
            className="text-xs"
          >
            Destinataires (directions)
          </Label>
          <textarea
            id="lmd-destinatairesDirections"
            {...register('destinatairesDirections')}
            disabled={disabled}
            rows={2}
            placeholder="Direction Réseau, Direction Crédits, Direction Conformité…"
            className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
            data-testid="lmd-input-destinatairesDirections"
          />
          {errors.destinatairesDirections && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="lmd-err-destinatairesDirections"
            >
              {errors.destinatairesDirections.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 2. Période d'exécution */}
      <SectionCard title="2. Période d'exécution">
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
          name="dateDebutExecution"
          label="Date de début"
          type="date"
          register={register}
          error={errors.dateDebutExecution?.message}
          disabled={disabled}
        />
        <Field
          name="dateFinExecution"
          label="Date de fin"
          type="date"
          register={register}
          error={errors.dateFinExecution?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 3. Objectifs globaux BSIC NIGER */}
      <SectionCard title="3. Objectifs globaux BSIC NIGER">
        <Field
          name="pnbConsolideMfcfa"
          label="PNB consolidé cible (M FCFA)"
          placeholder="14500.00"
          register={register}
          error={errors.pnbConsolideMfcfa?.message}
          disabled={disabled}
        />
        <Field
          name="rnConsolideMfcfa"
          label="RN consolidé cible (M FCFA)"
          placeholder="1200.00"
          register={register}
          error={errors.rnConsolideMfcfa?.message}
          disabled={disabled}
        />
        <Field
          name="croissanceCreditsGlobalePct"
          label="Croissance crédits globale (%)"
          placeholder="13.00"
          register={register}
          error={errors.croissanceCreditsGlobalePct?.message}
          disabled={disabled}
        />
        <Field
          name="croissanceDepotsGlobalePct"
          label="Croissance dépôts globale (%)"
          placeholder="10.00"
          register={register}
          error={errors.croissanceDepotsGlobalePct?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 4. Indicateurs de mobilisation */}
      <SectionCard title="4. Indicateurs de mobilisation">
        <Field
          name="tauxParticipationVisePct"
          label="Taux participation visé (%)"
          placeholder="95.00"
          register={register}
          error={errors.tauxParticipationVisePct?.message}
          disabled={disabled}
        />
        <Field
          name="nbObjectifsPrioritaires"
          label="Nb objectifs prioritaires"
          type="number"
          placeholder="12"
          register={register}
          error={errors.nbObjectifsPrioritaires?.message}
          disabled={disabled}
        />
        <Field
          name="tauxConformiteBudgetairePct"
          label="Taux conformité budgétaire (%)"
          placeholder="98.00"
          register={register}
          error={errors.tauxConformiteBudgetairePct?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 5. Échéances clés (5 jalons) */}
      <SectionCard title="5. Échéances clés">
        <Field
          name="dateReunionMobilisation"
          label="Réunion de mobilisation"
          type="date"
          register={register}
          error={errors.dateReunionMobilisation?.message}
          disabled={disabled}
        />
        <Field
          name="dateDebutSaisieObjectifs"
          label="Début saisie objectifs CR"
          type="date"
          register={register}
          error={errors.dateDebutSaisieObjectifs?.message}
          disabled={disabled}
        />
        <Field
          name="datePremierPointAvancement"
          label="1er point d'avancement"
          type="date"
          register={register}
          error={errors.datePremierPointAvancement?.message}
          disabled={disabled}
        />
        <Field
          name="dateValidationFinale"
          label="Validation finale"
          type="date"
          register={register}
          error={errors.dateValidationFinale?.message}
          disabled={disabled}
        />
        <Field
          name="dateCommunicationBceao"
          label="Communication BCEAO"
          type="date"
          register={register}
          error={errors.dateCommunicationBceao?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 6. Message du DG (TipTap) */}
      <SectionCard title="6. Message du Directeur Général (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Discours mobilisateur du DG — utilisez les outils de mise en
            forme
          </Label>
          <Controller
            control={control}
            name="messageDgHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Discours mobilisateur du DG…"
                testId="lmd-input-messageDgHtml"
              />
            )}
          />
          {errors.messageDgHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="lmd-err-messageDgHtml"
            >
              {errors.messageDgHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 7. Engagement attendu */}
      <SectionCard title="7. Engagement attendu">
        <div className="md:col-span-2">
          <Label htmlFor="lmd-engagementAttendu" className="text-xs">
            Texte libre (max 2 000 caractères)
          </Label>
          <textarea
            id="lmd-engagementAttendu"
            {...register('engagementAttendu')}
            disabled={disabled}
            rows={5}
            placeholder="Chaque Directeur s'engage à respecter le calendrier et à atteindre les indicateurs…"
            className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
            data-testid="lmd-input-engagementAttendu"
          />
          {errors.engagementAttendu && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="lmd-err-engagementAttendu"
            >
              {errors.engagementAttendu.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* Bouton enregistrer */}
      {canEditer && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="btn-save-mobilisation"
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
                Enregistrer la mobilisation
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
