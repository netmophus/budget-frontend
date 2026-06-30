/**
 * TableauBordBudgetVsRealisePage (Lot 5.2.C + refonte Lot 7.3 V24
 * Charte v1).
 *
 * Page tableau de bord Budget vs Réalisé. 3 sections :
 *  1. Filtres (FiltresEcartsForm) — refondu V24 (sections périmètre
 *     + seuils en cadres gris)
 *  2. KPI cards (KpiCardsRow) — refondu V24 (4 KPI épurés Charte v1
 *     avec pastille colorée, 4e KPI = écart total absolu avec
 *     décomposition fav/défav)
 *  3. Tableau des écarts (EcartsTable) avec filtre rapide niveau +
 *     recherche compte/CR
 *
 * Refonte V24 (page elle-même) :
 *  - Header custom : cercle ArrowLeftRight catégorie REALISE
 *    (violet #5B4E91) + titre + sous-titre métier complet
 *  - Barre de filtres rapides (visible après analyse) en cadre
 *    gris bg-(--secondary) cohérent V11→V23
 *  - Bandeau d'erreur Charte v1 (style alerte rouge épuré)
 *  - États vides "Lancez une analyse" / "Aucun écart à signaler"
 *    grand format (icônes Play violet / CheckCircle vert)
 */
import {
  ArrowLeftRight,
  CircleCheck,
  Play,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EcartsBarChartCR } from '@/components/tableau-bord/EcartsBarChartCR';
import { EcartsBarChartLM } from '@/components/tableau-bord/EcartsBarChartLM';
import { EcartsBarChartMensuel } from '@/components/tableau-bord/EcartsBarChartMensuel';
import { EcartsDonutNiveaux } from '@/components/tableau-bord/EcartsDonutNiveaux';
import { EcartsTable } from '@/components/tableau-bord/EcartsTable';
import { EcartsTop10Comptes } from '@/components/tableau-bord/EcartsTop10Comptes';
import { FiltresEcartsForm } from '@/components/tableau-bord/FiltresEcartsForm';
import { KpiCardsRow } from '@/components/tableau-bord/KpiCardsRow';
import { MiznasAiAnalysePanel } from '@/components/tableau-bord/MiznasAiAnalysePanel';
import {
  AiAnalyseError,
  demanderAnalyseAi,
  type AnalyseAiResponse,
} from '@/lib/api/ai-analyse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  exporterEcartsExcel,
  exporterEcartsPdf,
  type FiltresEcarts,
} from '@/lib/api/tableau-bord';
import {
  filtrerLignes,
  useTableauBordStore,
} from '@/lib/stores/tableau-bord-store';
import { useHasPermission } from '@/lib/auth/permissions';

