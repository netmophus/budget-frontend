/**
 * ApporterVisaModal (Lot 8.2.B Palier 4) — visa ou rejet d'un
 * document SOUMIS_VISA par un membre du Comité.
 *
 * 2 modes via radio :
 *  - VISER  : commentaire optionnel
 *  - REJETER : commentaire OBLIGATOIRE (validation zod conditionnelle
 *              via superRefine) — transmis à l'émetteur, document
 *              repasse en BROUILLON.
 *
 * Bouton dynamique :
 *  - "Apporter mon visa" en variant default si VISER
 *  - "Rejeter le document" en variant destructive si REJETER
 *  - Warning visible en mode REJETER pour clarifier l'impact.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  apporterVisa,
  type ApporterVisaDto,
} from '@/lib/api/documents';

const schema = z
  .object({
    action: z.enum(['VISER', 'REJETER']),
    commentaire: z
      .string()
      .max(2000, 'Max 2000 caractères')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (
      data.action === 'REJETER' &&
      (!data.commentaire || data.commentaire.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commentaire'],
        message:
          "Commentaire obligatoire en cas de rejet (sera transmis à l'émetteur).",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface ApporterVisaModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  codeDocument: string;
  onSubmitted: () => void;
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

export function ApporterVisaModal({
  open,
  onClose,
  documentId,
  codeDocument,
  onSubmitted,
}: ApporterVisaModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { action: 'VISER', commentaire: '' },
  });

  // `useWatch` au lieu de `watch()` pour respecter la lint
  // `react-hooks/incompatible-library` (cf. RHF docs).
  const action = useWatch({ control, name: 'action' });
  const isRejet = action === 'REJETER';

  function close() {
    if (submitting) return;
    onClose();
    reset();
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const dto: ApporterVisaDto = {
        action: values.action,
        ...(values.commentaire ? { commentaire: values.commentaire } : {}),
      };
      await apporterVisa(documentId, dto);
      toast.success(
        values.action === 'VISER'
          ? `Visa apposé sur ${codeDocument}.`
          : `Document ${codeDocument} rejeté.`,
      );
      onSubmitted();
      onClose();
      reset();
    } catch (err) {
      const message = extractApiMessage(err);
      toast.error(message || 'Action refusée.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Apporter mon visa sur {codeDocument}</DialogTitle>
          <DialogDescription>
            Choisissez « Viser » pour valider ou « Rejeter » pour
            renvoyer le document à l'émetteur avec un commentaire.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="form-visa"
        >
          <fieldset className="space-y-2">
            <Label>Décision</Label>
            <div className="flex gap-4">
              <label
                className="flex items-center gap-2 cursor-pointer"
                data-testid="radio-viser-label"
              >
                <input
                  type="radio"
                  value="VISER"
                  {...register('action')}
                  data-testid="radio-viser"
                />
                <span className="text-sm">Viser (valider)</span>
              </label>
              <label
                className="flex items-center gap-2 cursor-pointer"
                data-testid="radio-rejeter-label"
              >
                <input
                  type="radio"
                  value="REJETER"
                  {...register('action')}
                  data-testid="radio-rejeter"
                />
                <span className="text-sm">Rejeter</span>
              </label>
            </div>
          </fieldset>

          {isRejet && (
            <div
              className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs"
              data-testid="warning-rejet"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-amber-900">
                Le document repassera en <strong>BROUILLON</strong>.
                L'émetteur devra corriger avant nouvelle soumission. Vos
                commentaires lui seront transmis.
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="visa-commentaire">
              Commentaire{' '}
              {isRejet ? (
                <span className="text-(--destructive)">(obligatoire)</span>
              ) : (
                <span className="text-(--muted-foreground)">(optionnel)</span>
              )}
            </Label>
            <textarea
              id="visa-commentaire"
              {...register('commentaire')}
              rows={4}
              data-testid="textarea-commentaire"
              className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring)"
              placeholder={
                isRejet
                  ? "Indiquez les corrections attendues de l'émetteur."
                  : 'Commentaire optionnel (suggestion, observation…).'
              }
            />
            {errors.commentaire && (
              <p
                className="text-xs text-(--destructive) mt-1"
                data-testid="err-commentaire"
              >
                {errors.commentaire.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={close}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="btn-submit-visa"
              variant={isRejet ? 'destructive' : 'default'}
              className={
                isRejet
                  ? ''
                  : 'bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white'
              }
            >
              {submitting
                ? '…'
                : isRejet
                  ? 'Rejeter le document'
                  : 'Apporter mon visa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
