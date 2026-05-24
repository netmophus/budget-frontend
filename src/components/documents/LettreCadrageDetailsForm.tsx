/**
 * LettreCadrageDetailsForm (Lot 8.2.C P3) — formulaire de saisie du
 * détail métier structuré d'une Lettre de cadrage.
 *
 * 5 sections cards distinctes :
 *  1. En-tête Holding
 *  2. Objectifs quantitatifs (PNB / RN / croissances / coeff / ROE)
 *  3. Ratios prudentiels BCEAO (solvabilité / liquidité / division)
 *  4. Calendrier budgétaire (5 jalons)
 *  5. Orientations stratégiques
 *
 * Modes :
 *  - Édition : si `canEditer` (BROUILLON + émetteur) → bouton
 *    "Enregistrer le cadrage" visible + inputs interactifs
 *  - Lecture seule : sinon → bouton masqué + inputs disabled.
 *    Visualisation possible par tous les acteurs (DOCUMENT.LIRE
 *    suffit côté backend).
 *
 * Pattern aligné Lot 8.2.A AjouterMembreModal / Lot 8.2.B
 * CreerDocumentModal : RHF + zod, gestion d'erreurs AxiosError,
 * toast sonner. Tous les champs sont optionnels (draft incomplet
 * autorisé), validation regex pour les nombres en string.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mettreAJourDetailCadrage } from '@/lib/api/documents';
import type {
  LettreCadrageDetail,
  MettreAJourDetailCadrageDto,
} from '@/types/lettre-cadrage';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

/** Nombre représenté en string (NUMERIC pg). Regex tolère les
 *  négatifs (croissance négative possible) et les décimales. */
const optionalNumberStr = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Nombre invalide (ex: 12500.00)')
  .optional()
  .or(z.literal(''));

const optionalDateStr = z.string().optional().or(z.literal(''));

const schema = z.object({
  referenceHolding: optionalString(100),
  dateEmissionHolding: optionalDateStr,
  signataireHolding: optionalString(255),
  pnbCibleMfcfa: optionalNumberStr,
  rnCibleMfcfa: optionalNumberStr,
  croissanceCreditsPct: optionalNumberStr,
  croissanceDepotsPct: optionalNumberStr,
  coefficientExploitationPct: optionalNumberStr,
  roeCiblePct: optionalNumberStr,
  ratioSolvabiliteMinPct: optionalNumberStr,
  ratioLiquiditeMinPct: optionalNumberStr,
  ratioDivisionRisquesPct: optionalNumberStr,
  dateDebutSaisie: optionalDateStr,
  dateLimiteSaisieCr: optionalDateStr,
  dateValidationDga: optionalDateStr,
  dateValidationDg: optionalDateStr,
  datePublicationBceao: optionalDateStr,
  orientationsStrategiques: optionalString(2000),
});

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    referenceHolding: '',
    dateEmissionHolding: '',
    signataireHolding: '',
    pnbCibleMfcfa: '',
    rnCibleMfcfa: '',
    croissanceCreditsPct: '',
    croissanceDepotsPct: '',
    coefficientExploitationPct: '',
    roeCiblePct: '',
    ratioSolvabiliteMinPct: '',
    ratioLiquiditeMinPct: '',
    ratioDivisionRisquesPct: '',
    dateDebutSaisie: '',
    dateLimiteSaisieCr: '',
    dateValidationDga: '',
    dateValidationDg: '',
    datePublicationBceao: '',
    orientationsStrategiques: '',
  };
}