export function TableauBordBudgetVsRealisePage(): JSX.Element {
  // Hotfix IA-0 — le déclenchement d'une analyse MIZNAS AI exige la
  // permission AI.ANALYSER (gate backend POST /tableau-de-bord/analyse-ai).
  // Sans elle, le bouton ne doit pas s'afficher : un clic renverrait un 403.
  const canUseAi = useHasPermission('AI.ANALYSER');
  const {
    versionId,
    scenarioId,
    crIds,
    moisDebut,
    moisFin,
    seuilEcartPctAttention,
    seuilEcartPctCritique,
    ecarts,
    loading,
    error,
    filtreRapide,
    filtreClasse,
    rechercheTexte,
    drillCr,
    drillLm,
    setFiltreRapide,
    setFiltreClasse,
    setRechercheTexte,
    setDrillCr,
    setDrillLm,
    clearDrill,
    analyser,
  } = useTableauBordStore();

  const [exporting, setExporting] = useState(false);
  // Lot 8.6.A — état du panneau MIZNAS AI (volatile, useState local,
  // PAS dans le store Zustand car non persisté entre sessions).
  const [analyseAi, setAnalyseAi] = useState<AnalyseAiResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState<string | null>(null);

  useEffect(() => {
    if (versionId && scenarioId && !ecarts) {
      void analyser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Niveau 1 : filtres rapides (niveau + classe + recherche). Alimente
  // les charts par dimension (CR / LM) → toutes les dimensions restent
  // visibles pour permettre le drill-down.
  const lignesBase = useMemo(() => {
    if (!ecarts) return [];
    return filtrerLignes(
      ecarts.lignes,
      filtreRapide,
      rechercheTexte,
      filtreClasse,
    );
  }, [ecarts, filtreRapide, rechercheTexte, filtreClasse]);

  // Niveau 2 : drill-down (clic sur une barre CR / LM). Alimente le
  // tableau, le chart mensuel et les Top performances.
  const lignesFiltrees = useMemo(
    () =>
      lignesBase.filter(
        (l) =>
          (!drillCr || l.codeCr === drillCr) &&
          (!drillLm || l.codeLigneMetier === drillLm),
      ),
    [lignesBase, drillCr, drillLm],
  );

  // Lot 8.5.C — pour le donut, on applique recherche + classe + drill
  // mais PAS le filtre niveau (sinon le donut deviendrait mono-couleur).
  const lignesFiltreesSansNiveau = useMemo(() => {
    if (!ecarts) return [];
    return filtrerLignes(
      ecarts.lignes,
      'TOUS',
      rechercheTexte,
      filtreClasse,
    ).filter(
      (l) =>
        (!drillCr || l.codeCr === drillCr) &&
        (!drillLm || l.codeLigneMetier === drillLm),
    );
  }, [ecarts, rechercheTexte, filtreClasse, drillCr, drillLm]);

  async function lancerAnalyseAi(): Promise<void> {
    if (!versionId || !scenarioId) return;
    setLoadingAi(true);
    setErrorAi(null);
    try {
      const res = await demanderAnalyseAi({
        versionId,
        scenarioId,
        crIds: crIds.length > 0 ? crIds : undefined,
        moisDebut,
        moisFin,
        seuilEcartPctAttention,
        seuilEcartPctCritique,
      });
      setAnalyseAi(res);
    } catch (err) {
      const msg =
        err instanceof AiAnalyseError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erreur inconnue';
      setErrorAi(msg);
    } finally {
      setLoadingAi(false);
    }
  }

  function fermerAnalyseAi(): void {
    setAnalyseAi(null);
    setErrorAi(null);
  }

  async function handleExporter(): Promise<void> {
    if (!versionId || !scenarioId) return;
    setExporting(true);
    const filtres: FiltresEcarts = {
      versionId,
      scenarioId,
      crIds: crIds.length > 0 ? crIds : undefined,
      moisDebut,
      moisFin,
      seuilEcartPctAttention,
      seuilEcartPctCritique,
    };
    try {
      await exporterEcartsExcel(filtres);
      toast.success('Export Excel téléchargé.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec export : ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  // Lot 8.6.B — export PDF. Si `avecIa`, embarque le snapshot de
  // l'analyse MIZNAS AI déjà affichée (state `analyseAi`) — AUCUN
  // nouvel appel Anthropic.
  async function handleExporterPdf(avecIa: boolean): Promise<void> {
    if (!versionId || !scenarioId) return;
    setExporting(true);
    const filtres: FiltresEcarts = {
      versionId,
      scenarioId,
      crIds: crIds.length > 0 ? crIds : undefined,
      moisDebut,
      moisFin,
      seuilEcartPctAttention,
      seuilEcartPctCritique,
    };
    const snapshot =
      avecIa && analyseAi
        ? {
            analyse: analyseAi.analyse,
            model: analyseAi.model,
            tokensInput: analyseAi.tokensInput,
            tokensOutput: analyseAi.tokensOutput,
            dureeMs: analyseAi.dureeMs,
            dryRun: analyseAi.dryRun,
            generatedAt: new Date().toISOString(),
          }
        : undefined;
    try {
      await exporterEcartsPdf(filtres, snapshot);
      toast.success(
        snapshot
          ? 'Export PDF (avec analyse IA) téléchargé.'
          : 'Export PDF téléchargé.',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec export : ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#5B4E911A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <ArrowLeftRight
            className="w-5 h-5"
            style={{ color: '#5B4E91' }}
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Tableau de bord — Budget vs Réalisé
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Agrégation mensuelle par CR / compte / ligne métier — sens
            favorable / défavorable selon classe UEMOA
          </p>
        </div>
      </div>

      <FiltresEcartsForm
        onAnalyser={() => void analyser()}
        onExporter={() => void handleExporter()}
        onExporterPdf={() => void handleExporterPdf(false)}
        onExporterPdfIa={() => void handleExporterPdf(true)}
        analyseDisponible={analyseAi !== null}
        loading={loading || exporting}
        onAnalyseAiClick={() => void lancerAnalyseAi()}
        loadingAi={loadingAi}
        hasEcarts={!!ecarts}
        canUseAi={canUseAi}
      />

      {loading && (
        <div className="bg-white border border-(--border) rounded-md p-6 text-center text-sm text-(--muted-foreground)">
          Analyse en cours…
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-md border p-3 text-sm mb-3 flex items-start gap-2"
          style={{
            borderColor: '#DC262640',
            backgroundColor: '#DC26260D',
            color: '#DC2626',
          }}
          data-testid="error-state"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !ecarts && !error && (
        <div className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
            style={{ backgroundColor: '#5B4E9114' }}
            aria-hidden="true"
          >
            <Play className="w-7 h-7" style={{ color: '#5B4E91' }} />
          </div>
          <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
            Lancez une analyse
          </div>
          <p className="text-xs text-(--muted-foreground) max-w-[420px] mx-auto leading-relaxed">
            Définissez votre périmètre et vos seuils, puis cliquez sur
            <strong> Analyser </strong>pour comparer le budget au réalisé.
          </p>
        </div>
      )}

      {ecarts && !loading && (
        <>
          <KpiCardsRow
            kpi={ecarts.kpi}
            totaux={ecarts.totaux}
            erreur={!!error}
          />

          {/* ─── Lot 8.5.C — Graphiques (entre KPI et filtres rapides) ─── */}
          {!error && (
            <div className="mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <EcartsBarChartMensuel lignes={lignesFiltrees} />
                <EcartsDonutNiveaux lignes={lignesFiltreesSansNiveau} />
              </div>
              <EcartsTop10Comptes lignes={lignesFiltrees} />

              {/* ─── PR2 — Visualisations par dimension (CR / LM) ─── */}
              <div className="mt-4" data-testid="visualisations-dimension">
                <h4 className="text-sm font-semibold mb-2">
                  Visualisations par dimension
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <EcartsBarChartCR
                    lignes={lignesBase}
                    onSelectCr={setDrillCr}
                  />
                  <EcartsBarChartLM
                    lignes={lignesBase}
                    onSelectLm={setDrillLm}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Lot 8.6.A — Panneau MIZNAS AI (entre graphes et filtres
              rapides). Affiché uniquement quand l'utilisateur a déclenché
              une analyse (loading / error / success). ─── */}
          {canUseAi &&
            !error &&
            (analyseAi !== null || loadingAi || errorAi !== null) && (
            <MiznasAiAnalysePanel
              analyse={analyseAi}
              loading={loadingAi}
              error={errorAi}
              onFermer={fermerAnalyseAi}
              onRetry={() => void lancerAnalyseAi()}
            />
          )}

          {error ? (
            <p
              className="text-sm text-(--muted-foreground)"
              data-testid="table-fallback-erreur"
            >
              Données indisponibles — relancez l&apos;analyse une fois
              l&apos;erreur résolue.
            </p>
          ) : (
            <>
              {/* ─── Barre filtres rapides en cadre gris ────── */}
              <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-3.5">
                <div className="grid grid-cols-1 md:grid-cols-[200px_180px_1fr_auto] gap-2.5 items-end">
                  <div>
                    <Label
                      htmlFor="tb-filtre-rapide"
                      className="text-xs mb-1 block"
                    >
                      Afficher
                    </Label>
                    <Select
                      value={filtreRapide}
                      onValueChange={(v) => setFiltreRapide(v as never)}
                    >
                      <SelectTrigger
                        id="tb-filtre-rapide"
                        data-testid="filtre-rapide"
                        className="h-9 bg-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOUS">
                          Toutes les lignes
                        </SelectItem>
                        <SelectItem value="CRITIQUE">
                          Critiques uniquement
                        </SelectItem>
                        <SelectItem value="ATTENTION">
                          Attention uniquement
                        </SelectItem>
                        <SelectItem value="MANQUANT">
                          Manquants uniquement
                        </SelectItem>
                        <SelectItem value="SANS_BUDGET">
                          Sans budget uniquement
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="tb-filtre-classe"
                      className="text-xs mb-1 block"
                    >
                      Classe de compte
                    </Label>
                    <Select
                      value={filtreClasse}
                      onValueChange={(v) => setFiltreClasse(v as never)}
                    >
                      <SelectTrigger
                        id="tb-filtre-classe"
                        data-testid="filtre-classe"
                        className="h-9 bg-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOUTES">Toutes</SelectItem>
                        <SelectItem value="PRODUITS">
                          Produits (classe 7)
                        </SelectItem>
                        <SelectItem value="CHARGES">
                          Charges (classe 6)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="tb-recherche"
                      className="text-xs mb-1 block"
                    >
                      Recherche (CR / compte)
                    </Label>
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                        aria-hidden="true"
                      />
                      <Input
                        id="tb-recherche"
                        data-testid="recherche-texte"
                        value={rechercheTexte}
                        onChange={(e) => setRechercheTexte(e.target.value)}
                        placeholder="ex. 611 ou BANDABARI"
                        className="h-9 pl-9 bg-white"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-(--muted-foreground) tabular-nums whitespace-nowrap pb-2">
                    <span data-testid="compteur-affichees">
                      {lignesFiltrees.length}
                    </span>
                    {' / '}
                    <span data-testid="compteur-total">
                      {ecarts.lignes.length}
                    </span>
                    {' lignes affichées'}
                  </div>
                </div>
              </div>

              {/* ─── PR2 — Indicateur de drill-down actif ───── */}
              {(drillCr || drillLm) && (
                <div
                  className="flex items-center gap-2 mb-3 text-sm"
                  data-testid="drill-indicateur"
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                    style={{ backgroundColor: '#5B4E9114', color: '#5B4E91' }}
                  >
                    Filtré sur {drillCr ? `CR ${drillCr}` : `LM ${drillLm}`}
                    <button
                      type="button"
                      onClick={clearDrill}
                      className="hover:opacity-70"
                      aria-label="Retirer le filtre"
                      data-testid="drill-clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              )}

              {/* État vide après filtre vs après analyse */}
              {lignesFiltrees.length === 0 && ecarts.lignes.length > 0 && (
                <div className="bg-white border border-dashed border-(--border) rounded-lg py-12 px-7 text-center">
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                    style={{ backgroundColor: '#0F6E5614' }}
                    aria-hidden="true"
                  >
                    <CircleCheck
                      className="w-6 h-6"
                      style={{ color: '#0F6E56' }}
                    />
                  </div>
                  <div className="text-sm font-semibold mb-1">
                    Aucune ligne pour ces filtres
                  </div>
                  <p className="text-xs text-(--muted-foreground)">
                    Ajustez le filtre rapide ou la recherche.
                  </p>
                </div>
              )}

              <div className="bg-white border border-(--border) rounded-md overflow-x-auto">
                <EcartsTable lignes={lignesFiltrees} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
