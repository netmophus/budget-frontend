/**
 * TableauConsolideD2Impression — version imprimable de la consolidation
 * PNB/RN/CE/CR/Zinder vs cibles D2 (palier 7.3). Même logique d'évaluation
 * que VueConsolideeVersion (écran Comité), réutilisée via `cibles-d2.ts`.
 * Seul le PNB est consolidé ; RN/CE/CR/Zinder → « — » (jamais inventé).
 */
import {
  CIBLES_D2,
  CLASSE_STATUT_CIBLE,
  evaluerCible,
  formatValeurCible,
  valeurReelleConsolidee,
} from '@/lib/config/cibles-d2';

interface TableauConsolideD2ImpressionProps {
  pnbConsolide: number;
}

export function TableauConsolideD2Impression({
  pnbConsolide,
}: TableauConsolideD2ImpressionProps): JSX.Element {
  return (
    <div className="rounded-md border border-(--border) overflow-hidden">
      <table className="w-full text-[11px] border-collapse" data-testid="impression-consolide">
        <thead className="bg-(--secondary)">
          <tr>
            <th className="text-left px-2 py-1 border-b border-(--border)">
              Indicateur
            </th>
            <th className="text-right px-2 py-1 border-b border-(--border)">
              Réel consolidé
            </th>
            <th className="text-right px-2 py-1 border-b border-(--border)">
              Cible D2
            </th>
            <th className="text-right px-2 py-1 border-b border-(--border)">
              Écart
            </th>
          </tr>
        </thead>
        <tbody>
          {CIBLES_D2.map((c) => {
            const reel = valeurReelleConsolidee(c.cle, pnbConsolide);
            const { ecartPct, statut } = evaluerCible(c, reel);
            return (
              <tr key={c.cle} className="border-b border-(--border)">
                <td className="px-2 py-1">{c.libelle}</td>
                <td className="px-2 py-1 text-right tabular-nums font-medium">
                  {reel === null ? '—' : formatValeurCible(reel, c.unite)}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-(--muted-foreground)">
                  {c.sens === 'min' ? '≥ ' : '≤ '}
                  {formatValeurCible(c.valeur, c.unite)}
                </td>
                <td
                  className={`px-2 py-1 text-right tabular-nums font-medium ${CLASSE_STATUT_CIBLE[statut]}`}
                >
                  {ecartPct === null
                    ? '—'
                    : `${ecartPct > 0 ? '▲ +' : '▼ '}${ecartPct.toFixed(1)} %`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
