/**
 * BlocDetailCrImpression — bloc imprimable d'un CR : informations
 * d'en-tête (acteurs, statut), tableau pivot compte × ligne métier, et
 * synthèse Produits / Charges / PNB. Réutilisé tel quel par les vues
 * périmètre (7.2) et Comité (7.3) — une instance par CR.
 */
import type { CrStatutLigne } from '@/lib/api/cr-workflow';
import {
  synthesePnbDepuisPivot,
  type PivotCr,
} from '@/features/budget/lib/agregation-cr';
import { libelleStatutCr } from '@/lib/labels/budget';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function dateFr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

interface BlocDetailCrImpressionProps {
  cr: CrStatutLigne;
  pivot: PivotCr;
}

export function BlocDetailCrImpression({
  cr,
  pivot,
}: BlocDetailCrImpressionProps): JSX.Element {
  const synthese = synthesePnbDepuisPivot(pivot);

  return (
    <section className="impression-bloc-cr mb-6">
      {/* En-tête CR */}
      <div className="mb-2">
        <h2 className="text-base font-semibold">
          <span className="font-mono">{cr.crCode}</span> — {cr.libelle}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-[11px] text-(--muted-foreground) mt-1">
          <div>
            Saisisseur :{' '}
            <span className="text-(--foreground)">
              {cr.saisisseurEmail ?? '—'}
            </span>
          </div>
          <div>
            Validateur :{' '}
            <span className="text-(--foreground)">
              {cr.validateurEmail ?? '—'}
            </span>
          </div>
          <div>
            Statut :{' '}
            <span className="text-(--foreground)">
              {libelleStatutCr(cr.statut)}
            </span>
          </div>
          <div>
            Validé le :{' '}
            <span className="text-(--foreground)">
              {dateFr(cr.dateValidation)}
            </span>
          </div>
        </div>
      </div>

      {/* Tableau pivot compte × LM */}
      <div className="rounded-md border border-(--border) overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-(--secondary)">
            <tr>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Compte
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Libellé
              </th>
              {pivot.lignesMetier.map((lm) => (
                <th
                  key={lm.code}
                  className="text-right px-2 py-1 border-b border-(--border) whitespace-nowrap"
                  title={lm.libelle}
                >
                  {lm.code}
                </th>
              ))}
              <th className="text-right px-2 py-1 border-b border-(--border) font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {pivot.lignes.map((l) => (
              <tr key={l.compteCode} className="border-b border-(--border)">
                <td className="px-2 py-1 font-mono">{l.compteCode}</td>
                <td className="px-2 py-1 max-w-[220px] truncate">
                  {l.compteLibelle}
                </td>
                {pivot.lignesMetier.map((lm) => {
                  const v = l.montants[lm.code];
                  return (
                    <td
                      key={lm.code}
                      className="px-2 py-1 text-right tabular-nums"
                    >
                      {v === undefined ? '—' : FMT.format(v)}
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right tabular-nums font-medium">
                  {FMT.format(l.totalLigne)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-(--secondary)/50 font-semibold">
              <td className="px-2 py-1" colSpan={2}>
                Totaux
              </td>
              {pivot.lignesMetier.map((lm) => (
                <td
                  key={lm.code}
                  className="px-2 py-1 text-right tabular-nums"
                >
                  {FMT.format(pivot.totauxParLm[lm.code] ?? 0)}
                </td>
              ))}
              <td className="px-2 py-1 text-right tabular-nums">
                {FMT.format(pivot.totalGeneral)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Synthèse Produits / Charges / PNB */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        <div className="rounded-md border border-(--border) px-3 py-1.5">
          Produits (cl.7) :{' '}
          <strong className="tabular-nums">{FMT.format(synthese.produits)}</strong>
        </div>
        <div className="rounded-md border border-(--border) px-3 py-1.5">
          Charges (cl.6) :{' '}
          <strong className="tabular-nums">{FMT.format(synthese.charges)}</strong>
        </div>
        <div className="rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-1.5">
          PNB :{' '}
          <strong className="tabular-nums">{FMT.format(synthese.pnb)}</strong>
        </div>
      </div>
    </section>
  );
}
