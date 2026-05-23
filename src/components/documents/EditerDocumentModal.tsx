/**
 * EditerDocumentModal (Lot 8.2.B Palier 3) — modification d'un
 * document BROUILLON par l'émetteur.
 *
 * Spec UX :
 *  - 3 champs éditables (titre, contenuHtml, referenceExterne).
 *  - Code et type sont immutables (déjà tatoués dans l'audit log
 *    et dans le hash signature à venir).
 *  - PATCH partiel : seuls les champs `dirtyFields` RHF sont envoyés.
 *    Si rien n'a changé, toast info + close sans aller-retour API.
 *  - Re-fill du formulaire à chaque ouverture (le `doc` peut avoir
 *    changé entre 2 ouvertures, ex: après upload PDF).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  editerDocument,
  type EditerDocumentDto,
} from '@/lib/api/documents';
import type { DocumentOfficiel } from '@/types/document';

const schema = z.object({
  titre: z.string().min(1, 'Titre requis').max(255, 'Max 255 caractères'),
  contenuHtml: z
    .string()
    .min(1, 'Résumé requis')
    .max(50000, 'Max 50 000 caractères'),
  referenceExterne: z.string().max(255).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface EditerDocumentModalProps {
  open: boolean;
  onClose: () => void;
  doc: DocumentOfficiel;
  onUpdated: (doc: DocumentOfficiel) => void;
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

export function EditerDocumentModal({
  open,
  onClose,
  doc,
  onUpdated,
}: EditerDocumentModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: doc.titre,
      contenuHtml: doc.contenuHtml,
      referenceExterne: doc.referenceExterne ?? '',
    },
  });

  // Re-init quand le doc parent change (ex: après upload PDF qui
  // déclenche un refresh du detailDocument → doc identique mais
  // référence d'objet nouvelle).
  useEffect(() => {
    reset({
      titre: doc.titre,
      contenuHtml: doc.contenuHtml,
      referenceExterne: doc.referenceExterne ?? '',
    });
  }, [doc, reset]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      // PATCH partiel : seuls les champs `dirtyFields` sont envoyés.
      // Évite d'écraser inutilement des champs côté backend +
      // simplifie l'audit log (payloadApres ne mentionne que les
      // vrais changements).
      const dto: EditerDocumentDto = {};
      if (dirtyFields.titre) dto.titre = values.titre;
      if (dirtyFields.contenuHtml) dto.contenuHtml = values.contenuHtml;
      if (dirtyFields.referenceExterne) {
        dto.referenceExterne = values.referenceExterne || undefined;
      }

      if (Object.keys(dto).length === 0) {
        toast.info('Aucune modification à enregistrer.');
        close();
        return;
      }

      const updated = await editerDocument(doc.id, dto);
      onUpdated(updated);
      toast.success(`Document ${updated.codeDocument} modifié.`);
      onClose();
    } catch (err) {
      const message = extractApiMessage(err);
      toast.error(message || 'Modification refusée.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) close();
      }}
    >
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Éditer {doc.codeDocument}</DialogTitle>
          <DialogDescription>
            Code et type immutables (audit BCEAO). Seuls titre, résumé
            et référence externe sont modifiables tant que le document
            est en BROUILLON.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="form-editer-document"
        >
          <div>
            <Label htmlFor="editer-titre">Titre</Label>
            <Input
              id="editer-titre"
              {...register('titre')}
              className="mt-1"
            />
            {errors.titre && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.titre.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="editer-ref">
              Référence externe{' '}
              <span className="text-(--muted-foreground)">
                (optionnel)
              </span>
            </Label>
            <Input
              id="editer-ref"
              {...register('referenceExterne')}
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div>
            <Label htmlFor="editer-contenu">Résumé / Grandes lignes</Label>
            <textarea
              id="editer-contenu"
              {...register('contenuHtml')}
              rows={6}
              className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring)"
            />
            {errors.contenuHtml && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.contenuHtml.message}
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
              data-testid="btn-submit-editer-document"
              className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
