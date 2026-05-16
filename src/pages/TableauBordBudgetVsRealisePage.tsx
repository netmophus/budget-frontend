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
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EcartsTable } from '@/components/tableau-bord/EcartsTable';
import { FiltresEcartsForm } from '@/components/tableau-bord/FiltresEcartsForm';
import { KpiCardsRow } from '@/components/tableau-bord/KpiCardsRow';
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
  type FiltresEcarts,
} from '@/lib/api/tableau-bord';
import { useTableauBordStore } from '@/lib/stores/tableau-bord-store';

export function TableauBordBudgetVsRealisePage(): JSX.Element {
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
    rechercheTexte,
    setFiltreRapide,
    setRechercheTexte,
    analyser,
  } = useTableauBordStore();

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (versionId && scenarioId && !ecarts) {
      void analyser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lignesFiltrees = useMemo(() => {
    if (!ecarts) return [];
    const r = rechercheTexte.trim().toLowerCase();
    return ecarts.lignes.filter((l) => {
      if (filtreRapide !== 'TOUS' && l.niveauAlerte !== filtreRapide)
        return false;
      if (r) {
        const target = `${l.codeCr} ${l.codeCompte}`.toLowerCase();
        if (!target.includes(r)) return false;
      }
      return true;
    });
  }, [ecarts, filtreRapide, rechercheTexte]);

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
        loading={loading || exporting}
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
          <KpiCardsRow kpi={ecarts.kpi} erreur={!!error} />

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
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2.5 items-end">
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
