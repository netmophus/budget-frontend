/**
 * Dialogue de validation en lot (Lot 5.1.B). Présente le récap
 * des lignes sélectionnées (statut=IMPORTE) et déclenche
 * POST /realise/valider en cas de confirmation.
 */
import { AxiosError } from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type FaitRealise } from '@/lib/api/realise';
import { useRealiseStore } from '@/lib/stores/realise-store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lignesSelectionnees: FaitRealise[];
  /**
   * Cache des comptes hydratés par RealiseSaisiePage. Permet
   * d'afficher `code — libellé` dans le récap au lieu de `#id`.
   * Optionnel : si absent, fallback sur l'id technique.
   */
  comptes?: Record<string, { code: string; libelle: string }>;
}

const MAX_LIBELLE_RECAP = 30;
const MAX_TOP_COMPTES = 5;

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    return Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function ValiderLignesRealiseDialog({
  isOpen,
  onClose,
  lignesSelectionnees,
  comptes,
}: Props): JSX.Element {
  const validerSelection = useRealiseStore((s) => s.validerSelection);
  const [submitting, setSubmitting] = useState(false);

  const importes = lignesSelectionnees.filter((l) => l.statut === 'IMPORTE');
  const dejaValides = lignesSelectionnees.length - importes.length;

  // Récap par compte enrichi avec code+libellé (cache CompteCache).
  // Tri alphabétique par code pour stabilité du récap.
  const parCompte = new Map<string, number>();
  for (const l of importes) {
    parCompte.set(l.fkCompte, (parCompte.get(l.fkCompte) ?? 0) + 1);
  }
  const groupes = Array.from(parCompte.entries())
    .map(([fkCompte, nb]) => ({
      fkCompte,
      code: comptes?.[fkCompte]?.code ?? null,
      libelle: comptes?.[fkCompte]?.libelle ?? null,
      nb,
    }))
    .sort((a, b) => (a.code ?? `#${a.fkCompte}`).localeCompare(b.code ?? `#${b.fkCompte}`));
  const top = groupes.slice(0, MAX_TOP_COMPTES);
  const reste = groupes.length - top.length;

  function libelleCompte(g: { code: string | null; libelle: string | null; fkCompte: string }): string {
    if (!g.code) return `Compte #${g.fkCompte}`;
    const lib =
      g.libelle && g.libelle.length > MAX_LIBELLE_RECAP
        ? `${g.libelle.slice(0, MAX_LIBELLE_RECAP)}…`
        : g.libelle ?? '';
    return lib ? `${g.code} — ${lib}` : g.code;
  }

  async function handleConfirmer(): Promise<void> {
    setSubmitting(true);
    try {
      const r = await validerSelection();
      toast.success(`${r.nbValidees} ligne(s) validée(s).`);
      onClose();
    } catch (err) {
      toast.error(`Validation refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider la sélection</DialogTitle>
          <DialogDescription>
            Action irréversible — les lignes validées ne seront plus
            modifiables ni supprimables. Pour corriger, il faudra créer
            de nouvelles lignes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="rounded-md border border-(--border) p-3 text-sm space-y-2"
            data-testid="valid-recap"
          >
            <div>
              <strong data-testid="valid-count">{importes.length}</strong>{' '}
              ligne(s) seront validées.
              {dejaValides > 0 && (
                <span className="text-(--muted-foreground)">
                  {' '}
                  ({dejaValides} déjà validée(s) — ignorée(s))
                </span>
              )}
            </div>
            {top.length > 0 && (
              <div>
                <div className="text-xs text-(--muted-foreground) mt-2">
                  Récap par compte (top {MAX_TOP_COMPTES}) :
                </div>
                <ul className="text-xs" data-testid="valid-recap-comptes">
                  {top.map((g) => (
                    <li key={g.fkCompte}>
                      • {libelleCompte(g)} : {g.nb} ligne(s)
                    </li>
                  ))}
                  {reste > 0 && (
                    <li
                      className="text-(--muted-foreground)"
                      data-testid="valid-recap-reste"
                    >
                      … et {reste} autre(s)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmer}
            disabled={importes.length === 0 || submitting}
            data-testid="btn-confirmer-validation"
          >
            {submitting
              ? 'Validation…'
              : `Valider ${importes.length} ligne(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
