/**
 * FiltresEcartsForm (Lot 5.2.C + refonte Lot 7.3 V24 Charte v1).
 *
 * Formulaire de filtres du tableau de bord. Validation client :
 * moisFin >= moisDebut, seuilCritique > seuilAttention.
 *
 * Refonte V24 :
 *  - 2 sections en cadre gris bg-(--secondary) avec en-tête
 *    coloré : « Périmètre d'analyse » (violet REALISE) et
 *    « Seuils d'alerte » (ambre)
 *  - Selects et inputs en h-9 bg-white
 *  - Bouton Analyser bleu nuit + Exporter outline
 *  - Liste des erreurs : bandeau rouge épuré (Alert variant)
 *  - data-testid PRÉSERVÉS : filtres-form / tb-version /
 *    tb-scenario / tb-mois-debut / tb-mois-fin / tb-crs /
 *    tb-attention / tb-critique / btn-analyser / btn-exporter /
 *    filtres-erreurs (logique métier zustand store inchangée).
 */
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  type CentreResponsabilite,
  listCrs,
} from '@/lib/api/referentiels';
import { listScenarios, type Scenario } from '@/lib/api/scenarios';
import { listVersions, type Version } from '@/lib/api/versions';
import { useTableauBordStore } from '@/lib/stores/tableau-bord-store';

interface Props {
  onAnalyser: () => void;
  /** Lot 8.6.B — export Excel (item du dropdown « Exporter »). */
  onExporter: () => void;
  /** Lot 8.6.B — export PDF sans analyse IA. */
  onExporterPdf: () => void;
  /** Lot 8.6.B — export PDF avec snapshot de l'analyse IA affichée. */
  onExporterPdfIa: () => void;
  /** Lot 8.6.B — true si une analyse MIZNAS AI est affichée (active l'item PDF+IA). */
  analyseDisponible: boolean;
  loading: boolean;
  // Lot 8.6.A — bouton « ✨ Analyser avec MIZNAS AI ». Le caller
  // fournit le handler + indique si une analyse est en cours +
  // si des écarts existent déjà (le bouton n'a de sens que si
  // l'utilisateur a déjà lancé une analyse classique).
  onAnalyseAiClick: () => void;
  loadingAi: boolean;
  hasEcarts: boolean;
  /**
   * Hotfix IA-0 — true si l'utilisateur a la permission AI.ANALYSER.
   * Conditionne l'affichage du bouton « Analyser avec MIZNAS AI » et de
   * l'item d'export « PDF avec analyse IA » (sinon un clic renverrait 403).
   */
  canUseAi: boolean;
}

