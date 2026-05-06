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
import { ChartBar, FileUp, Lock, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { GrilleSaisie } from '@/components/budget/grille/GrilleSaisie';
import { IndicateursPanel } from '@/components/budget/grille/IndicateursPanel';
import { ImportBudgetDialog } from '@/components/budget/ImportBudgetDialog';
import { SelecteurContexte } from '@/components/budget/grille/SelecteurContexte';
import { WorkflowActions } from '@/components/budget/WorkflowActions';
import { PageHeader } from '@/components/common/PageHeader';
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
      <PageHeader
        title="Saisie budgétaire"
        description={
          grille
            ? `${grille.version.codeVersion} — ${grille.scenario.codeScenario} — ${grille.cr.codeCr}`
            : 'Sélectionnez un contexte pour commencer.'
        }
      />

      {grille && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge className={badgeClassStatutVersion(grille.version.statut as never)}>
            {libelleStatutVersion(grille.version.statut as never)}
          </Badge>
          {versionVerrouillee && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <Lock className="h-3 w-3" />
              Cette version est verrouillée — saisie impossible.
            </span>
          )}
          {hasModifications && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
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

      {/* Footer fixe */}
      {grille && (
        <div className="fixed bottom-0 left-[var(--sidebar-width,15rem)] right-0 border-t border-(--border) bg-(--background)/95 backdrop-blur p-3 z-30">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIndicateursOuvert(true)}
            >
              <ChartBar className="h-4 w-4 mr-2" />
              Calculer indicateurs
            </Button>
            {/* Lot 3.7 — Import en masse. Désactivé si saisie KO,
                version verrouillée, ou modifs non sauvegardées
                (pour éviter de perdre des modifs locales). */}
            <Button
              variant="outline"
              onClick={() => setImportOuvert(true)}
              disabled={readOnly || hasModifications}
              title={
                hasModifications
                  ? 'Enregistrez ou annulez vos modifications avant d\'importer'
                  : readOnly
                    ? 'Version verrouillée — import impossible'
                    : 'Importer un fichier CSV ou XLSX'
              }
              data-testid="btn-import"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmAnnuler(true)}
              disabled={!hasModifications}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Annuler les modifs
            </Button>
            <Button
              onClick={handleSauvegarder}
              disabled={
                !hasModifications || readOnly || enCoursSauvegarde
              }
            >
              <Save className="h-4 w-4 mr-2" />
              {enCoursSauvegarde ? 'Sauvegarde…' : 'Enregistrer'}
            </Button>
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
