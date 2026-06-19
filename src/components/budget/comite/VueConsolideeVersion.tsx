/**
 * VueConsolideeVersion — tableau de bord consolidé PNB/RN/CE/CR/Zinder
 * d'une version vs cibles D2 (écran Comité Budget, palier 6).
 *
 * Réutilise la logique d'évaluation du palier 5 (`cibles-d2.ts`). Seul le
 * PNB est consolidé côté frontend (somme des PNB par CR) ; les autres
 * indicateurs ne sont pas encore consolidables → « — » (jamais inventé,
 * cf. backlog consolidation RN/CE/CR/Zinder).
 */
import {
  CIBLES_D2,
  CLASSE_STATUT_CIBLE,
  evaluerCible,
  formatValeurCible,
  valeurReelleConsolidee,
} from '@/lib/config/cibles-d2';

interface VueConsolideeVersionProps {
  /** PNB consolidé réel (somme des PNB par CR du snapshot). */
  pnbConsolide: number;
}

export function VueConsolideeVersion({
  pnbConsolide,
}: VueConsolideeVersionProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-(--border) overflow-hidden">
        <table className="w-full text-sm" data-testid="comite-consolide">
          <thead className="bg-(--secondary) text-xs text-(--muted-foreground)">
            <tr>
              <th className="text-left px-3 py-2">Indicateur</th>
              <th className="text-right px-3 py-2">Réel consolidé</th>
              <th className="text-right px-3 py-2">Cible D2</th>
              <th className="text-right px-3 py-2">Écart</th>
            </tr>
          </thead>
          <tbody>
            {CIBLES_D2.map((c) => {
              const reel = valeurReelleConsolidee(c.cle, pnbConsolide);
              const { ecartPct, statut } = evaluerCible(c, reel);
              return (
                <tr
                  key={c.cle}
                  className="border-t border-(--border)"
                  data-testid={`comite-indicateur-${c.cle}`}
                >
                  <td className="px-3 py-2">{c.libelle}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {reel === null ? '—' : formatValeurCible(reel, c.unite)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-(--muted-foreground)">
                    {c.sens === 'min' ? '≥ ' : '≤ '}
                    {formatValeurCible(c.valeur, c.unite)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-medium ${CLASSE_STATUT_CIBLE[statut]}`}
                  >
                    {ecartPct === null
                      ? '—'
                      : `${ecartPct > 0 ? '+' : ''}${ecartPct.toFixed(1)} %`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-(--muted-foreground)">
        Seul le PNB est consolidé à ce jour. RN / CE / CR / Zinder : cibles de
        référence (consolidation détaillée à venir — backlog).
      </p>
    </div>
  );
}
