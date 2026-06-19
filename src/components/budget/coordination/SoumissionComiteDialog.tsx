/**
 * SoumissionComiteDialog — confirmation de la soumission d'une version
 * pré-validée au Comité budgétaire (action Coordinateur, irréversible).
 *
 * Récap consolidé + comparaison aux cibles D2. Seul le PNB consolidé est
 * réellement calculé côté frontend (somme des PNB par CR) ; RN / CE / CR
 * / Zinder sont affichés comme cibles de référence (réel non encore
 * consolidé — cf. backlog `cibles-d2.ts`).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CIBLES_D2, ECART_ALERTE_PCT, type CibleD2 } from '@/lib/config/cibles-d2';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const COMMENT_MAX = 250;

interface SoumissionComiteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (commentaire?: string) => void | Promise<void>;
  /** PNB consolidé réel (somme des PNB par CR du snapshot). */
  pnbConsolide: number;
  submitting: boolean;
}

function valeurReelle(cle: CibleD2['cle'], pnb: number): number | null {
  return cle === 'pnb' ? pnb : null;
}

function evaluer(
  c: CibleD2,
  reel: number | null,
): { ecartPct: number | null; statut: 'atteint' | 'attention' | 'alerte' | 'na' } {
  if (reel === null || !c.disponible) return { ecartPct: null, statut: 'na' };
  const ecartPct = ((reel - c.valeur) / c.valeur) * 100;
  const atteint = c.sens === 'min' ? reel >= c.valeur : reel <= c.valeur;
  if (atteint) return { ecartPct, statut: 'atteint' };
  return {
    ecartPct,
    statut: Math.abs(ecartPct) > ECART_ALERTE_PCT ? 'alerte' : 'attention',
  };
}

function fmtValeur(v: number, unite: CibleD2['unite']): string {
  return unite === '%' ? `${v} %` : FMT.format(v);
}

const STATUT_CLASSE: Record<string, string> = {
  atteint: 'text-green-700',
  attention: 'text-amber-600',
  alerte: 'text-red-600',
  na: 'text-(--muted-foreground)',
};

export function SoumissionComiteDialog({
  isOpen,
  onClose,
  onConfirm,
  pnbConsolide,
  submitting,
}: SoumissionComiteDialogProps): JSX.Element {
  const [commentaire, setCommentaire] = useState('');

  async function handleConfirm(): Promise<void> {
    try {
      await onConfirm(commentaire.trim() || undefined);
      setCommentaire('');
    } catch {
      // toast géré par le caller.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Soumettre la version au Comité budgétaire</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              Récapitulatif consolidé vs cibles D2.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-(--border) overflow-hidden">
            <table className="w-full text-sm" data-testid="comite-recap">
              <thead className="bg-(--secondary) text-xs text-(--muted-foreground)">
                <tr>
                  <th className="text-left px-3 py-1.5">Indicateur</th>
                  <th className="text-right px-3 py-1.5">Réel</th>
                  <th className="text-right px-3 py-1.5">Cible D2</th>
                  <th className="text-right px-3 py-1.5">Écart</th>
                </tr>
              </thead>
              <tbody>
                {CIBLES_D2.map((c) => {
                  const reel = valeurReelle(c.cle, pnbConsolide);
                  const { ecartPct, statut } = evaluer(c, reel);
                  return (
                    <tr
                      key={c.cle}
                      className="border-t border-(--border)"
                      data-testid={`comite-cible-${c.cle}`}
                    >
                      <td className="px-3 py-1.5">{c.libelle}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {reel === null ? '—' : fmtValeur(reel, c.unite)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-(--muted-foreground)">
                        {c.sens === 'min' ? '≥ ' : '≤ '}
                        {fmtValeur(c.valeur, c.unite)}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums font-medium ${STATUT_CLASSE[statut]}`}
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
            Seul le PNB est consolidé ici. RN / CE / CR / Zinder : cibles de
            référence (consolidation détaillée à venir).
          </p>

          <div>
            <Label htmlFor="comite-commentaire" className="text-xs mb-1 block">
              Commentaire (optionnel)
            </Label>
            <textarea
              id="comite-commentaire"
              data-testid="comite-commentaire"
              value={commentaire}
              onChange={(e) =>
                setCommentaire(e.target.value.slice(0, COMMENT_MAX))
              }
              rows={2}
              maxLength={COMMENT_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Note pour le Comité…"
            />
          </div>

          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
            ⚠ <strong>Action irréversible.</strong> La version passera en «&nbsp;Soumis
            au Comité&nbsp;» et les arbitrages du Comité Budget commenceront.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="comite-confirmer"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
            {submitting ? 'Soumission…' : 'Confirmer la soumission au Comité'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
