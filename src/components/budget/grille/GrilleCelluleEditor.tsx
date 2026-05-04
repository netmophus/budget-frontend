/**
 * GrilleCelluleEditor (Lot 3.4) — édition d'une cellule (1 mois) de
 * la grille de saisie.
 *
 * Mode `MONTANT` : input texte simple avec format français.
 * Mode `ENCOURS_TIE` : bouton qui ouvre un popover (Dialog) avec
 * `encoursMoyen` et `tie`, montant calculé en temps réel
 * (`encours × tie / 12`).
 *
 * Format affichage : `Intl.NumberFormat('fr-FR')`. Format input :
 * parser indulgent (accepte `.` ou `,` comme séparateur décimal,
 * trim spaces). Validation TIE > 1 → hint « probablement saisi en
 * pourcentage au lieu de décimal ».
 */
import { Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GrilleCellule, ModeSaisie } from '@/lib/api/budget-grille';

const FORMATTER_FR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FORMATTER_TIE_AFFICHAGE = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function parseMontantFr(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/\s| /g, '') // espaces (incl. insécable)
    .replace(',', '.');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface GrilleCelluleEditorProps {
  /** Cellule courante (origine ou modifiée). */
  cellule: GrilleCellule;
  /** Mode de la ligne (peut différer de cellule.modeSaisie pour les nouvelles cellules). */
  modeLigne: ModeSaisie;
  /** Compte porteur d'intérêts (autorise ENCOURS_TIE). */
  estPorteurInterets: boolean;
  /** Cellule modifiée (différente de l'original). */
  isModified: boolean;
  /** Lecture seule (version verrouillée OU pas la permission). */
  readOnly: boolean;
  /** Callback de modification (delta partiel). */
  onChange: (update: Partial<GrilleCellule>) => void;
}

export function GrilleCelluleEditor({
  cellule,
  modeLigne,
  estPorteurInterets,
  isModified,
  readOnly,
  onChange,
}: GrilleCelluleEditorProps) {
  // Mode MONTANT : input direct
  if (modeLigne === 'MONTANT' || !estPorteurInterets) {
    return (
      <CelluleMontantInput
        valeur={cellule.montant}
        isModified={isModified}
        readOnly={readOnly}
        onCommit={(montant) => onChange({ montant, modeSaisie: 'MONTANT' })}
      />
    );
  }
  // Mode ENCOURS_TIE : bouton + popover
  return (
    <CelluleEncoursTie
      cellule={cellule}
      isModified={isModified}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
}

// ─── Mode MONTANT ─────────────────────────────────────────────────

interface CelluleMontantInputProps {
  valeur: number;
  isModified: boolean;
  readOnly: boolean;
  onCommit: (montant: number) => void;
}

function CelluleMontantInput({
  valeur,
  isModified,
  readOnly,
  onCommit,
}: CelluleMontantInputProps) {
  const [draft, setDraft] = useState(
    valeur === 0 ? '' : FORMATTER_FR.format(valeur),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(valeur === 0 ? '' : FORMATTER_FR.format(valeur));
  }, [valeur]);

  function handleBlur() {
    if (draft.trim() === '') {
      if (valeur !== 0) onCommit(0);
      setDraft('');
      return;
    }
    const n = parseMontantFr(draft);
    if (n === null) {
      // Saisie invalide : revert à la valeur courante
      setDraft(valeur === 0 ? '' : FORMATTER_FR.format(valeur));
      return;
    }
    if (n !== valeur) onCommit(n);
    setDraft(n === 0 ? '' : FORMATTER_FR.format(n));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setDraft(valeur === 0 ? '' : FORMATTER_FR.format(valeur));
      inputRef.current?.blur();
      e.preventDefault();
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={readOnly}
      className={
        'w-full px-1.5 py-1 text-right font-mono text-sm border rounded ' +
        'focus:outline-none focus:ring-1 focus:ring-(--ring) disabled:bg-(--muted) disabled:cursor-not-allowed ' +
        (isModified
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
          : 'border-(--border) bg-transparent')
      }
      placeholder={readOnly ? '' : '—'}
    />
  );
}

// ─── Mode ENCOURS_TIE ─────────────────────────────────────────────

interface CelluleEncoursTieProps {
  cellule: GrilleCellule;
  isModified: boolean;
  readOnly: boolean;
  onChange: (update: Partial<GrilleCellule>) => void;
}

