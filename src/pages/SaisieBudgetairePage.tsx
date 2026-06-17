/**
 * SaisieBudgetairePage — page de saisie budgétaire (saisie focalisée
 * compte par compte). Seul écran de saisie depuis le retrait de
 * l'ancienne grille 12 mois (legacy).
 *
 *  - on sélectionne UN compte via autocomplétion (CompteCombobox,
 *    sans restriction parents/feuilles — politique BSIC) ;
 *  - on saisit un montant ANNUEL réparti automatiquement /12
 *    (reliquat d'arrondi sur décembre) OU 12 montants MENSUELS
 *    distincts (saisonnalité) ;
 *  - une justification optionnelle (≤250 car.) est répliquée dans le
 *    `commentaire` des 12 cellules ;
 *  - la sauvegarde n'envoie QUE la ligne du compte courant
 *    (POST /budget/grille — upsert par cellule, n'efface pas les
 *    autres lignes du CR) ;
 *  - un import en masse CSV/XLSX (ImportBudgetDialog, template 9
 *    colonnes) est accessible depuis l'en-tête.
 *
 * Le formulaire est piloté par le COMPTE sélectionné (et l'exercice),
 * pas par la grille : il s'affiche pour n'importe quel compte. La
 * grille n'est chargée qu'en best-effort pour pré-remplir les valeurs
 * déjà saisies. Grain mensuel en base : aucun changement de schéma.
 */
import { FileUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CompteCombobox } from '@/components/budget/CompteCombobox';
import { ImportBudgetDialog } from '@/components/budget/ImportBudgetDialog';
import { SelecteurContexte } from '@/components/budget/grille/SelecteurContexte';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getGrilleSaisie,
  saveGrilleSaisie,
  type GrilleSaisie,
} from '@/lib/api/budget-grille';
import { type Compte } from '@/lib/api/referentiels';
import { getVersionById } from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';

type ModeSaisieUi = 'annuel' | 'mensuel';
const MODE_STORAGE_KEY = 'miznas-saisie-mode-hybride';
const JUSTIF_MAX = 250;
const MOIS_FR = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
];

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Répartit un montant annuel sur 12 mois, reliquat d'arrondi sur décembre. */
function repartirAnnuel(annuel: number): number[] {
  const base = Math.round((annuel / 12) * 10000) / 10000;
  const mois = Array.from({ length: 12 }, () => base);
  mois[11] = Math.round((annuel - base * 11) * 10000) / 10000;
  return mois;
}

function chargerMode(): ModeSaisieUi {
  const v =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(MODE_STORAGE_KEY)
      : null;
  return v === 'mensuel' ? 'mensuel' : 'annuel';
}

