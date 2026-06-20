/**
 * TableauRecapCrsImpression — tableau récapitulatif d'une liste de CR
 * pour les documents d'impression (palier 7). Colonnes : Code · Libellé
 * · Saisisseur · Statut · PNB · Date soumission · Date validation.
 * Pied : compteurs par statut + PNB consolidé. Réutilisé par la vue
 * périmètre (7.2) et la vue Comité (7.3).
 */
import type { CrStatutLigne } from '@/lib/api/cr-workflow';
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

interface TableauRecapCrsImpressionProps {
  crs: CrStatutLigne[];
}

export function TableauRecapCrsImpression({
  crs,
}: TableauRecapCrsImpressionProps): JSX.Element {
  const nbValides = crs.filter((c) => c.statut === 'VALIDE').length;
  const nbSoumis = crs.filter((c) => c.statut === 'SOUMIS').length;
  const nbEnSaisie = crs.filter((c) => c.statut === 'EN_SAISIE').length;
  const pnbConsolide = crs.reduce((s, c) => s + c.pnb, 0);

  return (
    <div>
      <div className="rounded-md border border-(--border) overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-(--secondary)">
            <tr>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Code CR
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Libellé
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Saisisseur
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Statut
              </th>
              <th className="text-right px-2 py-1 border-b border-(--border)">
                PNB
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Soumis le
              </th>
              <th className="text-left px-2 py-1 border-b border-(--border)">
                Validé le
              </th>
            </tr>
          </thead>
          <tbody>
            {crs.map((c) => (
              <tr key={c.crId} className="border-b border-(--border)">
                <td className="px-2 py-1 font-mono">{c.crCode}</td>
                <td className="px-2 py-1 max-w-[200px] truncate">
                  {c.libelle}
                </td>
                <td className="px-2 py-1 text-(--muted-foreground)">
                  {c.saisisseurEmail ?? '—'}
                </td>
                <td className="px-2 py-1">{libelleStatutCr(c.statut)}</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {FMT.format(c.pnb)}
                </td>
                <td className="px-2 py-1 tabular-nums">
                  {dateFr(c.dateSoumission)}
                </td>
                <td className="px-2 py-1 tabular-nums">
                  {dateFr(c.dateValidation)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-(--secondary)/50 font-semibold">
              <td className="px-2 py-1" colSpan={4}>
                {crs.length} CR — {nbValides} validé(s) · {nbSoumis} soumis ·{' '}
                {nbEnSaisie} en saisie
              </td>
              <td className="px-2 py-1 text-right tabular-nums">
                {FMT.format(pnbConsolide)}
              </td>
              <td className="px-2 py-1" colSpan={2}>
                PNB consolidé
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
