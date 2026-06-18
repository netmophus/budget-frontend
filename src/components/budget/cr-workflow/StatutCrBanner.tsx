/**
 * StatutCrBanner — bandeau de statut de validation du CR courant sur
 * l'écran de saisie. Affiche le badge + un message contextuel (dates,
 * verrouillage) et, le cas échéant, le motif de rejet / réouverture.
 */
import { CheckCircle2, Lock, PencilLine } from 'lucide-react';

import type { CrStatut } from '@/lib/api/cr-workflow';
import { StatutCrBadge } from './StatutCrBadge';

interface StatutCrBannerProps {
  statut: CrStatut;
}

function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function StatutCrBanner({ statut }: StatutCrBannerProps): JSX.Element {
  const Icon =
    statut.statut === 'VALIDE'
      ? CheckCircle2
      : statut.statut === 'SOUMIS'
        ? Lock
        : PencilLine;

  const message =
    statut.statut === 'EN_SAISIE'
      ? 'Vous pouvez saisir et modifier les lignes de ce CR.'
      : statut.statut === 'SOUMIS'
        ? `Saisie verrouillée — soumise au validateur le ${formatDateFr(
            statut.dateSoumission,
          )}.`
        : `Validé le ${formatDateFr(statut.dateValidation)} — saisie en lecture seule.`;

  return (
    <div className="mb-4 space-y-2" data-testid="statut-cr-banner">
      <div className="flex items-center gap-3 rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
        <Icon className="w-4 h-4 shrink-0 text-(--muted-foreground)" />
        <div className="flex items-center gap-2 flex-wrap">
          <StatutCrBadge statut={statut.statut} />
          <span className="text-sm text-(--muted-foreground)">{message}</span>
        </div>
      </div>

      {statut.motifRejet && (
        <div
          className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900"
          data-testid="statut-cr-motif-rejet"
        >
          <strong>Motif de rejet :</strong> {statut.motifRejet}
        </div>
      )}

      {statut.motifReouverture && (
        <div
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900"
          data-testid="statut-cr-motif-reouverture"
        >
          <strong>Motif de réouverture :</strong> {statut.motifReouverture}
        </div>
      )}
    </div>
  );
}
