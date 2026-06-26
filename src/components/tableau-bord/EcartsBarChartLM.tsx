/**
 * EcartsBarChartLM (PR2) — Budget vs Réalisé agrégé par ligne métier
 * (top 10 par écart absolu). Clic sur une barre → drill-down LM.
 */
import { useMemo } from 'react';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import { EcartsBarChartDimension } from './EcartsBarChartDimension';
import { aggregerParLigneMetier } from './EcartsBarChartDimension.utils';

interface Props {
  lignes: LigneEcart[];
  onSelectLm: (codeLigneMetier: string) => void;
}

export function EcartsBarChartLM({ lignes, onSelectLm }: Props): JSX.Element {
  const data = useMemo(() => aggregerParLigneMetier(lignes), [lignes]);
  return (
    <EcartsBarChartDimension
      titre="Budget vs Réalisé par ligne métier"
      sousTitre="Top 10 lignes métier par écart absolu"
      data={data}
      testid="graph-barres-lm"
      onSelect={onSelectLm}
    />
  );
}
