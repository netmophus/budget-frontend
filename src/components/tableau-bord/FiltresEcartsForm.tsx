/**
 * FiltresEcartsForm (Lot 5.2.C) — formulaire de filtres du
 * tableau de bord. Validation client : moisFin >= moisDebut,
 * seuilCritique > seuilAttention.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  onExporter: () => void;
  loading: boolean;
}

export function FiltresEcartsForm({
  onAnalyser,
  onExporter,
  loading,
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
        // Auto-sélection version GELE la plus récente
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
  }, []);

  const erreurs = useMemo(() => {
    const e: string[] = [];
    if (moisFin < moisDebut) e.push('Mois fin doit être ≥ mois début.');
    if (seuilEcartPctCritique <= seuilEcartPctAttention) {
      e.push('Seuil CRITIQUE doit être strictement supérieur au seuil ATTENTION.');
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
    <div
      className="rounded-md border border-(--border) p-3 mb-4 space-y-3"
      data-testid="filtres-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label htmlFor="tb-version">Version</Label>
          <Select
            value={versionId ?? undefined}
            onValueChange={setVersionId}
          >
            <SelectTrigger id="tb-version" data-testid="tb-version">
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
          <Label htmlFor="tb-scenario">Scénario</Label>
          <Select
            value={scenarioId ?? undefined}
            onValueChange={setScenarioId}
          >
            <SelectTrigger id="tb-scenario" data-testid="tb-scenario">
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
          <Label htmlFor="tb-debut">Mois début</Label>
          <Input
            id="tb-debut"
            data-testid="tb-mois-debut"
            type="month"
            value={moisDebut}
            onChange={(e) => setPeriode(e.target.value, moisFin)}
          />
        </div>
        <div>
          <Label htmlFor="tb-fin">Mois fin</Label>
          <Input
            id="tb-fin"
            data-testid="tb-mois-fin"
            type="month"
            value={moisFin}
            onChange={(e) => setPeriode(moisDebut, e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <Label>CR (vide = tous du périmètre)</Label>
          <select
            multiple
            data-testid="tb-crs"
            className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm h-24"
            value={crIds}
            onChange={(e) =>
              setCrIds(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {crs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codeCr} — {c.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tb-attention">Seuil ATTENTION (%)</Label>
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
          />
        </div>
        <div>
          <Label htmlFor="tb-critique">Seuil CRITIQUE (%)</Label>
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
          />
        </div>
      </div>

      {erreurs.length > 0 && (
        <ul
          className="text-xs text-red-500 list-disc list-inside"
          data-testid="filtres-erreurs"
        >
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={onAnalyser}
          disabled={!peutAnalyser}
          data-testid="btn-analyser"
        >
          Analyser
        </Button>
        <Button
          variant="outline"
          onClick={onExporter}
          disabled={!peutAnalyser}
          data-testid="btn-exporter"
        >
          Exporter Excel
        </Button>
      </div>
    </div>
  );
}
