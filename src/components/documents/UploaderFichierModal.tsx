/**
 * UploaderFichierModal (Lot 8.2.B Palier 3) — upload du PDF original
 * attaché à un document.
 *
 * Validation côté client AVANT envoi (évite des allers-retours backend
 * pour des 400 prévisibles) :
 *  - file.type === 'application/pdf'
 *  - file.size <= 10 MB
 *
 * Mode wording adapté selon le contexte :
 *  - Premier upload (`fichierJointNom === null`) : "Uploader le PDF
 *    original"
 *  - Remplacement (`fichierJointNom !== null`) : "Remplacer le PDF"
 *    + warning jaune avec nom de l'ancien fichier
 *
 * Pas de Progress shadcn (cf. découverte Lot 8.2.B P1) → spinner
 * Loader2 + label "Upload en cours…". Suffisant pour 10 MB max.
 */
import { AxiosError } from 'axios';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { uploadFichierDocument } from '@/lib/api/documents';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (aligné backend Lot 8.1.D)

interface UploaderFichierModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  /** Nom du fichier actuel (mode remplacement) ou null (premier upload). */
  fichierJointNom: string | null;
  onUploaded: () => void;
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

export function UploaderFichierModal({
  open,
  onClose,
  documentId,
  fichierJointNom,
  onUploaded,
}: UploaderFichierModalProps) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurClient, setErreurClient] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isReplacement = !!fichierJointNom;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setErreurClient(null);
    setFichier(null);
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErreurClient(
        `Seuls les fichiers PDF (Content-Type: application/pdf) sont acceptés. Reçu : "${file.type || 'inconnu'}".`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      setErreurClient(
        `Fichier trop volumineux (${mb} MB). Limite : 10 MB.`,
      );
      return;
    }
    setFichier(file);
  }

  async function handleUpload() {
    if (!fichier) return;
    setSubmitting(true);
    try {
      const result = await uploadFichierDocument(documentId, fichier);
      toast.success(
        `${result.fichierNom} uploadé (${(result.fichierTaille / 1024).toFixed(1)} KB).`,
      );
      onUploaded();
      close();
    } catch (err) {
      const message = extractApiMessage(err);
      toast.error(message || 'Upload refusé.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (submitting) return;
    setFichier(null);
    setErreurClient(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isReplacement
              ? 'Remplacer le PDF'
              : 'Uploader le PDF original'}
          </DialogTitle>
          <DialogDescription>
            Fichier PDF uniquement, taille maximale 10 MB. Validation
            magic bytes côté backend en plus du Content-Type.
          </DialogDescription>
        </DialogHeader>

        {isReplacement && (
          <div
            className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs"
            data-testid="warning-replacement"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-amber-900">
              Le fichier actuel{' '}
              <strong className="font-mono">{fichierJointNom}</strong>{' '}
              sera écrasé. Cette action n'est pas réversible.
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="fichier-input">Choisir un fichier PDF</Label>
          <input
            id="fichier-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            data-testid="input-fichier"
            className="block w-full mt-1 text-sm text-(--muted-foreground)
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-(--miznas-bleu-nuit-dark) file:text-white
              hover:file:bg-(--miznas-bleu-nuit-dark)/90
              file:cursor-pointer cursor-pointer"
          />
          {fichier && !erreurClient && (
            <div
              className="flex items-center gap-2 mt-3 p-2 border border-(--border) rounded-md bg-(--secondary)"
              data-testid="fichier-selected"
            >
              <FileText className="w-4 h-4 text-(--miznas-bleu-nuit-dark)" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {fichier.name}
                </div>
                <div className="text-[10px] text-(--muted-foreground) tabular-nums">
                  {(fichier.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
          )}
          {erreurClient && (
            <p
              className="text-xs text-(--destructive) mt-2"
              data-testid="erreur-client"
            >
              {erreurClient}
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
            type="button"
            disabled={!fichier || submitting || !!erreurClient}
            onClick={() => void handleUpload()}
            data-testid="btn-submit-upload"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Upload en cours…
              </>
            ) : (
              'Uploader'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