function CelluleEncoursTie({
  cellule,
  isModified,
  readOnly,
  onChange,
}: CelluleEncoursTieProps) {
  const [open, setOpen] = useState(false);
  const [encoursDraft, setEncoursDraft] = useState(
    cellule.encoursMoyen === null
      ? ''
      : FORMATTER_FR.format(cellule.encoursMoyen),
  );
  const [tieDraft, setTieDraft] = useState(
    cellule.tie === null
      ? ''
      : FORMATTER_TIE_AFFICHAGE.format(cellule.tie),
  );

  useEffect(() => {
    setEncoursDraft(
      cellule.encoursMoyen === null
        ? ''
        : FORMATTER_FR.format(cellule.encoursMoyen),
    );
    setTieDraft(
      cellule.tie === null
        ? ''
        : FORMATTER_TIE_AFFICHAGE.format(cellule.tie),
    );
  }, [cellule.encoursMoyen, cellule.tie]);

  const encoursParse = parseMontantFr(encoursDraft);
  const tieParse = parseMontantFr(tieDraft);
  const tieAlerte = tieParse !== null && tieParse > 1;
  const montantCalcule =
    encoursParse !== null && tieParse !== null && tieParse <= 1
      ? Math.round((encoursParse * tieParse * 10000) / 12) / 10000
      : null;

  function handleSubmit() {
    if (encoursParse === null || tieParse === null) return;
    if (tieAlerte) return;
    onChange({
      modeSaisie: 'ENCOURS_TIE',
      encoursMoyen: encoursParse,
      tie: tieParse,
      montant: montantCalcule ?? 0,
    });
    setOpen(false);
  }

  function handleEffacer() {
    onChange({
      modeSaisie: 'ENCOURS_TIE',
      encoursMoyen: null,
      tie: null,
      montant: 0,
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !readOnly && setOpen(true)}
        disabled={readOnly}
        className={
          'w-full px-1.5 py-1 text-right font-mono text-sm border rounded ' +
          'inline-flex items-center justify-end gap-1 ' +
          'hover:bg-(--accent)/30 disabled:cursor-not-allowed ' +
          (isModified
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
            : 'border-(--border) bg-transparent')
        }
        title={
          cellule.encoursMoyen !== null && cellule.tie !== null
            ? `Encours: ${FORMATTER_FR.format(cellule.encoursMoyen)} | TIE: ${FORMATTER_TIE_AFFICHAGE.format(cellule.tie)}`
            : 'Mode ENCOURS_TIE — cliquer pour saisir'
        }
      >
        <span>{cellule.montant === 0 ? '—' : FORMATTER_FR.format(cellule.montant)}</span>
        <Info className="h-3 w-3 text-(--primary) shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mode Encours × TIE</DialogTitle>
            <DialogDescription>
              Mois : <strong>{cellule.mois}</strong>. Saisissez l'encours
              moyen mensuel et le TIE annuel — le montant est calculé
              automatiquement (encours × tie / 12).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="encours-input">Encours moyen mensuel (FCFA)</Label>
              <Input
                id="encours-input"
                value={encoursDraft}
                onChange={(e) => setEncoursDraft(e.target.value)}
                placeholder="ex. 896 000 000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tie-input">TIE annuel (décimal, 0 à 1)</Label>
              <Input
                id="tie-input"
                value={tieDraft}
                onChange={(e) => setTieDraft(e.target.value)}
                placeholder="ex. 0,0850 pour 8,50%"
                inputMode="decimal"
              />
              {tieAlerte && (
                <p className="text-xs text-orange-600">
                  ⚠ TIE supérieur à 1. Vous avez peut-être saisi en
                  pourcentage. Pour 8,5% saisissez{' '}
                  <code className="font-mono">0,085</code>.
                </p>
              )}
            </div>
            <div className="rounded-md border border-(--border) bg-(--muted)/30 p-3 text-sm space-y-1">
              <div className="text-(--muted-foreground) text-xs">
                Montant calculé (encours × tie / 12) :
              </div>
              <div className="text-lg font-bold">
                {montantCalcule !== null
                  ? `${FORMATTER_FR.format(montantCalcule)} FCFA / mois`
                  : '—'}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" /> Annuler
            </Button>
            <Button variant="destructive" onClick={handleEffacer}>
              Effacer
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                encoursParse === null || tieParse === null || tieAlerte
              }
            >
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
