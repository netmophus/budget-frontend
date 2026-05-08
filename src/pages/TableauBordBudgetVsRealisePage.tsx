/**
 * TableauBordBudgetVsRealisePage (Lot 5.2.C) — page tableau de
 * bord budget vs réalisé. 3 sections : filtres, KPI cards,
 * tableau des écarts. Filtre rapide niveau + recherche
 * compte/CR.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EcartsTable } from '@/components/tableau-bord/EcartsTable';
import { FiltresEcartsForm } from '@/components/tableau-bord/FiltresEcartsForm';
import { KpiCardsRow } from '@/components/tableau-bord/KpiCardsRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exporterEcartsExcel, type FiltresEcarts } from '@/lib/api/tableau-bord';
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

  // Charge auto à l'ouverture si version+scénario sont déjà persistés
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
      <PageHeader
        title="Tableau de bord — Budget vs Réalisé"
        description="Agrégation mensuelle par CR / compte / ligne métier. Niveaux d'alerte selon seuils paramétrables. Sens favorable / défavorable selon classe du compte (UEMOA)."
      />

      <FiltresEcartsForm
        onAnalyser={() => void analyser()}
        onExporter={() => void handleExporter()}
        loading={loading || exporting}
      />

      {loading && (
        <p className="text-sm text-(--muted-foreground)">Analyse en cours…</p>
      )}

      {error && !loading && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-3"
          data-testid="error-state"
        >
          {error}
        </div>
      )}

      {ecarts && !loading && (
        <>
          <KpiCardsRow kpi={ecarts.kpi} />

          {/* Filtres rapides + recherche */}
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <Label htmlFor="tb-filtre-rapide">Afficher</Label>
              <Select
                value={filtreRapide}
                onValueChange={(v) => setFiltreRapide(v as never)}
              >
                <SelectTrigger
                  id="tb-filtre-rapide"
                  data-testid="filtre-rapide"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOUS">Toutes les lignes</SelectItem>
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
              <Label htmlFor="tb-recherche">Recherche (CR / compte)</Label>
              <Input
                id="tb-recherche"
                data-testid="recherche-texte"
                value={rechercheTexte}
                onChange={(e) => setRechercheTexte(e.target.value)}
                placeholder="ex. 611 ou BANDABARI"
              />
            </div>
            <div className="ml-auto text-xs text-(--muted-foreground)">
              <span data-testid="compteur-affichees">
                {lignesFiltrees.length}
              </span>{' '}
              ligne(s) affichée(s) sur{' '}
              <span data-testid="compteur-total">
                {ecarts.lignes.length}
              </span>
            </div>
          </div>

          <EcartsTable lignes={lignesFiltrees} />
        </>
      )}
    </div>
  );
}
