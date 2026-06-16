/**
 * EtendreCalendrierDialog (Lot 8.7.A) — modale d'extension du calendrier.
 *
 * Permet à un ADMIN (REFERENTIEL.GERER) d'ajouter des années au
 * référentiel dim_temps. Opération idempotente côté backend
 * (ON CONFLICT DO NOTHING) : ré-étendre une plage déjà couverte
 * n'ajoute aucun jour.
 */
import { AxiosError } from 'axios';
import { CalendarPlus, Check, X } from 'lucide-react';
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
import { etendreCalendrier } from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';

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

interface EtendreCalendrierDialogProps {
  open: boolean;
  onClose: () => void;
  onExtended: () => void;
  /** Valeur initiale de l'année de début (par défaut année courante + 1). */
  defaultAnneeDebut?: number;
}

export function EtendreCalendrierDialog({
  open,
  onClose,
  onExtended,
  defaultAnneeDebut,
}: EtendreCalendrierDialogProps): JSX.Element | null {
  const canEdit = useHasPermission('REFERENTIEL.GERER');
  const initialDebut = defaultAnneeDebut ?? new Date().getUTCFullYear() + 1;

  const [anneeDebut, setAnneeDebut] = useState<number>(initialDebut);
  const [anneeFin, setAnneeFin] = useState<number>(initialDebut);
  const [exerciceFiscal, setExerciceFiscal] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAnneeDebut(initialDebut);
      setAnneeFin(initialDebut);
      setExerciceFiscal('');
    }
    // initialDebut est dérivé de defaultAnneeDebut (stable par rendu).
  }, [open, initialDebut]);

  if (!canEdit) return null;

  const plageInvalide = anneeFin < anneeDebut;
  const bornesInvalides =
    anneeDebut < 2020 ||
    anneeDebut > 2050 ||
    anneeFin < 2020 ||
    anneeFin > 2050;
  const canSubmit = !submitting && !plageInvalide && !bornesInvalides;

  async function onSubmit(): Promise<void> {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const exo = exerciceFiscal.trim() === '' ? undefined : Number(exerciceFiscal);
      const res = await etendreCalendrier({
        anneeDebut,
        anneeFin,
        ...(exo !== undefined ? { exerciceFiscal: exo } : {}),
      });
      toast.success(res.message);
      onExtended();
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 403) {
        toast.error("Vous n'avez pas la permission d'étendre le calendrier.");
      } else {
        toast.error(message || "Échec de l'extension.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-md max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
        data-testid="etendre-dialog"
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
            <CalendarPlus
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                Étendre le calendrier
              </DialogTitle>
              <p className="text-xs text-white/95 mt-1.5">
                Ajouter des jours pour de nouvelles années. Les jours déjà
                existants ne seront pas dupliqués (opération idempotente).
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="etendre-debut"
                className="text-sm font-medium text-(--foreground)"
              >
                Année début
              </Label>
              <Input
                id="etendre-debut"
                data-testid="etendre-annee-debut"
                type="number"
                min={2020}
                max={2050}
                value={anneeDebut}
                onChange={(e) => setAnneeDebut(Number(e.target.value))}
                disabled={submitting}
                className="h-9 mt-1.5"
              />
            </div>
            <div>
              <Label
                htmlFor="etendre-fin"
                className="text-sm font-medium text-(--foreground)"
              >
                Année fin
              </Label>
              <Input
                id="etendre-fin"
                data-testid="etendre-annee-fin"
                type="number"
                min={2020}
                max={2050}
                value={anneeFin}
                onChange={(e) => setAnneeFin(Number(e.target.value))}
                disabled={submitting}
                className="h-9 mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="etendre-exercice"
              className="text-sm font-medium text-(--foreground)"
            >
              Exercice fiscal{' '}
              <span className="text-(--muted-foreground) font-normal">
                (défaut : année civile)
              </span>
            </Label>
            <Input
              id="etendre-exercice"
              data-testid="etendre-exercice"
              type="number"
              min={2020}
              max={2050}
              value={exerciceFiscal}
              onChange={(e) => setExerciceFiscal(e.target.value)}
              placeholder="Optionnel"
              disabled={submitting}
              className="h-9 mt-1.5"
            />
          </div>

          {plageInvalide && (
            <p
              className="text-xs text-(--destructive)"
              data-testid="etendre-error"
            >
              L&apos;année de fin doit être supérieure ou égale à l&apos;année
              de début.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting} className="gap-1.5">
              <X className="w-3 h-3" />
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            data-testid="etendre-submit"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Check className="w-3 h-3" />
            {submitting ? 'Extension…' : 'Étendre'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
