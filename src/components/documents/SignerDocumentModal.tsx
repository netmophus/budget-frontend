/**
 * SignerDocumentModal (Lot 8.2.B Palier 4) — signature ÉLECTRONIQUE
 * définitive d'un document VISE par le signataire désigné.
 *
 * Action la plus critique du module Documents officiels :
 *  - IRRÉVERSIBLE (pas de retour arrière)
 *  - IMMUABLE (le contenu ne peut plus être modifié, hash crypto figé)
 *  - TRACÉE (audit BCEAO 10 ans, capture IP + User-Agent)
 *
 * UX bancaire stricte :
 *  - Encart explicatif rappelant les 3 caractères ci-dessus
 *  - Champ mot de passe (type='password' — JAMAIS 'text')
 *  - Checkbox de confirmation explicite OBLIGATOIRE
 *  - Bouton "Signer définitivement" en destructive,
 *    DISABLED tant que mdp vide OU checkbox non cochée
 *
 * Gestion erreurs spécifique :
 *  - 401 → toast "Mot de passe incorrect" (PAS de clear du form,
 *    l'utilisateur peut retenter)
 *  - 409 → toast "Statut invalide" + refresh parent (le doc a peut-être
 *    déjà été signé entre-temps par une autre action)
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { signerDocument } from '@/lib/api/documents';

interface SignerDocumentModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  codeDocument: string;
  titre: string;
  onSigned: () => void;
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

export function SignerDocumentModal({
  open,
  onClose,
  documentId,
  codeDocument,
  titre,
  onSigned,
}: SignerDocumentModalProps) {
  const [motDePasse, setMotDePasse] = useState('');
  const [confirme, setConfirme] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (submitting) return;
    setMotDePasse('');
    setConfirme(false);
    onClose();
  }

  const canSubmit = motDePasse.length > 0 && confirme && !submitting;

  async function handleSign() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await signerDocument(documentId, {
        motDePasse,
      });
      toast.success(
        `Document ${codeDocument} signé. Hash enregistré pour audit BCEAO.`,
      );
      onSigned();
      // Reset PUIS close (pour ne pas garder le mdp en mémoire après).
      setMotDePasse('');
      setConfirme(false);
      onClose();
    } catch (err) {
      const status =
        err instanceof AxiosError ? (err.response?.status ?? 0) : 0;
      const message = extractApiMessage(err);
      if (status === 401) {
        // Pas de clear du form — l'utilisateur peut retenter.
        toast.error('Mot de passe incorrect.');
      } else if (status === 409) {
        toast.error(
          message ||
            'Statut invalide. Le document a peut-être déjà été signé.',
        );
        onSigned(); // déclenche refresh parent
        onClose();
      } else {
        toast.error(message || 'Signature refusée.');
      }
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
      <DialogContent className="sm:max-w-[560px] border-2 border-amber-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="w-5 h-5" />
            SIGNATURE ÉLECTRONIQUE — Action irréversible
          </DialogTitle>
          <DialogDescription>
            Vous vous apprêtez à signer définitivement le document
            ci-dessous. Re-saisie du mot de passe + confirmation
            explicite obligatoires.
          </DialogDescription>
        </DialogHeader>

        {/* Encart explicatif */}
        <div
          className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs"
          data-testid="encart-irreversible"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-amber-900 space-y-2">
            <div>
              <strong className="font-mono">{codeDocument}</strong> —{' '}
              {titre}
            </div>
            <div>
              Cette action est :
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>
                  <strong>IRRÉVERSIBLE</strong> (aucun retour possible)
                </li>
                <li>
                  <strong>IMMUABLE</strong> (le contenu sera figé via
                  hash crypto)
                </li>
                <li>
                  <strong>TRACÉE</strong> (audit BCEAO 10 ans + capture
                  IP / User-Agent)
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="signer-mdp">Re-saisissez votre mot de passe</Label>
            <Input
              id="signer-mdp"
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              disabled={submitting}
              data-testid="input-mdp"
              className="mt-1"
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="signer-confirme"
              checked={confirme}
              onChange={(e) => setConfirme(e.target.checked)}
              disabled={submitting}
              data-testid="checkbox-confirme"
              className="mt-1 h-4 w-4 rounded border-(--border)"
            />
            <Label htmlFor="signer-confirme" className="font-normal text-xs">
              Je confirme avoir pris connaissance du contenu et engager
              ma responsabilité de signataire pour ce document.
            </Label>
          </div>
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
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => void handleSign()}
            data-testid="btn-submit-signer"
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Signature…
              </>
            ) : (
              'Signer définitivement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
