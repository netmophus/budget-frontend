/**
 * LettreOfficialisationDetailsForm (Lot 8.3.E P3) — formulaire de
 * saisie du détail métier structuré d'une Lettre d'officialisation
 * BSIC (notification d'approbation du budget aux parties prenantes,
 * émise APRÈS la signature du PV CA).
 *
 * Pattern strictement aligné `PvApprobationDetailsForm` (Lot 8.3.D)
 * avec 5 sections cards :
 *  1. Identification (n° lettre + date émission + objet)
 *  2. Référence PV CA (texte libre — pas de FK frontend)
 *  3. Destinataires (principaux + copies + pièces jointes — 3 textareas)
 *  4. Corps de la lettre → `<RichTextEditor>` TipTap
 *     (testid "tiptap-corps-lettre")
 *  5. Signature & officialisation (signataire + date entrée vigueur +
 *    drapeau cachet apposé)
 *
 * **Particularités D12** :
 *  - **1 seul RichTextEditor** (corpsHtml) vs 2 pour D11
 *  - **1 BOOLEAN** (cachetAppose) : checkbox HTML 2-state, sémantique
 *    "false par défaut si non touché" (cohérent quorumAtteint D11)
 *  - **Validation cross-field zod** : dateEntreeVigueur < dateEmission
 *    bloque submit avec message clair sur `dateEntreeVigueur`
 *
 * Mode lecture seule cohérent Lots précédents.
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
import { mettreAJourDetailLettreOfficialisation } from '@/lib/api/documents';
import type {
  LettreOfficialisationDetail,
  MettreAJourDetailLettreOfficialisationDto,
} from '@/types/lettre-officialisation';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

const optionalDateStr = z.string().optional().or(z.literal(''));

const baseSchema = z.object({
  numeroLettre: optionalString(50),
  dateEmission: optionalDateStr,
  objet: optionalString(500),
  referencePvCa: optionalString(100),
  destinatairesPrincipaux: optionalString(2000),
  destinatairesCopies: optionalString(2000),
  piecesJointes: optionalString(2000),
  corpsHtml: optionalString(10000),
  signataire: optionalString(255),
  dateEntreeVigueur: optionalDateStr,
  cachetAppose: z.boolean(),
});

// Validation cross-field : dateEntreeVigueur >= dateEmission
// (côté DB = ck_dates_lo_coherentes).
const schema = baseSchema.refine(
  (data) => {
    if (!data.dateEmission || !data.dateEntreeVigueur) return true;
    return data.dateEntreeVigueur >= data.dateEmission;
  },
  {
    message:
      "La date d'entrée en vigueur ne peut pas être antérieure à la date d'émission",
    path: ['dateEntreeVigueur'],
  },
);

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    numeroLettre: '',
    dateEmission: '',
    objet: '',
    referencePvCa: '',
    destinatairesPrincipaux: '',
    destinatairesCopies: '',
    piecesJointes: '',
    corpsHtml: '',
    signataire: '',
    dateEntreeVigueur: '',
    cachetAppose: false,
  };
}

function detailToFormValues(
  d: LettreOfficialisationDetail | null,
): FormValues {
  if (!d) return emptyValues();
  return {
    numeroLettre: d.numeroLettre ?? '',
    dateEmission: d.dateEmission ?? '',
    objet: d.objet ?? '',
    referencePvCa: d.referencePvCa ?? '',
    destinatairesPrincipaux: d.destinatairesPrincipaux ?? '',
    destinatairesCopies: d.destinatairesCopies ?? '',
    piecesJointes: d.piecesJointes ?? '',
    corpsHtml: d.corpsHtml ?? '',
    signataire: d.signataire ?? '',
    dateEntreeVigueur: d.dateEntreeVigueur ?? '',
    cachetAppose: d.cachetAppose ?? false,
  };
}

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailLettreOfficialisationDto {
  const dto: MettreAJourDetailLettreOfficialisationDto = {};
  for (const [k, v] of Object.entries(values)) {
    // BOOLEAN : toujours envoyé (sémantique 2-state, jamais null en sortie)
    if (k === 'cachetAppose') {
      dto.cachetAppose = v === true;
      continue;
    }
    // STRING vide → undefined (préserve les NULL pg)
    if (v === '' || v === undefined || v === null) continue;
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
  type?: 'text' | 'date';
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
      <Label htmlFor={`lod-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`lod-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`lod-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`lod-err-${name}`}
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
      <Label htmlFor={`lod-${name}`} className="text-xs">
        {label}
      </Label>
      <textarea
        id={`lod-${name}`}
        {...register(name)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
        data-testid={`lod-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`lod-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface LettreOfficialisationDetailsFormProps {
  documentId: string;
  canEditer: boolean;
  detail: LettreOfficialisationDetail | null;
  onSaved: (detail: LettreOfficialisationDetail) => void;
}

export function LettreOfficialisationDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: LettreOfficialisationDetailsFormProps) {
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
      const updated = await mettreAJourDetailLettreOfficialisation(
        documentId,
        dto,
      );
      toast.success("Lettre d'officialisation enregistrée.");
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
      data-testid="lettre-officialisation-form"
    >
      {/* 1. Identification de la lettre */}
      <SectionCard title="1. Identification de la lettre">
        <Field
          name="numeroLettre"
          label="N° de lettre"
          placeholder="LOFF-BSIC-2027-001"
          register={register}
          error={errors.numeroLettre?.message}
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
          name="objet"
          label="Objet"
          placeholder="Officialisation du budget 2028 approuvé par le CA"
          register={register}
          error={errors.objet?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 2. Référence PV CA (texte libre) */}
      <SectionCard title="2. Référence du PV d'approbation CA">
        <Field
          name="referencePvCa"
          label="Référence libre (n° de résolution ou pointeur)"
          placeholder="CA-BSIC-2027-007"
          register={register}
          error={errors.referencePvCa?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 3. Destinataires */}
      <SectionCard title="3. Destinataires et pièces jointes">
        <TextareaField
          name="destinatairesPrincipaux"
          label="Destinataires principaux (un par ligne)"
          rows={4}
          placeholder={
            'Direction Réseau\nDirection Crédits\nDirection Conformité\n…'
          }
          register={register}
          error={errors.destinatairesPrincipaux?.message}
          disabled={disabled}
        />
        <TextareaField
          name="destinatairesCopies"
          label="Destinataires en copie (BCEAO, holding, etc.)"
          rows={4}
          placeholder={
            'BCEAO Niamey\nCREPMF\nHolding BSIC Tripoli\nCommissariat aux comptes'
          }
          register={register}
          error={errors.destinatairesCopies?.message}
          disabled={disabled}
        />
        <TextareaField
          name="piecesJointes"
          label="Pièces jointes (une par ligne)"
          rows={3}
          placeholder={
            'PV CA n°007 du 18/12/2027\nLettre de cadrage 2028\nNote orientation Comité'
          }
          register={register}
          error={errors.piecesJointes?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 4. Corps de la lettre (TipTap riche) */}
      <SectionCard title="4. Corps de la lettre (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Texte de la lettre officielle — utilisez les outils de mise en
            forme
          </Label>
          <Controller
            control={control}
            name="corpsHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Mesdames et Messieurs les Directeurs, suite à la réunion du CA…"
                testId="tiptap-corps-lettre"
              />
            )}
          />
          {errors.corpsHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="lod-err-corpsHtml"
            >
              {errors.corpsHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 5. Signature & officialisation */}
      <SectionCard title="5. Signature & officialisation">
        <Field
          name="signataire"
          label="Signataire"
          placeholder="M. Issoufou BARRY (Directeur Général)"
          register={register}
          error={errors.signataire?.message}
          disabled={disabled}
        />
        <Field
          name="dateEntreeVigueur"
          label="Date d'entrée en vigueur"
          type="date"
          register={register}
          error={errors.dateEntreeVigueur?.message}
          disabled={disabled}
        />
        <div className="md:col-span-2 flex items-center gap-3">
          <input
            id="lod-cachetAppose"
            type="checkbox"
            {...register('cachetAppose')}
            disabled={disabled}
            className="h-4 w-4 rounded border border-(--border) accent-(--miznas-bleu-nuit-dark) disabled:opacity-60"
            data-testid="lod-input-cachetAppose"
          />
          <Label htmlFor="lod-cachetAppose" className="text-xs cursor-pointer">
            Cachet physique apposé (post-signature électronique)
          </Label>
        </div>
      </SectionCard>

      {/* Bouton enregistrer */}
      {canEditer && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="btn-save-lettre-officialisation"
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
                Enregistrer la lettre
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
