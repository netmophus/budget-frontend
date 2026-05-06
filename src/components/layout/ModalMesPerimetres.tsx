/**
 * ModalMesPerimetres (Lot 4.1.C) — vue lecture seule des périmètres
 * actifs de l'utilisateur connecté.
 */
import { Briefcase, Grid3x3, Target } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type AffectationPerimetre,
  CIBLE_TYPE_LABEL,
  type CiblePerimetreType,
} from '@/lib/api/perimetres';

interface ModalMesPerimetresProps {
  isOpen: boolean;
  onClose: () => void;
  perimetres: AffectationPerimetre[];
}

function iconeCible(t: CiblePerimetreType): JSX.Element {
  if (t === 'STRUCTURE') return <Briefcase className="h-4 w-4" />;
  if (t === 'CR') return <Target className="h-4 w-4" />;
  return <Grid3x3 className="h-4 w-4" />;
}

export function ModalMesPerimetres({
  isOpen,
  onClose,
  perimetres,
}: ModalMesPerimetresProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-lg">
        <DialogHeader>
          <DialogTitle>Mes périmètres budgétaires</DialogTitle>
          <DialogDescription>
            {perimetres.length} affectation{perimetres.length > 1 ? 's' : ''}{' '}
            active{perimetres.length > 1 ? 's' : ''} aujourd'hui.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" data-testid="modal-mes-perimetres-liste">
          {perimetres.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-md border border-(--border) p-3 text-sm"
              data-testid={`mes-perimetre-${p.id}`}
            >
              <span
                className="rounded-full bg-(--muted) p-2"
                title={CIBLE_TYPE_LABEL[p.cibleType]}
              >
                {iconeCible(p.cibleType)}
              </span>
              <div className="flex-1">
                <p className="font-medium">{CIBLE_TYPE_LABEL[p.cibleType]}</p>
                <p className="text-xs text-(--muted-foreground) mt-0.5">
                  {p.cibleType === 'CR_SET'
                    ? `${p.cibleCrIds?.length ?? 0} CR`
                    : `id ${p.cibleId ?? '?'}`}{' '}
                  · {p.dateDebut} → {p.dateFin ?? '∞'} · {p.origine}
                </p>
                {p.motif && (
                  <p className="text-[11px] mt-1 italic">{p.motif}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
