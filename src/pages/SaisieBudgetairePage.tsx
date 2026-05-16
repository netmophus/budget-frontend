/**
 * SaisieBudgetairePage (Lot 3.4) — page principale de saisie
 * budgétaire.
 *
 * Architecture :
 *  - SelecteurContexte (sticky en haut, 4 dropdowns)
 *  - GrilleSaisie (table custom HTML, 12 mois × N comptes feuilles)
 *  - Footer fixe : 3 boutons (Enregistrer, Calculer indicateurs,
 *    Annuler les modifs)
 *  - IndicateursPanel (Dialog modal slide-over)
 *
 * Lecture seule si :
 *  - statut version != 'ouvert' (Brouillon UI), OU
 *  - permission BUDGET.SAISIR absente.
 */
import { AxiosError } from 'axios';
import {
  ChartBar,
  FileUp,
  Info,
  Lock,
  RotateCcw,
  Save,
  TableProperties,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { GrilleSaisie } from '@/components/budget/grille/GrilleSaisie';
import { IndicateursPanel } from '@/components/budget/grille/IndicateursPanel';
import { ImportBudgetDialog } from '@/components/budget/ImportBudgetDialog';
import { SelecteurContexte } from '@/components/budget/grille/SelecteurContexte';
import { WorkflowActions } from '@/components/budget/WorkflowActions';
import { BandeauDelegations } from '@/components/budget/BandeauDelegations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/lib/auth/permissions';
import { useGrilleSaisie } from '@/lib/hooks/useGrilleSaisie';
import {
  badgeClassStatutVersion,
  libelleStatutVersion,
} from '@/lib/labels/budget';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { getVersionById, type Version } from '@/lib/api/versions';

export function SaisieBudgetairePage() {
  const canSaisir = useHasPermission('BUDGET.SAISIR');
  const { versionId, scenarioId, crId, ligneMetierId, codeClasse } =
    useBudgetGrilleStore();

  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [indicateursOuvert, setIndicateursOuvert] = useState(false);
  const [importOuvert, setImportOuvert] = useState(false);
  const [enCoursSauvegarde, setEnCoursSauvegarde] = useState(false);

  // Hook chargement grille — exerciceFiscal dérivé de la version
  const exerciceFiscal = useMemo(() => {
    // On charge l'exercice depuis le contexte version chargé par
    // SelecteurContexte. À défaut (1ʳᵉ frame), on utilise une
    // estimation : l'année courante + 1 (cohérent avec le default
    // de VersionFormDrawer Lot 3.2). Sera réécrit après reload.
    return new Date().getFullYear() + 1;
  }, []);

  const grilleHook = useGrilleSaisie({
    versionId,
    scenarioId,
    crId,
    ligneMetierId,
    exerciceFiscal,
    codeClasse,
  });

  const {
    grille,
    isLoading,
    error,
    modifications,
    hasModifications,
    modeParLigne,
    modifierCellule,
    changerModeLigne,
    annulerModifications,
    sauvegarder,
    reload,
    getCelluleEffective,
    getTotalAnnuelLigne,
    getTotalMensuel,
    getTotalAnneeCr,
  } = grilleHook;

  const versionVerrouillee =
    grille !== null && grille.version.statut !== 'ouvert';
  const readOnly = !canSaisir || versionVerrouillee;

  // Lot 7.3 V20 — bandeau verrouillage unique. Discriminant entre
  // version figée (statut !== 'ouvert') et permission manquante. On
  // n'utilise PAS libelleStatutVersion pour le badge (collision
  // possible avec le badge statut affiché juste en dessous).
  const lockReason: string | null = useMemo(() => {
    if (!grille) return null;
    if (versionVerrouillee) return 'Figé';
    if (!canSaisir) return 'Consultation';
    return null;
  }, [grille, versionVerrouillee, canSaisir]);
  const lockMessage: string | null = useMemo(() => {
    if (!grille) return null;
    if (versionVerrouillee) {
      return 'Version officielle figée — saisie impossible. Conservation 10 ans (BCEAO).';
    }
    if (!canSaisir) {
      return "Vous n'avez pas la permission BUDGET.SAISIR sur cette version. Contactez votre administrateur.";
    }
    return null;
  }, [grille, versionVerrouillee, canSaisir]);

  // Lot 3.5 — version complète chargée pour exposer WorkflowActions
  // (la GrilleVersionRef portée par la grille est volontairement
  // limitée à id/code/libelle/statut).
  const [versionComplete, setVersionComplete] = useState<Version | null>(null);
  useEffect(() => {
    if (!grille) {
      setVersionComplete(null);
      return;
    }
    void getVersionById(grille.version.id)
      .then(setVersionComplete)
      .catch(() => {
        // Silence : non bloquant pour la saisie. On affiche juste pas
        // les boutons workflow.
        setVersionComplete(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pattern intentionnel : ne refetch version que quand id/statut change, pas sur grille entiere
  }, [grille?.version.id, grille?.version.statut]);

  async function handleSauvegarder() {
    // Mini-fix B.4 — Sauvegarder en 1 clic : forcer le blur de la
    // cellule en cours d'édition pour que son `onCommit` (déclenché
    // par handleBlur de GrilleCelluleEditor) propage la valeur à
    // `modifications` avant l'envoi du batch. Sans ce blur, la
    // dernière valeur tapée n'était commise qu'au tick suivant — le
    // 1er clic ne la voyait pas, l'utilisateur devait cliquer 2 fois.
    if (
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    ) {
      document.activeElement.blur();
    }
    // Cèder un tick pour laisser React appliquer le setState du blur
    // (la ref `modificationsRef` du hook lira la nouvelle valeur).
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    setEnCoursSauvegarde(true);
    try {
      const r = await sauvegarder();
      if (r.erreurs.length === 0) {
        toast.success(
          `Grille sauvegardée — ${r.inserees} insérée${r.inserees > 1 ? 's' : ''}, ` +
            `${r.modifiees} modifiée${r.modifiees > 1 ? 's' : ''}, ` +
            `${r.supprimees} supprimée${r.supprimees > 1 ? 's' : ''} ` +
            `(en ${r.dureeMs} ms).`,
        );
      } else {
        const msg = r.erreurs
          .slice(0, 3)
          .map((e) => `• ${e.mois}: ${e.message}`)
          .join('\n');
        toast.error(
          `Sauvegarde partielle — ${r.erreurs.length} erreur${r.erreurs.length > 1 ? 's' : ''}\n${msg}` +
            (r.erreurs.length > 3 ? '\n…' : ''),
          { duration: 8000 },
        );
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string })?.message ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Erreur inconnue';
      toast.error(`Échec de la sauvegarde : ${msg}`);
    } finally {
      setEnCoursSauvegarde(false);
    }
  }

  function handleAnnulerModifs() {
    annulerModifications();
    setConfirmAnnuler(false);
    toast.info('Modifications annulées.');
  }

  // ─── Rendu

  return (
    <div className="pb-24">
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#0C447C1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <TableProperties
            className="w-5 h-5"
            style={{ color: '#0C447C' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Saisie budgétaire
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5 font-mono truncate">
            {grille
              ? `${grille.version.codeVersion} — ${grille.scenario.codeScenario} — ${grille.cr.codeCr}`
              : 'Sélectionnez un contexte pour commencer.'}
          </p>
        </div>
      </div>

      <BandeauDelegations />

      {/* Lot 6.7.3 — bandeau informatif reforecast */}
      {versionComplete?.typeVersion === 'reforecast' && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
          role="status"
          data-testid="bandeau-saisie-reforecast"
        >
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Vous éditez un{' '}
            <strong>
              reforecast T{versionComplete.trimestreConsolide ?? '?'}{' '}
              {versionComplete.anneeConsolide ?? '?'}
            </strong>
            . Les modifications sont sauvegardées en place.
          </span>
        </div>
      )}

      {/* ─── Bandeau verrouillage UNIQUE (Lot 7.3 V20) ──────── */}
      {grille && lockReason && lockMessage && (
        <div
          className="rounded-sm px-4 py-3 flex items-start gap-3 mb-4"
          style={{
            backgroundColor: '#0F6E560F',
            borderLeft: '3px solid #0F6E56',
          }}
          role="status"
          data-testid="bandeau-verrouillage"
        >
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#0F6E5626' }}
            aria-hidden="true"
          >
            <Lock className="w-[15px] h-[15px]" style={{ color: '#0F6E56' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span
                className="text-[13px] font-semibold"
                style={{ color: '#0F6E56' }}
              >
                Cette version est verrouillée
              </span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-[10px] font-semibold"
                style={{
                  backgroundColor: '#0F6E5626',
                  color: '#0F6E56',
                }}
              >
                <Lock className="w-2.5 h-2.5" />
                {lockReason}
              </span>
            </div>
            <div className="text-xs text-(--muted-foreground) leading-relaxed">
              {lockMessage}
            </div>
          </div>
        </div>
      )}

      {/* Badge statut + modifs en attente + WorkflowActions */}
      {grille && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge
            className={badgeClassStatutVersion(grille.version.statut as never)}
          >
            {libelleStatutVersion(grille.version.statut as never)}
          </Badge>
          {hasModifications && (
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: '#BA7517' }}
            >
              ● {modifications.size} modification
              {modifications.size > 1 ? 's' : ''} en attente
            </span>
          )}
          {versionComplete && (
            <WorkflowActions
              version={versionComplete}
              onTransitioned={(next) => {
                setVersionComplete(next);
                void reload();
              }}
            />
          )}
        </div>
      )}

      <SelecteurContexte onChange={() => void reload()} />

      <div className="mt-4">
        {isLoading && (
          <div className="rounded-md border border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
            Chargement de la grille…
          </div>
        )}
        {!isLoading && error && (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-4 text-sm">
            ⚠ Impossible de charger la grille : {error.message}
          </div>
        )}
        {!isLoading && !error && grille && (
          <GrilleSaisie
            grille={grille}
            modeParLigne={modeParLigne}
            modifications={modifications}
            readOnly={readOnly}
            getCelluleEffective={getCelluleEffective}
            getTotalAnnuelLigne={getTotalAnnuelLigne}
            getTotalMensuel={getTotalMensuel}
            getTotalAnneeCr={getTotalAnneeCr}
            onModifierCellule={modifierCellule}
            onChangerMode={changerModeLigne}
          />
        )}
        {!isLoading && !error && !grille && (
          <div className="rounded-md border border-dashed border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
            Sélectionnez une version, un scénario et un CR pour afficher
            la grille.
          </div>
        )}
      </div>

      {/* ─── Footer fixe (Lot 7.3 V20 modernisé) ────────────── */}
      {grille && (
        <div className="fixed bottom-0 left-[var(--sidebar-width,15rem)] right-0 border-t border-(--border) bg-white/95 backdrop-blur px-4 py-3 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIndicateursOuvert(true)}
                className="h-9 gap-1.5"
              >
                <ChartBar className="w-3.5 h-3.5" />
                Calculer indicateurs
              </Button>
              {/* Lot 3.7 — Import en masse. Désactivé si saisie KO,
                  version verrouillée, ou modifs non sauvegardées. */}
              <Button
                variant="outline"
                onClick={() => setImportOuvert(true)}
                disabled={readOnly || hasModifications}
                title={
                  hasModifications
                    ? "Enregistrez ou annulez vos modifications avant d'importer"
                    : readOnly
                      ? 'Version verrouillée — import impossible'
                      : 'Importer un fichier CSV ou XLSX'
                }
                data-testid="btn-import"
                className="h-9 gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmAnnuler(true)}
                disabled={!hasModifications}
                className="h-9 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Annuler les modifs
              </Button>
              <Button
                onClick={handleSauvegarder}
                disabled={
                  !hasModifications || readOnly || enCoursSauvegarde
                }
                className="h-9 gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {enCoursSauvegarde ? 'Sauvegarde…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation annulation */}
      {confirmAnnuler && (
        <ConfirmDialog
          isOpen={confirmAnnuler}
          onClose={() => setConfirmAnnuler(false)}
          onConfirm={handleAnnulerModifs}
          title="Annuler toutes les modifications ?"
          description={
            <p>
              Vous allez perdre <strong>{modifications.size}</strong>{' '}
              modification{modifications.size > 1 ? 's' : ''} non sauvegardée
              {modifications.size > 1 ? 's' : ''}. Cette action est
              irréversible.
            </p>
          }
          confirmText="Annuler les modifs"
          cancelText="Continuer la saisie"
          destructive
        />
      )}

      {/* Panneau indicateurs (Lot 3.6 — calcul backend consolidé) */}
      <IndicateursPanel
        isOpen={indicateursOuvert}
        onClose={() => setIndicateursOuvert(false)}
        versionId={grille?.version.id ?? null}
        scenarioId={grille?.scenario.id ?? null}
        exerciceFiscal={grille?.exerciceFiscal ?? null}
      />

      {/* Dialog import en masse (Lot 3.7) */}
      <ImportBudgetDialog
        isOpen={importOuvert}
        onClose={() => setImportOuvert(false)}
        versionId={grille?.version.id ?? null}
        versionCode={grille?.version.codeVersion}
        versionLibelle={grille?.version.libelle}
        scenarioId={grille?.scenario.id ?? null}
        scenarioCode={grille?.scenario.codeScenario}
        scenarioLibelle={grille?.scenario.libelle}
        onSucces={() => {
          void reload();
        }}
      />
    </div>
  );
}