function detailToFormValues(d: LettreCadrageDetail | null): FormValues {
  if (!d) return emptyValues();
  return {
    referenceHolding: d.referenceHolding ?? '',
    dateEmissionHolding: d.dateEmissionHolding ?? '',
    signataireHolding: d.signataireHolding ?? '',
    pnbCibleMfcfa: d.pnbCibleMfcfa ?? '',
    rnCibleMfcfa: d.rnCibleMfcfa ?? '',
    croissanceCreditsPct: d.croissanceCreditsPct ?? '',
    croissanceDepotsPct: d.croissanceDepotsPct ?? '',
    coefficientExploitationPct: d.coefficientExploitationPct ?? '',
    roeCiblePct: d.roeCiblePct ?? '',
    ratioSolvabiliteMinPct: d.ratioSolvabiliteMinPct ?? '',
    ratioLiquiditeMinPct: d.ratioLiquiditeMinPct ?? '',
    ratioDivisionRisquesPct: d.ratioDivisionRisquesPct ?? '',
    dateDebutSaisie: d.dateDebutSaisie ?? '',
    dateLimiteSaisieCr: d.dateLimiteSaisieCr ?? '',
    dateValidationDga: d.dateValidationDga ?? '',
    dateValidationDg: d.dateValidationDg ?? '',
    datePublicationBceao: d.datePublicationBceao ?? '',
    orientationsStrategiques: d.orientationsStrategiques ?? '',
  };
}

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailCadrageDto {
  // Convert '' → undefined (DTO optional, non envoyé) plutôt que null
  // explicite : évite d'écraser des valeurs existantes côté backend
  // si on submit un champ resté vide. Les vrais effacements (set to
  // null) seront possibles via une UX dédiée si besoin (hors P3).
  const dto: MettreAJourDetailCadrageDto = {};
  for (const [k, v] of Object.entries(values)) {
    if (v && v !== '') {
      (dto as Record<string, string>)[k] = v;
    }
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
      <Label htmlFor={`lcd-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`lcd-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`lcd-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`lcd-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface LettreCadrageDetailsFormProps {
  documentId: string;
  /** True si BROUILLON + user === émetteur. False = lecture seule. */
  canEditer: boolean;
  /** Détail initial chargé par le parent (null si pas encore créé). */
  detail: LettreCadrageDetail | null;
  /** Callback après sauvegarde (rafraîchit le parent). */
  onSaved: (detail: LettreCadrageDetail) => void;
}

export function LettreCadrageDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: LettreCadrageDetailsFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const initial = useMemo(() => detailToFormValues(detail), [detail]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  // Re-init quand le `detail` change (ex: refresh parent après save).
  useEffect(() => {
    reset(initial);
  }, [initial, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const dto = formValuesToDto(values);
      const updated = await mettreAJourDetailCadrage(documentId, dto);
      toast.success('Cadrage enregistré.');
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
      data-testid="lettre-cadrage-form"
    >
      {/* 1. En-tête Holding */}
      <SectionCard title="1. En-tête Holding">
        <Field
          name="referenceHolding"
          label="Référence Holding"
          placeholder="CA/BSIC-HOLDING/2025/047"
          register={register}
          error={errors.referenceHolding?.message}
          disabled={disabled}
        />
        <Field
          name="dateEmissionHolding"
          label="Date d'émission"
          type="date"
          register={register}
          error={errors.dateEmissionHolding?.message}
          disabled={disabled}
        />
        <Field
          name="signataireHolding"
          label="Signataire Holding"
          placeholder="Yacouba HAROUNA, Pdt CA Holding"
          register={register}
          error={errors.signataireHolding?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 2. Objectifs quantitatifs */}
      <SectionCard title="2. Objectifs quantitatifs">
        <Field
          name="pnbCibleMfcfa"
          label="PNB cible (M FCFA)"
          placeholder="12500.00"
          register={register}
          error={errors.pnbCibleMfcfa?.message}
          disabled={disabled}
        />
        <Field
          name="rnCibleMfcfa"
          label="Résultat Net cible (M FCFA)"
          placeholder="1850.00"
          register={register}
          error={errors.rnCibleMfcfa?.message}
          disabled={disabled}
        />
        <Field
          name="croissanceCreditsPct"
          label="Croissance crédits (%)"
          placeholder="12.50"
          register={register}
          error={errors.croissanceCreditsPct?.message}
          disabled={disabled}
        />
        <Field
          name="croissanceDepotsPct"
          label="Croissance dépôts (%)"
          placeholder="8.00"
          register={register}
          error={errors.croissanceDepotsPct?.message}
          disabled={disabled}
        />
        <Field
          name="coefficientExploitationPct"
          label="Coefficient d'exploitation (%)"
          placeholder="55.00"
          register={register}
          error={errors.coefficientExploitationPct?.message}
          disabled={disabled}
        />
        <Field
          name="roeCiblePct"
          label="ROE cible (%)"
          placeholder="15.00"
          register={register}
          error={errors.roeCiblePct?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 3. Ratios BCEAO */}
      <SectionCard title="3. Ratios prudentiels BCEAO">
        <Field
          name="ratioSolvabiliteMinPct"
          label="Solvabilité minimale (%)"
          placeholder="11.50"
          register={register}
          error={errors.ratioSolvabiliteMinPct?.message}
          disabled={disabled}
        />
        <Field
          name="ratioLiquiditeMinPct"
          label="Liquidité minimale (%)"
          placeholder="75.00"
          register={register}
          error={errors.ratioLiquiditeMinPct?.message}
          disabled={disabled}
        />
        <Field
          name="ratioDivisionRisquesPct"
          label="Division des risques (%)"
          placeholder="25.00"
          register={register}
          error={errors.ratioDivisionRisquesPct?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 4. Calendrier */}
      <SectionCard title="4. Calendrier budgétaire">
        <Field
          name="dateDebutSaisie"
          label="Début de saisie"
          type="date"
          register={register}
          error={errors.dateDebutSaisie?.message}
          disabled={disabled}
        />
        <Field
          name="dateLimiteSaisieCr"
          label="Date limite saisie CR"
          type="date"
          register={register}
          error={errors.dateLimiteSaisieCr?.message}
          disabled={disabled}
        />
        <Field
          name="dateValidationDga"
          label="Validation DGA"
          type="date"
          register={register}
          error={errors.dateValidationDga?.message}
          disabled={disabled}
        />
        <Field
          name="dateValidationDg"
          label="Validation DG"
          type="date"
          register={register}
          error={errors.dateValidationDg?.message}
          disabled={disabled}
        />
        <Field
          name="datePublicationBceao"
          label="Publication BCEAO"
          type="date"
          register={register}
          error={errors.datePublicationBceao?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 5. Orientations */}
      <SectionCard title="5. Orientations stratégiques">
        <div className="md:col-span-2">
          <Label htmlFor="lcd-orientations" className="text-xs">
            Texte libre (max 2000 caractères)
          </Label>
          <textarea
            id="lcd-orientations"
            {...register('orientationsStrategiques')}
            disabled={disabled}
            rows={5}
            placeholder="Priorité à la transformation digitale et au renforcement du Tier 1…"
            className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
            data-testid="lcd-input-orientationsStrategiques"
          />
          {errors.orientationsStrategiques && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="lcd-err-orientationsStrategiques"
            >
              {errors.orientationsStrategiques.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* Bouton enregistrer (mode édition uniquement) */}
      {canEditer && (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            data-testid="btn-save-cadrage"
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
                Enregistrer le cadrage
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
