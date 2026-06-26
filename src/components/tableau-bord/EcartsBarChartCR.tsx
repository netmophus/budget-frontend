/**
 * EcartsBarChartCR (PR2) — Budget vs Réalisé agrégé par CR (top 10 par
 * écart absolu). Clic sur une barre → drill-down CR.
 */
import { useMemo } from 'react';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsBarChartDimension } from './EcartsBarChartDimension';
import { aggregerParCR } from './EcartsBarChartDimension.utils';

interface Props {
  lignes: LigneEcart[];
  onSelectCr: (codeCr: string) => void;
}

export function EcartsBarChartCR({ lignes, onSelectCr }: Props): JSX.Element {
  const data = useMemo(() => aggregerParCR(lignes), [lignes]);
  return (
    <EcartsBarChartDimension
      titre="Budget vs Réalisé par CR"
      sousTitre="Top 10 centres par écart absolu"
      data={data}
      testid="graph-barres-cr"
      onSelect={onSelectCr}
    />
  );
}
