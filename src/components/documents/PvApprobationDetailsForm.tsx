/**
 * PvApprobationDetailsForm (Lot 8.3.D P3) — formulaire de saisie
 * du détail métier structuré d'un PV d'approbation CA (acte officiel
 * d'approbation du budget par le Conseil d'Administration, émis
 * APRÈS la signature de D2).
 *
 * Pattern strictement aligné `NotePreparatoireDetailsForm`
 * (Lot 8.3.C) avec 6 sections cards :
 *  1. Identification (n° résolution + date séance + lieu)
 *  2. Présidence (président + secrétaire de séance)
 *  3. Quorum (présents + total + drapeau quorum atteint)
 *  4. Ordre du jour → `<RichTextEditor>` TipTap (testid "tiptap-ordre-du-jour")
 *  5. Décisions adoptées → `<RichTextEditor>` TipTap (testid "tiptap-decisions")
 *  6. Vote & commentaires (résultat Select 3 options + commentaire président)
 *
 * **Particularités D11** :
 *  - **2 RichTextEditors simultanés** (premier détail métier riche
 *    avec 2 TipTap en parallèle) : testids dédiés "tiptap-ordre-du-jour"
 *    et "tiptap-decisions" pour distinction Vitest
 *  - **1 BOOLEAN** (quorumAtteint) : checkbox HTML 2-state, sémantique
 *    "false par défaut si non touché" (le BOOLEAN DB nullable est
 *    conservé pour insertions back-office potentielles, mais le form
 *    n'envoie jamais null sur ce champ)
 *  - **1 enum string** (voteResultat) : Select shadcn 3 options
 *    (UNANIMITE / MAJORITE / REJETE) + option "—" pour effacer
 *  - **Validation cross-field zod** : présents > total bloque submit
 *    avec message d'erreur clair sur `nbAdministrateursPresents`
 *
 * `nbAdministrateursPresents` et `nbAdministrateursTotal` validés en
 * string (regex) puis convertis en number dans `formValuesToDto`
 * pour matcher backend `@IsInt` (approche pragmatique Lot 8.3.A).
 *
 * Mode lecture seule cohérent Lots 8.2.C / 8.3.A / 8.3.B / 8.3.C.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mettreAJourDetailPvApprobation } from '@/lib/api/documents';
import {
  type MettreAJourDetailPvApprobationDto,
  type PvApprobationDetail,
  VOTE_RESULTATS_VALIDES,
  VOTE_RESULTAT_LABEL,
  type VoteResultat,
} from '@/types/pv-approbation';

// ─── Schema zod ───────────────────────────────────────────────────────

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

const optionalDateStr = z.string().optional().or(z.literal(''));

// Validation string-typée puis conversion → number dans formValuesToDto
// (pattern Lot 8.3.A / 8.3.C — type inféré stable pour le resolver RHF).
const optionalNbAdmin = z
  .string()
  .regex(/^\d+$/, 'Entier positif requis')
  .optional()
  .or(z.literal(''));

const optionalVoteResultat = z
  .enum([...VOTE_RESULTATS_VALIDES, ''] as [string, ...string[]])
  .optional();

const baseSchema = z.object({
  numeroResolution: optionalString(50),
  dateSeanceCa: optionalDateStr,
  lieuSeance: optionalString(255),
  presidentSeance: optionalString(255),
  secretaireSeance: optionalString(255),
  nbAdministrateursPresents: optionalNbAdmin,
  nbAdministrateursTotal: optionalNbAdmin,
  quorumAtteint: z.boolean(),
  ordreDuJourHtml: optionalString(10000),
  decisionsHtml: optionalString(10000),
  voteResultat: optionalVoteResultat,
  commentairePresident: optionalString(2000),
});

// Validation cross-field : présents <= total (côté DB = ck_quorum_coherent_pv).
const schema = baseSchema.refine(
  (data) => {
    if (!data.nbAdministrateursPresents || !data.nbAdministrateursTotal) {
      return true;
    }
    const p = Number.parseInt(data.nbAdministrateursPresents, 10);
    const t = Number.parseInt(data.nbAdministrateursTotal, 10);
    if (Number.isNaN(p) || Number.isNaN(t)) return true;
    return p <= t;
  },
  {
    message:
      'Le nombre de présents ne peut pas dépasser le total des administrateurs',
    path: ['nbAdministrateursPresents'],
  },
);

type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    numeroResolution: '',
    dateSeanceCa: '',
    lieuSeance: '',
    presidentSeance: '',
    secretaireSeance: '',
    nbAdministrateursPresents: '',
    nbAdministrateursTotal: '',
    quorumAtteint: false,
    ordreDuJourHtml: '',
    decisionsHtml: '',
    voteResultat: '',
    commentairePresident: '',
  };
}

function detailToFormValues(d: PvApprobationDetail | null): FormValues {
  if (!d) return emptyValues();
  return {
    numeroResolution: d.numeroResolution ?? '',
    dateSeanceCa: d.dateSeanceCa ?? '',
    lieuSeance: d.lieuSeance ?? '',
    presidentSeance: d.presidentSeance ?? '',
    secretaireSeance: d.secretaireSeance ?? '',
    nbAdministrateursPresents:
      d.nbAdministrateursPresents != null
        ? String(d.nbAdministrateursPresents)
        : '',
    nbAdministrateursTotal:
      d.nbAdministrateursTotal != null
        ? String(d.nbAdministrateursTotal)
        : '',
    quorumAtteint: d.quorumAtteint ?? false,
    ordreDuJourHtml: d.ordreDuJourHtml ?? '',
    decisionsHtml: d.decisionsHtml ?? '',
    voteResultat: d.voteResultat ?? '',
    commentairePresident: d.commentairePresident ?? '',
  };
}

const INTEGER_FIELDS: ReadonlySet<keyof FormValues> = new Set([
  'nbAdministrateursPresents',
  'nbAdministrateursTotal',
]);

function formValuesToDto(
  values: FormValues,
): MettreAJourDetailPvApprobationDto {
  const dto: MettreAJourDetailPvApprobationDto = {};
  for (const [k, v] of Object.entries(values)) {
    // BOOLEAN : toujours envoyé (sémantique 2-state, jamais null en sortie)
    if (k === 'quorumAtteint') {
      dto.quorumAtteint = v === true;
      continue;
    }
    // STRING vide → undefined (préserve les NULL pg, n'écrase pas valeurs serveur)
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
      <Label htmlFor={`pad-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`pad-${name}`}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="mt-1"
        data-testid={`pad-input-${name}`}
      />
      {error && (
        <p
          className="text-xs text-(--destructive) mt-1"
          data-testid={`pad-err-${name}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────

interface PvApprobationDetailsFormProps {
  documentId: string;
  canEditer: boolean;
  detail: PvApprobationDetail | null;
  onSaved: (detail: PvApprobationDetail) => void;
}

export function PvApprobationDetailsForm({
  documentId,
  canEditer,
  detail,
  onSaved,
}: PvApprobationDetailsFormProps) {
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
      const updated = await mettreAJourDetailPvApprobation(documentId, dto);
      toast.success('PV d’approbation enregistré.');
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
      data-testid="pv-approbation-form"
    >
      {/* 1. Identification du PV */}
      <SectionCard title="1. Identification du PV">
        <Field
          name="numeroResolution"
          label="N° de résolution"
          placeholder="CA-BSIC-2027-007"
          register={register}
          error={errors.numeroResolution?.message}
          disabled={disabled}
        />
        <Field
          name="dateSeanceCa"
          label="Date de la séance CA"
          type="date"
          register={register}
          error={errors.dateSeanceCa?.message}
          disabled={disabled}
        />
        <Field
          name="lieuSeance"
          label="Lieu de la séance"
          placeholder="Salle CA — Siège BSIC NIGER"
          register={register}
          error={errors.lieuSeance?.message}
          disabled={disabled}
          fullWidth
        />
      </SectionCard>

      {/* 2. Présidence de séance */}
      <SectionCard title="2. Présidence de séance">
        <Field
          name="presidentSeance"
          label="Président de séance"
          placeholder="M. Boubacar HASSANE"
          register={register}
          error={errors.presidentSeance?.message}
          disabled={disabled}
        />
        <Field
          name="secretaireSeance"
          label="Secrétaire de séance"
          placeholder="Mme Fatima ABDOU"
          register={register}
          error={errors.secretaireSeance?.message}
          disabled={disabled}
        />
      </SectionCard>

      {/* 3. Quorum */}
      <SectionCard title="3. Quorum">
        <Field
          name="nbAdministrateursPresents"
          label="Administrateurs présents"
          type="number"
          placeholder="8"
          register={register}
          error={errors.nbAdministrateursPresents?.message}
          disabled={disabled}
        />
        <Field
          name="nbAdministrateursTotal"
          label="Total administrateurs"
          type="number"
          placeholder="10"
          register={register}
          error={errors.nbAdministrateursTotal?.message}
          disabled={disabled}
        />
        <div className="md:col-span-2 flex items-center gap-3">
          <input
            id="pad-quorumAtteint"
            type="checkbox"
            {...register('quorumAtteint')}
            disabled={disabled}
            className="h-4 w-4 rounded border border-(--border) accent-(--miznas-bleu-nuit-dark) disabled:opacity-60"
            data-testid="pad-input-quorumAtteint"
          />
          <Label htmlFor="pad-quorumAtteint" className="text-xs cursor-pointer">
            Quorum statutaire atteint
          </Label>
        </div>
      </SectionCard>

      {/* 4. Ordre du jour (TipTap riche) */}
      <SectionCard title="4. Ordre du jour de la séance (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Points abordés en séance — utilisez les outils de mise en forme
          </Label>
          <Controller
            control={control}
            name="ordreDuJourHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Approbation du budget 2028, questions diverses…"
                testId="tiptap-ordre-du-jour"
              />
            )}
          />
          {errors.ordreDuJourHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="pad-err-ordreDuJourHtml"
            >
              {errors.ordreDuJourHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 5. Décisions adoptées (TipTap riche) */}
      <SectionCard title="5. Décisions adoptées (éditeur riche)">
        <div className="md:col-span-2">
          <Label className="text-xs">
            Texte des résolutions adoptées par le CA
          </Label>
          <Controller
            control={control}
            name="decisionsHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                readOnly={disabled}
                placeholder="Le CA approuve le budget 2028 cadré à 14 500 M FCFA…"
                testId="tiptap-decisions"
              />
            )}
          />
          {errors.decisionsHtml && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="pad-err-decisionsHtml"
            >
              {errors.decisionsHtml.message}
            </p>
          )}
        </div>
      </SectionCard>

      {/* 6. Vote & commentaires */}
      <SectionCard title="6. Vote & commentaires">
        <div>
          <Label htmlFor="pad-voteResultat" className="text-xs">
            Résultat du vote
          </Label>
          <Controller
            control={control}
            name="voteResultat"
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v: string) => field.onChange(v)}
                disabled={disabled}
              >
                <SelectTrigger
                  id="pad-voteResultat"
                  className="mt-1"
                  data-testid="pad-input-voteResultat"
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {VOTE_RESULTATS_VALIDES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {VOTE_RESULTAT_LABEL[v as VoteResultat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.voteResultat && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="pad-err-voteResultat"
            >
              {errors.voteResultat.message}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="pad-commentairePresident" className="text-xs">
            Commentaire du Président
          </Label>
          <textarea
            id="pad-commentairePresident"
            {...register('commentairePresident')}
            disabled={disabled}
            rows={4}
            placeholder="Le Président félicite la DG pour la qualité du dossier de cadrage…"
            className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) disabled:opacity-60"
            data-testid="pad-input-commentairePresident"
          />
          {errors.commentairePresident && (
            <p
              className="text-xs text-(--destructive) mt-1"
              data-testid="pad-err-commentairePresident"
            >
              {errors.commentairePresident.message}
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
            data-testid="btn-save-pv-approbation"
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
                Enregistrer le PV
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
