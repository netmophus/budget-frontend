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
import { ChartBar, Lock, RotateCcw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { GrilleSaisie } from '@/components/budget/grille/GrilleSaisie';
import { IndicateursPanel } from '@/components/budget/grille/IndicateursPanel';
import { SelecteurContexte } from '@/components/budget/grille/SelecteurContexte';
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

export function SaisieBudgetairePage() {
  const canSaisir = useHasPermission('BUDGET.SAISIR');
  const { versionId, scenarioId, crId, ligneMetierId, codeClasse } =
    useBudgetGrilleStore();

  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [indicateursOuvert, setIndicateursOuvert] = useState(false);
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

  async function handleSauvegarder() {
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
        <div className="mb-3 flex items-center gap-2">
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

      {/* Panneau indicateurs */}
      <IndicateursPanel
        isOpen={indicateursOuvert}
        onClose={() => setIndicateursOuvert(false)}
        grille={grille}
        getCelluleEffective={getCelluleEffective}
      />
    </div>
  );
}
