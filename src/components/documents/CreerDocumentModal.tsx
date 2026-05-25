/**
 * CreerDocumentModal (Lot 8.2.B Palier 3) — création d'un document
 * officiel en statut BROUILLON.
 *
 * Spec UX :
 *  - Filtre auto sur campagnes EN_COURS (les autres seraient rejetées
 *    par le backend avec 409, évite un aller-retour).
 *  - Sur succès → toast + close + navigate `/documents/:id` pour que
 *    l'utilisateur enchaîne sur l'upload du PDF original.
 *
 * Pattern aligné CreerCampagneModal Lot 8.2.A : RHF + zod, dropdown
 * users actifs, gestion 409 explicite (code/campagne).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listerCampagnes } from '@/lib/api/campagnes';
import {
  creerDocument,
  type CreerDocumentDto,
} from '@/lib/api/documents';
import type { UserResponse } from '@/lib/api/types';
import { listUsers } from '@/lib/api/users';
import type { Campagne } from '@/types/campagne';
import { type TypeDocument, TYPE_DOCUMENT_LABEL } from '@/types/document';

const TYPES: TypeDocument[] = [
  'D1_NOTE_PREPARATOIRE',
  'D2_LETTRE_CADRAGE',
  'D3_NOTE_ORIENTATION',
  'D5_LETTRE_DG',
  'R3_BORDEREAU_VALIDATION',
  'R5_BORDEREAU_REJET',
  'D11_PV_APPROBATION',
  'D12_LETTRE_OFFICIALISATION',
];

const schema = z.object({
  codeDocument: z
    .string()
    .min(1, 'Code requis')
    .max(50, 'Max 50 caractères')
    .regex(
      /^[A-Z0-9_]+$/,
      'Lettres majuscules, chiffres et underscore uniquement',
    ),
  typeDocument: z.enum([
    'D1_NOTE_PREPARATOIRE',
    'D2_LETTRE_CADRAGE',
    'D3_NOTE_ORIENTATION',
    'D5_LETTRE_DG',
    'R3_BORDEREAU_VALIDATION',
    'R5_BORDEREAU_REJET',
    'D11_PV_APPROBATION',
    'D12_LETTRE_OFFICIALISATION',
  ]),
  fkCampagne: z.string().min(1, 'Campagne requise'),
  titre: z.string().min(1, 'Titre requis').max(255, 'Max 255 caractères'),
  referenceExterne: z.string().max(255).optional().or(z.literal('')),
  fkUserSignataire: z.string().min(1, 'Signataire requis'),
  contenuHtml: z
    .string()
    .min(1, 'Résumé requis')
    .max(50000, 'Max 50 000 caractères'),
});

type FormValues = z.infer<typeof schema>;

interface CreerDocumentModalProps {
  open: boolean;
  onClose: () => void;
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

export function CreerDocumentModal({
  open,
  onClose,
}: CreerDocumentModalProps) {
  const navigate = useNavigate();
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      codeDocument: '',
      typeDocument: 'D2_LETTRE_CADRAGE',
      fkCampagne: '',
      titre: '',
      referenceExterne: '',
      fkUserSignataire: '',
      contenuHtml: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    // Filtre EN_COURS : le backend rejette 409 si campagne en
    // PARAMETRAGE/TERMINEE/ARCHIVEE. On filtre client pour ne pas
    // proposer un choix qui sera de toute façon refusé.
    listerCampagnes()
      .then((all) =>
        setCampagnes(all.filter((c) => c.statut === 'EN_COURS')),
      )
      .catch(() => toast.error('Impossible de charger les campagnes'));
    listUsers({ limit: 100, estActif: true })
      .then((r) => setUsers(r.items))
      .catch(() =>
        toast.error('Impossible de charger la liste des utilisateurs'),
      );
  }, [open]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const dto: CreerDocumentDto = {
        codeDocument: values.codeDocument,
        typeDocument: values.typeDocument,
        fkCampagne: values.fkCampagne,
        titre: values.titre,
        contenuHtml: values.contenuHtml,
        fkUserSignataire: values.fkUserSignataire,
        ...(values.referenceExterne
          ? { referenceExterne: values.referenceExterne }
          : {}),
      };
      const created = await creerDocument(dto);
      toast.success(
        `Document ${created.codeDocument} créé. Uploadez maintenant le PDF original.`,
      );
      onClose();
      reset();
      navigate(`/documents/${created.id}`);
    } catch (err) {
      const status =
        err instanceof AxiosError ? (err.response?.status ?? 0) : 0;
      const message = extractApiMessage(err);
      if (status === 409) {
        toast.error(
          message ||
            'Conflit : code document déjà existant OU campagne pas EN_COURS.',
        );
      } else {
        toast.error(message || 'Création refusée.');
      }
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
          <DialogTitle>Créer un nouveau document officiel</DialogTitle>
          <DialogDescription>
            Le document sera créé en statut BROUILLON. Vous pourrez
            ensuite uploader le PDF original et soumettre au visa.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="form-creer-document"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doc-code">Code</Label>
              <Input
                id="doc-code"
                {...register('codeDocument')}
                placeholder="LETTRE_CADRAGE_2027"
                className="mt-1 font-mono text-xs"
              />
              {errors.codeDocument && (
                <p
                  className="text-xs text-(--destructive) mt-1"
                  data-testid="err-code"
                >
                  {errors.codeDocument.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="doc-type">Type</Label>
              <Controller
                control={control}
                name="typeDocument"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="doc-type"
                      className="mt-1"
                      data-testid="select-type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_DOCUMENT_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="doc-campagne">Campagne</Label>
            <Controller
              control={control}
              name="fkCampagne"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="doc-campagne"
                    className="mt-1"
                    data-testid="select-campagne"
                  >
                    <SelectValue placeholder="Choisir une campagne EN_COURS" />
                  </SelectTrigger>
                  <SelectContent>
                    {campagnes.length === 0 && (
                      <div className="px-2 py-2 text-xs text-(--muted-foreground)">
                        Aucune campagne EN_COURS disponible.
                      </div>
                    )}
                    {campagnes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fkCampagne && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.fkCampagne.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="doc-titre">Titre</Label>
            <Input
              id="doc-titre"
              {...register('titre')}
              placeholder="Lettre de cadrage budgétaire 2027"
              className="mt-1"
            />
            {errors.titre && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.titre.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="doc-ref">
              Référence externe{' '}
              <span className="text-(--muted-foreground)">
                (optionnel)
              </span>
            </Label>
            <Input
              id="doc-ref"
              {...register('referenceExterne')}
              placeholder="Ex: CA/BSIC/2027/001"
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div>
            <Label htmlFor="doc-signataire">Signataire désigné</Label>
            <Controller
              control={control}
              name="fkUserSignataire"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="doc-signataire"
                    className="mt-1"
                    data-testid="select-signataire"
                  >
                    <SelectValue placeholder="Choisir un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.prenom} {u.nom} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fkUserSignataire && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.fkUserSignataire.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="doc-contenu">Résumé / Grandes lignes</Label>
            <textarea
              id="doc-contenu"
              {...register('contenuHtml')}
              rows={5}
              className="w-full mt-1 px-3 py-2 text-sm border border-(--border) rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring)"
              placeholder="Saisissez les grandes lignes du document (le texte intégral reste dans le PDF original)."
            />
            <p className="text-xs text-(--muted-foreground) mt-1">
              Le PDF original sera attaché à l'étape suivante (audit
              BCEAO 10 ans).
            </p>
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
              data-testid="btn-submit-creer-document"
              className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
            >
              {submitting ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
