/**
 * DetailCrModal — détail des lignes budgétaires d'un CR validé
 * (lecture seule, écran Comité Budget). Agrège les faits budget du CR
 * par couple (compte PCB × ligne métier) avec total annuel.
 *
 * L'impression est différée au palier 7 (bouton volontairement absent).
 */
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listFaitsBudget } from '@/lib/api/budget';
import type { CrStatutLigne } from '@/lib/api/cr-workflow';
import {
  agregerFaitsParCompteLigneMetier,
  type CelluleAgregee,
} from '@/features/budget/lib/agregation-cr';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface DetailCrModalProps {
  versionId: string | null;
  /** CR ciblé (null = fermé). */
  cr: CrStatutLigne | null;
  onClose: () => void;
}

export function DetailCrModal({
  versionId,
  cr,
  onClose,
}: DetailCrModalProps): JSX.Element | null {
  const [lignes, setLignes] = useState<CelluleAgregee[]>([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId || !cr) return;
    setLoading(true);
    setErreur(null);
    listFaitsBudget({ fkVersion: versionId, fkCentre: cr.crId, limit: 200 })
      .then((res) => {
        // Vue plate : 1 ligne par couple (compte × LM), via la primitive
        // partagée avec l'impression (palier 7).
        setLignes(agregerFaitsParCompteLigneMetier(res.items).cellules);
      })
      .catch(() => setErreur('Impossible de charger le détail du CR.'))
      .finally(() => setLoading(false));
  }, [versionId, cr]);

  if (!cr) return null;

  const total = lignes.reduce((s, l) => s + l.montant, 0);

  return (
    <Dialog open={cr !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Détail du CR <span className="font-mono">{cr.crCode}</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              {cr.libelle} — lignes budgétaires (compte × ligne métier).
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="p-6 text-center text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {erreur && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            {erreur}
          </div>
        )}
        {!loading && !erreur && lignes.length === 0 && (
          <div
            className="rounded-md border border-dashed border-(--border) p-6 text-center text-sm text-(--muted-foreground)"
            data-testid="comite-detail-vide"
          >
            Aucune ligne budgétaire pour ce CR.
          </div>
        )}
        {!loading && !erreur && lignes.length > 0 && (
          <div className="max-h-[55vh] overflow-y-auto rounded-md border border-(--border)">
            <table className="w-full text-sm" data-testid="comite-detail-table">
              <thead className="sticky top-0 bg-(--secondary) text-xs text-(--muted-foreground)">
                <tr>
                  <th className="text-left px-3 py-1.5">Compte</th>
                  <th className="text-left px-3 py-1.5">Libellé</th>
                  <th className="text-left px-3 py-1.5">Ligne métier</th>
                  <th className="text-right px-3 py-1.5">Montant annuel</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr
                    key={`${l.compteCode}|${l.lmCode}`}
                    className="border-t border-(--border)"
                    data-testid="comite-detail-row"
                  >
                    <td className="px-3 py-1.5 font-mono">{l.compteCode}</td>
                    <td className="px-3 py-1.5 max-w-[220px] truncate">
                      {l.compteLibelle}
                    </td>
                    <td className="px-3 py-1.5 text-(--muted-foreground)">
                      {l.lmCode}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {FMT.format(l.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-(--border) bg-(--secondary)/50 font-medium">
                  <td className="px-3 py-1.5" colSpan={3}>
                    Total ({lignes.length} lignes)
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {FMT.format(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="text-[11px] text-(--muted-foreground)">
          🖨 Impression du détail : disponible au palier suivant.
        </p>
      </DialogContent>
    </Dialog>
  );
}
