/**
 * SoumissionDialog — modale de confirmation de soumission d'un CR au
 * validateur. Récap (lignes + Produits/Charges/PNB), commentaire
 * optionnel et avertissement de verrouillage.
 */
import { useState } from 'react';

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

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const COMMENT_MAX = 250;

export interface SoumissionRecap {
  nbLignes: number;
  totalProduits: number;
  totalCharges: number;
  pnb: number;
}

interface SoumissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelée au clic Confirmer ; si elle throw, le dialog reste ouvert. */
  onConfirm: (commentaire?: string) => void | Promise<void>;
  crCode: string;
  recap: SoumissionRecap;
  /** Libellé du validateur destinataire (si connu). */
  validateurLabel?: string | null;
}

export function SoumissionDialog({
  isOpen,
  onClose,
  onConfirm,
  crCode,
  recap,
  validateurLabel,
}: SoumissionDialogProps): JSX.Element {
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    try {
      await onConfirm(commentaire.trim() || undefined);
      setCommentaire('');
      onClose();
    } catch {
      // Le caller affiche le toast d'erreur ; on garde le dialog ouvert.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Soumettre le CR {crCode} au validateur</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              Vérifiez votre saisie avant de la transmettre.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="grid grid-cols-2 gap-2 text-sm"
            data-testid="soumission-recap"
          >
            <div className="rounded-md border border-(--border) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                Lignes saisies
              </div>
              <div className="font-semibold tabular-nums">{recap.nbLignes}</div>
            </div>
            <div className="rounded-md border border-(--border) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                Contribution au PNB
              </div>
              <div className="font-semibold tabular-nums">
                {FMT.format(recap.pnb)}
              </div>
            </div>
            <div className="rounded-md border border-(--border) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                Produits (cl. 7)
              </div>
              <div className="font-semibold tabular-nums">
                {FMT.format(recap.totalProduits)}
              </div>
            </div>
            <div className="rounded-md border border-(--border) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                Charges (cl. 6)
              </div>
              <div className="font-semibold tabular-nums">
                {FMT.format(recap.totalCharges)}
              </div>
            </div>
          </div>

          {validateurLabel && (
            <p className="text-sm">
              Destinataire :{' '}
              <strong data-testid="soumission-validateur">
                {validateurLabel}
              </strong>
            </p>
          )}

          <div>
            <Label htmlFor="soumission-commentaire" className="text-xs mb-1 block">
              Commentaire (optionnel)
            </Label>
            <textarea
              id="soumission-commentaire"
              data-testid="soumission-commentaire"
              value={commentaire}
              onChange={(e) =>
                setCommentaire(e.target.value.slice(0, COMMENT_MAX))
              }
              rows={2}
              maxLength={COMMENT_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Précision pour le validateur…"
            />
          </div>

          <div className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 px-3 py-2 text-xs">
            ⚠ Après soumission, vous ne pourrez plus modifier vos lignes sans
            retour (rejet ou réouverture) du validateur.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="soumission-confirmer"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
            {submitting ? 'Soumission…' : 'Confirmer la soumission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
