/**
 * StatutCrBadge — badge coloré du statut de validation d'un CR.
 * EN_SAISIE (gris) · SOUMIS (orange) · VALIDE (vert).
 */
import { Badge } from '@/components/ui/badge';
import type { StatutCr } from '@/lib/api/cr-workflow';
import { badgeClassStatutCr, libelleStatutCr } from '@/lib/labels/budget';

interface StatutCrBadgeProps {
  statut: StatutCr;
  className?: string;
}

export function StatutCrBadge({
  statut,
  className,
}: StatutCrBadgeProps): JSX.Element {
  return (
    <Badge
      data-testid="statut-cr-badge"
      data-statut={statut}
      className={`${badgeClassStatutCr(statut)} ${className ?? ''}`}
    >
      {libelleStatutCr(statut)}
    </Badge>
  );
}