export function FiltresEcartsForm({
  onAnalyser,
  onExporter,
  onExporterPdf,
  onExporterPdfIa,
  analyseDisponible,
  loading,
  onAnalyseAiClick,
  loadingAi,
  hasEcarts,
  canUseAi,
}: Props): JSX.Element {
  const {
    versionId,
    scenarioId,
    crIds,
    moisDebut,
    moisFin,
    seuilEcartPctAttention,
    seuilEcartPctCritique,
    setVersionId,
    setScenarioId,
    setCrIds,
    setPeriode,
    setSeuils,
  } = useTableauBordStore();

  const [versions, setVersions] = useState<Version[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [crs, setCrs] = useState<CentreResponsabilite[]>([]);

  useEffect(() => {
    Promise.all([
      listVersions({ limit: 200 }),
      listScenarios({ limit: 200 }),
      listCrs({ limit: 200 }),
    ])
      .then(([v, s, c]) => {
        setVersions(v.items);
        setScenarios(s.items);
        setCrs(c.items);
        if (!versionId && v.items.length > 0) {
          const publiees = v.items.filter((x) => x.statut === 'gele');
          const def = publiees[0] ?? v.items[0]!;
          setVersionId(def.id);
        }
        if (!scenarioId && s.items.length > 0) {
          setScenarioId(s.items[0]!.id);
        }
      })
      .catch(() =>
        toast.error('Impossible de charger les référentiels du formulaire.'),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pattern mount-only fetch : init versions/scenarios une seule fois au montage
  }, []);

  const erreurs = useMemo(() => {
    const e: string[] = [];
    if (moisFin < moisDebut) e.push('Mois fin doit être ≥ mois début.');
    if (seuilEcartPctCritique <= seuilEcartPctAttention) {
      e.push(
        'Seuil CRITIQUE doit être strictement supérieur au seuil ATTENTION.',
      );
    }
    if (!versionId) e.push('Version requise.');
    if (!scenarioId) e.push('Scénario requis.');
    return e;
  }, [
    moisDebut,
    moisFin,
    seuilEcartPctAttention,
    seuilEcartPctCritique,
    versionId,
    scenarioId,
  ]);

  const peutAnalyser = erreurs.length === 0 && !loading;

  return (
    <div className="space-y-3 mb-4" data-testid="filtres-form">
      {/* ─── Section 1 : Périmètre d'analyse ─────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Target className="w-3.5 h-3.5 text-(--miznas-cat-realise)" />
          <span className="text-[11px] font-semibold text-(--miznas-cat-realise) uppercase tracking-wider">
            Périmètre d&apos;analyse
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_120px] gap-2.5 mb-3">
          <div>
            <Label htmlFor="tb-version" className="text-xs mb-1 block">
              Version
            </Label>
            <Select
              value={versionId ?? undefined}
              onValueChange={setVersionId}
            >
              <SelectTrigger
                id="tb-version"
                data-testid="tb-version"
                className="h-9 bg-white"
              >
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.codeVersion} ({v.statut})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tb-scenario" className="text-xs mb-1 block">
              Scénario
            </Label>
            <Select
              value={scenarioId ?? undefined}
              onValueChange={setScenarioId}
            >
              <SelectTrigger
                id="tb-scenario"
                data-testid="tb-scenario"
                className="h-9 bg-white"
              >
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.codeScenario}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tb-debut" className="text-xs mb-1 block">
              Mois début
            </Label>
            <Input
              id="tb-debut"
              data-testid="tb-mois-debut"
              type="month"
              value={moisDebut}
              onChange={(e) => setPeriode(e.target.value, moisFin)}
              className="h-9 bg-white tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="tb-fin" className="text-xs mb-1 block">
              Mois fin
            </Label>
            <Input
              id="tb-fin"
              data-testid="tb-mois-fin"
              type="month"
              value={moisFin}
              onChange={(e) => setPeriode(moisDebut, e.target.value)}
              className="h-9 bg-white tabular-nums"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            Centres de responsabilité
            <span className="text-(--muted-foreground) font-normal">
              (vide = tout le périmètre)
            </span>
          </Label>
          <select
            multiple
            data-testid="tb-crs"
            className="w-full rounded-md border border-(--border) bg-white p-2 text-sm h-24 font-mono"
            value={crIds}
            onChange={(e) =>
              setCrIds(
                Array.from(e.target.selectedOptions).map((o) => o.value),
              )
            }
          >
            {crs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codeCr} — {c.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Section 2 : Seuils d'alerte ─────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-(--miznas-ambre)" />
          <span className="text-[11px] font-semibold text-(--miznas-ambre) uppercase tracking-wider">
            Seuils d&apos;alerte (paramétrables)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: '#BA7517' }}
                aria-hidden="true"
              />
              <Label htmlFor="tb-attention" className="text-xs m-0">
                Seuil ATTENTION (%)
              </Label>
            </div>
            <Input
              id="tb-attention"
              data-testid="tb-attention"
              type="number"
              min="0"
              max="100"
              value={seuilEcartPctAttention}
              onChange={(e) =>
                setSeuils(Number(e.target.value), seuilEcartPctCritique)
              }
              className="h-9 bg-white text-base font-medium tabular-nums"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: '#DC2626' }}
                aria-hidden="true"
              />
              <Label htmlFor="tb-critique" className="text-xs m-0">
                Seuil CRITIQUE (%)
              </Label>
            </div>
            <Input
              id="tb-critique"
              data-testid="tb-critique"
              type="number"
              min="0"
              max="1000"
              value={seuilEcartPctCritique}
              onChange={(e) =>
                setSeuils(seuilEcartPctAttention, Number(e.target.value))
              }
              className="h-9 bg-white text-base font-medium tabular-nums"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!peutAnalyser}
                  data-testid="btn-exporter"
                  className="h-9 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exporter
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid="export-excel"
                  onSelect={onExporter}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="export-pdf"
                  onSelect={onExporterPdf}
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </DropdownMenuItem>
                {canUseAi && (
                  <DropdownMenuItem
                    data-testid="export-pdf-ia"
                    onSelect={onExporterPdfIa}
                    disabled={!analyseDisponible}
                    title={
                      analyseDisponible
                        ? undefined
                        : "Lancez d'abord une analyse MIZNAS AI"
                    }
                  >
                    <Sparkles className="w-4 h-4" />
                    PDF avec analyse IA
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={onAnalyser}
              disabled={!peutAnalyser}
              data-testid="btn-analyser"
              className="h-9 px-4 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Analyser
            </Button>
            {/* Lot 8.6.A — 3e bouton MIZNAS AI. Désactivé si aucun
                écart chargé (l'utilisateur doit avoir cliqué
                « Analyser » classique d'abord). Couleur violet
                catégorie REALISE (--miznas-cat-realise #5B4E91).
                Hotfix IA-0 — masqué sans permission AI.ANALYSER. */}
            {canUseAi && (
              <Button
                onClick={onAnalyseAiClick}
                disabled={loading || loadingAi || !hasEcarts}
                data-testid="btn-analyser-ai"
                title={
                  hasEcarts
                    ? undefined
                    : "Lancez d'abord une analyse classique pour activer MIZNAS AI."
                }
                className="h-9 px-4 bg-(--miznas-cat-realise) hover:bg-(--miznas-cat-realise)/90 text-white gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingAi ? 'Analyse en cours…' : 'Analyser avec MIZNAS AI'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {erreurs.length > 0 && (
        <ul
          className="rounded-md border p-3 text-xs list-disc list-inside space-y-0.5"
          style={{
            borderColor: '#DC262640',
            backgroundColor: '#DC26260D',
            color: '#DC2626',
          }}
          data-testid="filtres-erreurs"
        >
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
