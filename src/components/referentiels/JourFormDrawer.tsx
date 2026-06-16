/**
 * JourFormDrawer (Lot 8.7.A) — modale d'édition d'un jour du calendrier.
 *
 * Pattern modale unifié (cf. ProduitFormDrawer) : header gradient bleu
 * nuit + body scrollable + footer sticky. Édite uniquement les champs
 * « métier » (jour_ouvre, fins de période, libellé férié). Les colonnes
 * calculées sont affichées en lecture seule. Réservé REFERENTIEL.GERER
 * (gating supplémentaire au niveau page).
 */
import { AxiosError } from 'axios';
import { Calendar, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type JourTemps,
  type JourTempsForm,
  updateJourTemps,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';

const JOURS_SEMAINE_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function jourSemaineFr(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return JOURS_SEMAINE_FR[day]!;
}

function parseApiError(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const dataMsg = (
      err.response?.data as { message?: string | string[] } | undefined
    )?.message;
    const message = Array.isArray(dataMsg)
      ? dataMsg.join(' ; ')
      : (dataMsg ?? err.message);
    return { status, message };
  }
  return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
}

interface FormState {
  jourOuvre: boolean;
  estFinDeMois: boolean;
  estFinDeTrimestre: boolean;
  estFinDAnnee: boolean;
  libelleJour: string;
}

function initialFrom(jour: JourTemps): FormState {
  return {
    jourOuvre: jour.jourOuvre,
    estFinDeMois: jour.estFinDeMois,
    estFinDeTrimestre: jour.estFinDeTrimestre,
    estFinDAnnee: jour.estFinDAnnee,
    libelleJour: jour.libelleJour ?? '',
  };
}

interface JourFormDrawerProps {
  jour: JourTemps | null;
  onClose: () => void;
  onSaved: () => void;
}

export function JourFormDrawer({
  jour,
  onClose,
  onSaved,
}: JourFormDrawerProps): JSX.Element | null {
  const canEdit = useHasPermission('REFERENTIEL.GERER');
  const [form, setForm] = useState<FormState>(
    jour ? initialFrom(jour) : initialFrom({} as JourTemps),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (jour) setForm(initialFrom(jour));
  }, [jour]);

  if (!canEdit || !jour) return null;

  async function onSubmit(): Promise<void> {
    if (!jour) return;
    setSubmitting(true);
    try {
      const payload: JourTempsForm = {
        jourOuvre: form.jourOuvre,
        estFinDeMois: form.estFinDeMois,
        estFinDeTrimestre: form.estFinDeTrimestre,
        estFinDAnnee: form.estFinDAnnee,
        // Libellé n'a de sens que pour un jour férié.
        libelleJour: form.jourOuvre ? null : form.libelleJour.trim() || null,
      };
      await updateJourTemps(jour.id, payload);
      toast.success(`Jour du ${formatDateFr(jour.date)} mis à jour.`);
      onSaved();
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 403) {
        toast.error("Vous n'avez pas la permission de modifier le calendrier.");
      } else if (status === 404) {
        toast.error('Jour introuvable.');
      } else {
        toast.error(message || "Échec de l'enregistrement.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={jour !== null}
      onOpenChange={(o) => !o && !submitting && onClose()}
    >
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-lg max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
        data-testid="jour-form-dialog"
      >
        {/* Header gradient */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <Calendar
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                Modifier le jour du {formatDateFr(jour.date)}
              </DialogTitle>
              <p className="text-xs text-white/95 mt-1.5">
                {jourSemaineFr(jour.date)}
              </p>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="px-7 py-5 overflow-y-auto flex-1 space-y-4">
          {/* Toggle jour ouvré */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              data-testid="jour-form-ouvre"
              checked={form.jourOuvre}
              onChange={(e) =>
                setForm({ ...form, jourOuvre: e.target.checked })
              }
              disabled={submitting}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            <span className="font-medium">
              Jour ouvré {form.jourOuvre ? '' : '(férié / chômé)'}
            </span>
          </label>

          {/* Libellé férié — actif seulement si non ouvré */}
          <div>
            <Label
              htmlFor="jour-libelle"
              className="text-sm font-medium text-(--foreground)"
            >
              Libellé jour férié
            </Label>
            <Input
              id="jour-libelle"
              data-testid="jour-form-libelle"
              value={form.libelleJour}
              onChange={(e) =>
                setForm({ ...form, libelleJour: e.target.value })
              }
              placeholder="Ex: Aïd el-Fitr, Tabaski 2027, Décret présidentiel…"
              disabled={form.jourOuvre || submitting}
              maxLength={255}
              className="h-9 mt-1.5"
            />
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {form.jourOuvre
                ? 'Décochez « Jour ouvré » pour saisir un libellé de férié.'
                : 'Optionnel — max 255 caractères.'}
            </p>
          </div>

          {/* Drapeaux de fin de période */}
          <div className="pt-3 border-t border-(--border) space-y-2.5">
            <FlagCheckbox
              testId="jour-form-fin-mois"
              label="Fin de mois"
              checked={form.estFinDeMois}
              disabled={submitting}
              onChange={(v) => setForm({ ...form, estFinDeMois: v })}
            />
            <FlagCheckbox
              testId="jour-form-fin-trimestre"
              label="Fin de trimestre"
              checked={form.estFinDeTrimestre}
              disabled={submitting}
              onChange={(v) => setForm({ ...form, estFinDeTrimestre: v })}
            />
            <FlagCheckbox
              testId="jour-form-fin-annee"
              label="Fin d'année"
              checked={form.estFinDAnnee}
              disabled={submitting}
              onChange={(v) => setForm({ ...form, estFinDAnnee: v })}
            />
          </div>

          {/* Informations en lecture seule */}
          <div className="pt-3 border-t border-(--border)">
            <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider mb-2">
              Informations (lecture seule)
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              <ReadOnly label="Date" value={formatDateFr(jour.date)} />
              <ReadOnly label="Année" value={jour.annee} />
              <ReadOnly label="Trimestre" value={`T${jour.trimestre}`} />
              <ReadOnly label="Mois" value={jour.mois} />
              <ReadOnly label="Semaine ISO" value={jour.semaineIso ?? '—'} />
              <ReadOnly label="Exercice fiscal" value={jour.exerciceFiscal} />
            </dl>
          </div>
        </div>

        {/* Footer sticky */}
        <div className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting} className="gap-1.5">
              <X className="w-3 h-3" />
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            data-testid="jour-form-save"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Check className="w-3 h-3" />
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FlagCheckboxProps {
  testId: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function FlagCheckbox({
  testId,
  label,
  checked,
  disabled,
  onChange,
}: FlagCheckboxProps): JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        data-testid={testId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
      />
      {label}
    </label>
  );
}

function ReadOnly({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-(--muted-foreground)">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
