import { Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  type FaitBudget,
  getFaitBudget,
  type UpdateFaitBudgetDto,
} from '@/lib/api/budget';
import { formatDateFr, formatMontant, formatTaux } from '@/lib/labels/budget';

interface FaitBudgetDetailDrawerProps {
  id: string | null;
  onClose: () => void;
  canEditMesures: boolean;
  canDelete: boolean;
  onPatch: (id: string, dto: UpdateFaitBudgetDto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function FaitBudgetDetailDrawer({
  id,
  onClose,
  canEditMesures,
  canDelete,
  onPatch,
  onDelete,
}: FaitBudgetDetailDrawerProps) {
  const [fait, setFait] = useState<FaitBudget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setFait(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getFaitBudget(id)
      .then(setFait)
      .catch(() => setError('Impossible de charger le détail.'))
      .finally(() => setLoading(false));
  }, [id]);

  const open = id !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de la ligne budget</DialogTitle>
            {fait && (
              <DialogDescription>
                Saisie du {formatDateFr(fait.dateCreation)} par{' '}
                {fait.utilisateurCreation}
              </DialogDescription>
            )}
          </DialogHeader>

          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : error ? (
            <p className="text-(--destructive) text-sm py-2">{error}</p>
          ) : fait ? (
            <>
              {/* Identifiants */}
              <Section title="Identifiants">
                <KV label="Date métier" value={formatDateFr(fait.temps?.date)} />
                <KV
                  label="Date création"
                  value={formatDateFr(fait.dateCreation)}
                />
                <KV
                  label="Utilisateur créateur"
                  value={fait.utilisateurCreation}
                />
                {fait.dateModification && (
                  <>
                    <KV
                      label="Date modification"
                      value={formatDateFr(fait.dateModification)}
                    />
                    <KV
                      label="Utilisateur modification"
                      value={fait.utilisateurModification}
                    />
                  </>
                )}
              </Section>

              {/* Axes dimensionnels */}
              <Section title="Axes dimensionnels">
                <AxisRow label="Compte" code={fait.compte?.code} libelle={fait.compte?.libelle} />
                <AxisRow label="Structure" code={fait.structure?.code} libelle={fait.structure?.libelle} />
                <AxisRow label="CR" code={fait.centre?.code} libelle={fait.centre?.libelle} />
                <AxisRow label="Ligne métier" code={fait.ligneMetier?.code} libelle={fait.ligneMetier?.libelle} />
                <AxisRow label="Produit" code={fait.produit?.code} libelle={fait.produit?.libelle} />
                <AxisRow label="Segment" code={fait.segment?.code} libelle={fait.segment?.libelle} />
                <AxisRow label="Devise" code={fait.devise?.code} libelle={fait.devise?.libelle} />
                <AxisRow label="Version" code={fait.version?.code} libelle={fait.version?.libelle} />
                <AxisRow label="Scénario" code={fait.scenario?.code} libelle={fait.scenario?.libelle} />
              </Section>

              {/* Mesures */}
              <Section title="Mesures">
                <KV
                  label="Montant devise"
                  value={
                    <span className="tabular-nums">
                      {formatMontant(fait.montantDevise, fait.devise?.code ?? 'XOF')}
                      {fait.devise?.code && ` ${fait.devise.code}`}
                    </span>
                  }
                />
                <KV
                  label="Taux de change appliqué"
                  value={
                    <span className="tabular-nums">
                      {formatTaux(fait.tauxChangeApplique)}
                    </span>
                  }
                />
                <KV
                  label="Montant FCFA"
                  value={
                    <span className="tabular-nums font-bold">
                      {formatMontant(fait.montantFcfa, 'XOF')} FCFA
                    </span>
                  }
                />
              </Section>

              <DialogFooter className="gap-2">
                {canEditMesures && (
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier les mesures
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {fait && (
        <EditMesuresDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          fait={fait}
          onSubmit={async (dto) => {
            try {
              await onPatch(fait.id, dto);
              setEditOpen(false);
              onClose();
            } catch (err) {
              const msg =
                (err as { message?: string }).message ?? 'Modification refusée.';
              toast.error(msg);
            }
          }}
        />
      )}

      {fait && (
        <Dialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer cette ligne ?</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment supprimer cette ligne budget ? Cette
                action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await onDelete(fait.id);
                    setConfirmDeleteOpen(false);
                    onClose();
                  } catch (err) {
                    const msg =
                      (err as { message?: string }).message ??
                      'Suppression refusée.';
                    toast.error(msg);
                  }
                }}
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Sub-components

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-(--border) pt-3 pb-2">
      <h3 className="text-xs uppercase font-semibold text-(--muted-foreground) mb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-(--muted-foreground)">{label}</span>
      <span>
        {value === null || value === undefined ? (
          <span className="text-(--muted-foreground)">—</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function AxisRow({
  label,
  code,
  libelle,
}: {
  label: string;
  code?: string;
  libelle?: string;
}) {
  return (
    <KV
      label={label}
      value={
        code ? (
          <span>
            <span className="font-mono text-xs">{code}</span>
            {libelle && (
              <span className="text-(--muted-foreground)"> — {libelle}</span>
            )}
          </span>
        ) : null
      }
    />
  );
}

function EditMesuresDialog({
  open,
  onOpenChange,
  fait,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fait: FaitBudget;
  onSubmit: (dto: UpdateFaitBudgetDto) => Promise<void>;
}) {
  const [montantDevise, setMontantDevise] = useState(String(fait.montantDevise));
  const [tauxChange, setTauxChange] = useState(String(fait.tauxChangeApplique));
  const [montantFcfa, setMontantFcfa] = useState(String(fait.montantFcfa));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMontantDevise(String(fait.montantDevise));
      setTauxChange(String(fait.tauxChangeApplique));
      setMontantFcfa(String(fait.montantFcfa));
    }
  }, [open, fait]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const dto: UpdateFaitBudgetDto = {};
      if (Number(montantDevise) !== fait.montantDevise) {
        dto.montantDevise = Number(montantDevise);
      }
      if (Number(tauxChange) !== fait.tauxChangeApplique) {
        dto.tauxChangeApplique = Number(tauxChange);
      }
      if (Number(montantFcfa) !== fait.montantFcfa) {
        dto.montantFcfa = Number(montantFcfa);
      }
      await onSubmit(dto);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les mesures</DialogTitle>
          <DialogDescription>
            Seules les 3 mesures sont modifiables — les axes ne le sont pas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-montantDevise">Montant devise</Label>
            <Input
              id="edit-montantDevise"
              type="number"
              step="0.0001"
              value={montantDevise}
              onChange={(e) => setMontantDevise(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tauxChange">Taux de change appliqué</Label>
            <Input
              id="edit-tauxChange"
              type="number"
              step="0.00000001"
              value={tauxChange}
              onChange={(e) => setTauxChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-montantFcfa">Montant FCFA</Label>
            <Input
              id="edit-montantFcfa"
              type="number"
              step="0.0001"
              value={montantFcfa}
              onChange={(e) => setMontantFcfa(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