export function SaisieBudgetairePage(): JSX.Element {
  const canSaisir = useHasPermission('BUDGET.SAISIR');
  const { versionId, scenarioId, crId, ligneMetierId, codeClasse } =
    useBudgetGrilleStore();

  const [importOuvert, setImportOuvert] = useState(false);
  const [exerciceFiscal, setExerciceFiscal] = useState<number | null>(null);
  const [statutVersion, setStatutVersion] = useState<string | null>(null);
  const [grille, setGrille] = useState<GrilleSaisie | null>(null);

  const [selectedCompte, setSelectedCompte] = useState<Compte | null>(null);
  const [mode, setMode] = useState<ModeSaisieUi>(chargerMode);
  const [montantAnnuel, setMontantAnnuel] = useState(0);
  const [montants, setMontants] = useState<number[]>(() => Array(12).fill(0));
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmBascule, setConfirmBascule] = useState(false);
  const compteInputRef = useRef<HTMLDivElement>(null);

  // Résout l'exercice fiscal + le statut depuis la version sélectionnée.
  useEffect(() => {
    if (!versionId) {
      setExerciceFiscal(null);
      setStatutVersion(null);
      return;
    }
    let annule = false;
    getVersionById(versionId)
      .then((v) => {
        if (!annule) {
          setExerciceFiscal(v.exerciceFiscal);
          setStatutVersion(v.statut);
        }
      })
      .catch(() => {
        if (!annule) {
          setExerciceFiscal(new Date().getFullYear() + 1);
          setStatutVersion(null);
        }
      });
    return () => {
      annule = true;
    };
  }, [versionId]);

  const contexteComplet =
    !!versionId &&
    !!scenarioId &&
    !!crId &&
    !!ligneMetierId &&
    exerciceFiscal !== null;

  // 12 mois canoniques (YYYY-MM-01) dérivés de l'exercice — indépendant
  // de la grille, pour que le formulaire s'affiche toujours.
  const moisKeys = useMemo(() => {
    if (exerciceFiscal === null) return [];
    return Array.from(
      { length: 12 },
      (_, i) => `${exerciceFiscal}-${String(i + 1).padStart(2, '0')}-01`,
    );
  }, [exerciceFiscal]);

  // Grille (best-effort) : sert UNIQUEMENT à pré-remplir les valeurs
  // déjà saisies des comptes feuilles. Son échec n'empêche pas la saisie.
  function reloadGrille(): void {
    if (!contexteComplet) {
      setGrille(null);
      return;
    }
    getGrilleSaisie({
      versionId: versionId!,
      scenarioId: scenarioId!,
      crId: crId!,
      ligneMetierId: ligneMetierId!,
      exerciceFiscal: exerciceFiscal!,
    })
      .then((g) => setGrille(g))
      .catch(() => setGrille(null));
  }

  useEffect(() => {
    reloadGrille();
    setSelectedCompte(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, scenarioId, crId, ligneMetierId, exerciceFiscal]);

  // À la sélection d'un compte : pré-remplit depuis la grille si la ligne
  // existe (feuille déjà chargée), sinon part de zéro.
  useEffect(() => {
    if (!selectedCompte) return;
    const ligne =
      grille?.lignes.find((l) => l.compte.id === selectedCompte.id) ?? null;
    if (ligne && moisKeys.length === 12) {
      const parMois = new Map(ligne.cellules.map((c) => [c.mois, c]));
      const vals = moisKeys.map((m) => parMois.get(m)?.montant ?? 0);
      setMontants(vals);
      setMontantAnnuel(vals.reduce((s, v) => s + v, 0));
      setJustification(
        ligne.cellules.find((c) => c.commentaire)?.commentaire ?? '',
      );
    } else {
      setMontants(Array(12).fill(0));
      setMontantAnnuel(0);
      setJustification('');
    }
  }, [selectedCompte, grille, moisKeys]);

  const versionVerrouillee =
    statutVersion !== null && statutVersion !== 'ouvert';
  const readOnly = !canSaisir || versionVerrouillee;

  const totalMensuel = useMemo(
    () => montants.reduce((s, v) => s + v, 0),
    [montants],
  );

  function setMode2(next: ModeSaisieUi): void {
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setMode(next);
  }

  function demanderBascule(next: ModeSaisieUi): void {
    if (next === mode) return;
    if (next === 'mensuel') {
      setMontants(repartirAnnuel(montantAnnuel));
      setMode2('mensuel');
      return;
    }
    const uniformes = montants.every((v) => v === montants[0]);
    if (uniformes) {
      setMontantAnnuel(totalMensuel);
      setMode2('annuel');
    } else {
      setConfirmBascule(true);
    }
  }

  function confirmerBasculeAnnuel(): void {
    setMontantAnnuel(totalMensuel);
    setMode2('annuel');
    setConfirmBascule(false);
  }

  function onMontantAnnuelChange(v: string): void {
    const n = Number(v.replace(',', '.'));
    const annuel = Number.isFinite(n) ? n : 0;
    setMontantAnnuel(annuel);
    setMontants(repartirAnnuel(annuel));
  }

  function onMontantMensuelChange(index: number, v: string): void {
    const n = Number(v.replace(',', '.'));
    setMontants((prev) => {
      const next = [...prev];
      next[index] = Number.isFinite(n) ? n : 0;
      return next;
    });
  }

  function reset(): void {
    setSelectedCompte(null);
    setMontants(Array(12).fill(0));
    setMontantAnnuel(0);
    setJustification('');
  }

  async function enregistrer(ajouterAutre: boolean): Promise<void> {
    if (
      !selectedCompte ||
      readOnly ||
      !versionId ||
      !scenarioId ||
      !crId ||
      !ligneMetierId ||
      moisKeys.length !== 12
    ) {
      return;
    }
    const valeurs = mode === 'annuel' ? repartirAnnuel(montantAnnuel) : montants;
    const justif = justification.trim() || null;
    const cellules = moisKeys.map((mois, i) => ({
      mois,
      montant: valeurs[i] ?? 0,
      modeSaisie: 'MONTANT' as const,
      commentaire: justif,
    }));
    setSaving(true);
    try {
      const res = await saveGrilleSaisie({
        versionId,
        scenarioId,
        crId,
        lignes: [
          {
            compteId: selectedCompte.id,
            ligneMetierId,
            cellules,
          },
        ],
      });
      if (res.erreurs.length > 0) {
        toast.error(`Saisie refusée : ${res.erreurs[0]!.message}`);
        return;
      }
      toast.success(
        `Compte ${selectedCompte.codeCompte} enregistré (${
          res.inserees + res.modifiees
        } cellule(s)).`,
      );
      reloadGrille();
      reset();
      if (ajouterAutre) {
        compteInputRef.current
          ?.querySelector<HTMLInputElement>('input')
          ?.focus();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la sauvegarde : ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Saisie budgétaire
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Saisie focalisée compte par compte — mode annuel (réparti /12)
            ou mensuel
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setImportOuvert(true)}
          disabled={!contexteComplet || readOnly}
          title={
            !contexteComplet
              ? 'Sélectionnez un contexte (version, scénario, CR…) avant d’importer'
              : readOnly
                ? 'Version verrouillée — import impossible'
                : 'Importer un fichier CSV ou XLSX'
          }
          data-testid="hybride-import"
          className="h-9 gap-1.5 shrink-0"
        >
          <FileUp className="w-3.5 h-3.5" />
          Importer Excel
        </Button>
      </div>

      <SelecteurContexte />

      {/* ─── Filtre compte ──────────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3.5 mb-4">
        <Label htmlFor="hybride-compte" className="text-xs mb-1 block">
          Compte à saisir
        </Label>
        <div ref={compteInputRef} className="max-w-xl">
          <CompteCombobox
            id="hybride-compte"
            value={selectedCompte?.codeCompte ?? ''}
            onChange={(code) => {
              if (!code) setSelectedCompte(null);
            }}
            onSelectCompte={setSelectedCompte}
            classes={[codeClasse]}
            inclureCollectifs
            disabled={!contexteComplet}
          />
        </div>
      </div>

      {versionVerrouillee && (
        <div
          className="rounded-md border border-(--miznas-cat-validation)/40 bg-(--miznas-cat-validation)/5 p-3 text-sm mb-4"
          data-testid="hybride-verrou"
        >
          🔒 Version « {statutVersion} » — saisie en lecture seule.
        </div>
      )}

      {!selectedCompte && (
        <div
          className="bg-white border border-dashed border-(--border) rounded-lg py-12 px-7 text-center text-sm text-(--muted-foreground)"
          data-testid="hybride-vide"
        >
          Sélectionnez un compte pour commencer la saisie.
        </div>
      )}

      {selectedCompte && (
        <div
          className="bg-white border border-(--border) rounded-md p-4 space-y-4"
          data-testid="hybride-form"
        >
          <div className="text-sm font-semibold">
            <span className="font-mono">{selectedCompte.codeCompte}</span>
            <span className="mx-2 text-(--muted-foreground)">—</span>
            {selectedCompte.libelle}
          </div>

          {selectedCompte.estCompteCollectif && (
            <div
              className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 p-2.5 text-xs"
              data-testid="hybride-collectif-hint"
            >
              ⚠ Compte agrégé (parent). La saisie peut être refusée par le
              contrôle budgétaire backend selon la configuration en vigueur.
            </div>
          )}

          {/* Sélecteur de mode */}
          <fieldset className="flex gap-5" disabled={readOnly}>
            <legend className="sr-only">Mode de saisie</legend>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="mode-saisie"
                checked={mode === 'annuel'}
                onChange={() => demanderBascule('annuel')}
                data-testid="hybride-mode-annuel"
                className="accent-(--primary)"
              />
              Saisie annuelle (réparti auto /12)
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="mode-saisie"
                checked={mode === 'mensuel'}
                onChange={() => demanderBascule('mensuel')}
                data-testid="hybride-mode-mensuel"
                className="accent-(--primary)"
              />
              Saisie mensuelle (12 montants distincts)
            </label>
          </fieldset>

          {/* Mode annuel */}
          {mode === 'annuel' && (
            <div className="space-y-2">
              <div className="max-w-xs">
                <Label htmlFor="hybride-annuel" className="text-xs mb-1 block">
                  Montant annuel (XOF)
                </Label>
                <Input
                  id="hybride-annuel"
                  data-testid="hybride-montant-annuel"
                  type="number"
                  value={montantAnnuel}
                  onChange={(e) => onMontantAnnuelChange(e.target.value)}
                  disabled={readOnly}
                  className="h-9 tabular-nums"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {montants.map((m, i) => (
                  <div
                    key={moisKeys[i] ?? i}
                    className="text-xs bg-(--secondary) rounded px-2 py-1.5 tabular-nums"
                    data-testid={`hybride-mois-ro-${i}`}
                  >
                    <div className="text-(--muted-foreground)">
                      {MOIS_FR[i]} {exerciceFiscal ?? ''}
                    </div>
                    <div className="font-medium">{FMT.format(m)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode mensuel */}
          {mode === 'mensuel' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {montants.map((m, i) => (
                  <div key={moisKeys[i] ?? i}>
                    <Label className="text-[11px] mb-0.5 block text-(--muted-foreground)">
                      {MOIS_FR[i]} {exerciceFiscal ?? ''}
                    </Label>
                    <Input
                      type="number"
                      value={m}
                      onChange={(e) => onMontantMensuelChange(i, e.target.value)}
                      disabled={readOnly}
                      data-testid={`hybride-mois-${i}`}
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div
                className="text-sm font-semibold text-right tabular-nums"
                data-testid="hybride-total"
              >
                Total annuel : {FMT.format(totalMensuel)} XOF
              </div>
            </div>
          )}

          {/* Justification */}
          <div className="max-w-2xl">
            <Label htmlFor="hybride-justif" className="text-xs mb-1 block">
              Justification{' '}
              <span className="text-(--muted-foreground) font-normal">
                (optionnel, {JUSTIF_MAX} car. max)
              </span>
            </Label>
            <textarea
              id="hybride-justif"
              data-testid="hybride-justif"
              value={justification}
              onChange={(e) =>
                setJustification(e.target.value.slice(0, JUSTIF_MAX))
              }
              disabled={readOnly}
              rows={2}
              maxLength={JUSTIF_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Hypothèse retenue, base de calcul…"
            />
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border)">
              <Button
                onClick={() => void enregistrer(false)}
                disabled={saving}
                data-testid="hybride-enregistrer"
                className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => void enregistrer(true)}
                disabled={saving}
                data-testid="hybride-enregistrer-autre"
              >
                Enregistrer et ajouter une autre ligne
              </Button>
              <Button
                variant="outline"
                onClick={reset}
                disabled={saving}
                data-testid="hybride-annuler"
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmBascule}
        onClose={() => setConfirmBascule(false)}
        onConfirm={() => {
          confirmerBasculeAnnuel();
          return Promise.resolve();
        }}
        title="Passer en saisie annuelle ?"
        description={
          <p>
            Les 12 montants mensuels ne sont pas identiques. Passer en mode
            annuel va <strong>répartir uniformément</strong> le total sur les
            12 mois et <strong>perdre la saisonnalité</strong> actuelle.
          </p>
        }
        confirmText="Passer en annuel"
        cancelText="Garder le mensuel"
        destructive
      />

      {/* Import en masse CSV/XLSX (porté depuis l'ancienne grille) */}
      <ImportBudgetDialog
        isOpen={importOuvert}
        onClose={() => setImportOuvert(false)}
        versionId={versionId}
        versionCode={grille?.version.codeVersion}
        versionLibelle={grille?.version.libelle}
        scenarioId={scenarioId}
        scenarioCode={grille?.scenario.codeScenario}
        scenarioLibelle={grille?.scenario.libelle}
        onSucces={() => reloadGrille()}
      />
    </div>
  );
}
