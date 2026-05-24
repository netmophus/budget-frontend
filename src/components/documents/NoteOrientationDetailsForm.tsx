/**
 * NoteOrientationDetailsForm (Lot 8.3.A P3) — formulaire de saisie
 * du détail métier structuré d'une Note d'orientation interne.
 *
 * Pattern strictement aligné `LettreCadrageDetailsForm` (Lot 8.2.C)
 * avec 7 sections cards :
 *  1. En-tête note interne (4 champs)
 *  2. Période d'application (3 champs)
 *  3. Hypothèses macroéconomiques (5 champs NUMERIC)
 *  4. Positionnement marché (4 champs : 2 % + 2 textuels)
 *  5. 4 axes stratégiques (textuels longs max 500)
 *  6. Description détaillée (RichTextEditor TipTap, HTML max 10 000)
 *  7. Recommandations (textarea simple max 2 000)
 *
 * Modes : édition (canEditer=true) vs lecture seule.
 *
 * Tous les champs optionnels (draft incomplet autorisé). Conversion
 * `'' → undefined` pour le DTO (omission plutôt que null explicite,
 * évite d'écraser des valeurs existantes côté backend).
 *
 * `exerciceConcerne` est un INTEGER (et pas string-NUMERIC) : zod
 * `z.coerce.number().int().min(2020).max(2050)` aligné contrainte
 * SQL `ck_exercice_plausible`.
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
import { mettreAJourDetailNoteOrientation } from '@/lib/api/documents';
import type {
  MettreAJourDetailNoteOrientationDto,
  NoteOrientationDetail,
} from '@/types/note-orientation';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

const optionalNumberStr = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Nombre invalide (ex: 5.50)')
  .optional()
  .or(z.literal(''));

const optionalDateStr = z.string().optional().or(z.literal(''));

// `<input type="number">` retourne toujours une string côté RHF. On
// valide le format string ici (regex entier 4 chiffres + plage
// applicative) et on convertit en `number` dans `formValuesToDto`
// pour matcher le DTO backend (`@IsInt @Min(2020) @Max(2050)`).
// Pattern volontaire (vs z.preprocess) : type inféré stable
// `string | undefined` qui satisfait le resolver RHF strictement.
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
  numeroNote: optionalString(100),
  dateEmission: optionalDateStr,
  emetteurDirection: optionalString(255),
  destinataire: optionalString(255),
  exerciceConcerne: optionalExercice,
  dateDebutApplication: optionalDateStr,
  dateFinApplication: optionalDateStr,
  tauxDirecteurBceaoPct: optionalNumberStr,
  inflationNigerPct: optionalNumberStr,
  croissancePibNigerPct: optionalNumberStr,
  tauxChangeUsdFcfa: optionalNumberStr,
  coursPetroleUsd: optionalNumberStr,
  partMarcheActuellePct: optionalNumberStr,
  partMarcheCiblePct: optionalNumberStr,
  principauxConcurrents: optionalString(500),
  avantagesCompetitifs: optionalString(500),
  axeDigitalisation: optionalString(500),
  axeDeveloppementPme: optionalString(500),
  axeInclusionFinanciere: optionalString(500),
  axeAutresPriorites: optionalString(500),
  descriptionDetailleeHtml: optionalString(10000),
  recommandations: optionalString(2000),
});

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    numeroNote: '',
    dateEmission: '',
    emetteurDirection: '',
    destinataire: '',
    exerciceConcerne: '',
    dateDebutApplication: '',
    dateFinApplication: '',
    tauxDirecteurBceaoPct: '',
    inflationNigerPct: '',
    croissancePibNigerPct: '',
    tauxChangeUsdFcfa: '',
    coursPetroleUsd: '',
    partMarcheActuellePct: '',
    partMarcheCiblePct: '',
    principauxConcurrents: '',
    avantagesCompetitifs: '',
    axeDigitalisation: '',
    axeDeveloppementPme: '',
    axeInclusionFinanciere: '',
    axeAutresPriorites: '',
    descriptionDetailleeHtml: '',
    recommandations: '',
  };
}

function detailToFormValues(d: NoteOrientationDetail | null): FormValues {
  if (!d) return emptyValues();
  return {
    numeroNote: d.numeroNote ?? '',
    dateEmission: d.dateEmission ?? '',
    emetteurDirection: d.emetteurDirection ?? '',
    destinataire: d.destinataire ?? '',
    exerciceConcerne:
      d.exerciceConcerne != null ? String(d.exerciceConcerne) : '',
    dateDebutApplication: d.dateDebutApplication ?? '',
    dateFinApplication: d.dateFinApplication ?? '',
    tauxDirecteurBceaoPct: d.tauxDirecteurBceaoPct ?? '',
    inflationNigerPct: d.inflationNigerPct ?? '',
    croissancePibNigerPct: d.croissancePibNigerPct ?? '',
    tauxChangeUsdFcfa: d.tauxChangeUsdFcfa ?? '',
    coursPetroleUsd: d.coursPetroleUsd ?? '',
    partMarcheActuellePct: d.partMarcheActuellePct ?? '',
    partMarcheCiblePct: d.partMarcheCiblePct ?? '',
    principauxConcurrents: d.principauxConcurrents ?? '',
    avantagesCompetitifs: d.avantagesCompetitifs ?? '',
    axeDigitalisation: d.axeDigitalisation ?? '',
    axeDeveloppementPme: d.axeDeveloppementPme ?? '',
    axeInclusionFinanciere: d.axeInclusionFinanciere ?? '',
    axeAutresPriorites: d.axeAutresPriorites ?? '',
    descriptionDetailleeHtml: d.descriptionDetailleeHtml ?? '',
    recommandations: d.recommandations ?? '',
  };
}

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailNoteOrientationDto {
  const dto: MettreAJourDetailNoteOrientationDto = {};
  for (const [k, v] of Object.entries(values)) {
    // Omet les '' et les undefined : le backend conservera les valeurs
    // existantes pour les champs non envoyés.
    if (v === '' || v === undefined || v === null) continue;
    if (k === 'exerciceConcerne') {
      // Conversion string → number pour matcher @IsInt backend.
      const n = Number.parseInt(String(v), 10);
      if (!Number.isNaN(n)) {
        dto.exerciceConcerne = n;
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
      <Label htmlFor={`nod-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`nod-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`nod-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`nod-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface NoteOrientationDetailsFormProps {
  documentId: string;
  canEditer: boolean;
  detail: NoteOrientationDetail | null;
  onSaved: (detail: NoteOrientationDetail) => void;
}

export function NoteOrientationDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: NoteOrientationDetailsFormProps) {
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
      const updated = await mettreAJourDetailNoteOrientation(
        documentId,
        dto,
      );
      toast.success("Note d'orientation enregistrée.");
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
      data-testid="note-orientation-form"
    >
      {/* 1. En-tête note interne */}
      <SectionCard title="1. En-tête note interne">
        <Field
          name="numeroNote"
          label="Numéro de note"
          placeholder="DG/BSIC-NIGER/2027/ORIENT-01"
          register={register}
          error={errors.numeroNote?.message}
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
          name="emetteurDirection"
          label="Émetteur"
          placeholder="Direction Générale"
          register={register}
          error={errors.emetteurDirection?.message}
          disabled={disabled}
        />
        <Field
          name="destinataire"
          label="Destinataire"
          placeholder="Comité de Direction"
          register={register}
          error={errors.destinataire?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 2. Période d'application */}
      <SectionCard title="2. Période d'application">
        <Field
          name="exerciceConcerne"
          label="Exercice concerné"
          type="number"
          placeholder="2027"
          register={register}
          error={errors.exerciceConcerne?.message}
          disabled={disabled}
        />
        <Field
          name="dateDebutApplication"
          label="Date de début"
          type="date"
          register={register}
          error={errors.dateDebutApplication?.message}
          disabled={disabled}
        />
        <Field
          name="dateFinApplication"
          label="Date de fin"
          type="date"
          register={register}
          error={errors.dateFinApplication?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 3. Hypothèses macroéconomiques */}
      <SectionCard title="3. Hypothèses macroéconomiques">
        <Field
          name="tauxDirecteurBceaoPct"
          label="Taux directeur BCEAO (%)"
          placeholder="5.50"
          register={register}
          error={errors.tauxDirecteurBceaoPct?.message}
          disabled={disabled}
        />
        <Field
          name="inflationNigerPct"
          label="Inflation Niger (%)"
          placeholder="3.20"
          register={register}
          error={errors.inflationNigerPct?.message}
          disabled={disabled}
        />
        <Field
          name="croissancePibNigerPct"
          label="Croissance PIB Niger (%)"
          placeholder="6.80"
          register={register}
          error={errors.croissancePibNigerPct?.message}
          disabled={disabled}
        />
        <Field
          name="tauxChangeUsdFcfa"
          label="Taux change USD/FCFA"
          placeholder="605.50"
          register={register}
          error={errors.tauxChangeUsdFcfa?.message}
          disabled={disabled}
        />
        <Field
          name="coursPetroleUsd"
          label="Cours pétrole (USD/baril)"
          placeholder="78.50"
          register={register}
          error={errors.coursPetroleUsd?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 4. Positionnement marché */}
      <SectionCard title="4. Positionnement marché BSIC">
        <Field
          name="partMarcheActuellePct"
          label="Part de marché actuelle (%)"
          placeholder="14.00"
          register={register}
          error={errors.partMarcheActuellePct?.message}
          disabled={disabled}
        />
        <Field
          name="partMarcheCiblePct"
          label="Part de marché cible (%)"
          placeholder="18.00"
          register={register}
          error={errors.partMarcheCiblePct?.message}
          disabled={disabled}
        />
        <Field
          name="principauxConcurrents"
          label="Principaux concurrents"
          placeholder="Sonibank, Bank of Africa, Ecobank"
          register={register}
          error={errors.principauxConcurrents?.message}
          disabled={disabled}
          fullWidth
        />
        <Field
          name="avantagesCompetitifs"
          label="Avantages compétitifs"
          placeholder="Réseau UEMOA, expertise PME locale…"
          register={register}
          error={errors.avantagesCompetitifs?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 5. Axes stratégiques */}
      <SectionCard title="5. Axes stratégiques prioritaires">
        <Field
          name="axeDigitalisation"
          label="Digitalisation"
          placeholder="Renforcement du mobile banking…"
          register={register}
          error={errors.axeDigitalisation?.message}
          disabled={disabled}
          fullWidth
        />
        <Field
          name="axeDeveloppementPme"
          label="Développement PME"
          placeholder="Doublement des encours PME…"
          register={register}
          error={errors.axeDeveloppementPme?.message}
          disabled={disabled}
          fullWidth
        />
        <Field
          name="axeInclusionFinanciere"
          label="Inclusion financière"
          placeholder="Ouverture de 5 nouvelles agences…"
          register={register}
          error={errors.axeInclusionFinanciere?.message}
          disabled={disabled}
          fullWidth
        />
        <Field
          name="axeAutresPriorites"
          label="Autres priorités"
          placeholder="Formation continue des équipes…"
          register={register}
          error={errors.axeAutresPriorites?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 6. Description détaillée (TipTap) */}
      <SectionCard title="6. Description détaillée (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Analyse détaillée — utilisez les outils de mise en forme
          </Label>
          <Controller
            control={control}
            name="descriptionDetailleeHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Saisissez l'analyse détaillée…"
                testId="nod-input-descriptionDetailleeHtml"
              />
            )}
          />
          {errors.descriptionDetailleeHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="nod-err-descriptionDetailleeHtml"
            >
              {errors.descriptionDetailleeHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 7. Recommandations */}
      <SectionCard title="7. Recommandations">
        <div className="md:col-span-2">
          <Label htmlFor="nod-recommandations" className="text-xs">
            Texte libre (max 2 000 caractères)
          </Label>
          <textarea
            id="nod-recommandations"
            {...register('recommandations')}
            disabled={disabled}
            rows={5}
            placeholder="Soumettre à validation Comité avant 30/09/2026…"
            className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
            data-testid="nod-input-recommandations"
          />
          {errors.recommandations && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="nod-err-recommandations"
            >
              {errors.recommandations.message}
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
            data-testid="btn-save-orientation"
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
                Enregistrer l'orientation
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
