/**
 * TableauDeBordPage (Lot 3.6) — version pleine page du tableau de
 * bord indicateurs (route /budget/tableau-de-bord, permission
 * BUDGET.LIRE).
 *
 * Sélecteurs : version + scénario + exercice fiscal en haut, qui
 * pilotent `IndicateursContent` réutilisé du panel modal.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { IndicateursContent } from '@/components/budget/indicateurs/IndicateursContent';
import { PageHeader } from '@/components/common/PageHeader';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listScenarios, type Scenario } from '@/lib/api/scenarios';
import { listVersions, type Version } from '@/lib/api/versions';

export function TableauDeBordPage(): JSX.Element {
  const [versions, setVersions] = useState<Version[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      listVersions({ limit: 100, page: 1 }),
      listScenarios({ limit: 100, page: 1 }),
    ])
      .then(([v, s]) => {
        setVersions(v.items);
        setScenarios(s.items);
        if (v.items.length > 0) setVersionId(v.items[0]!.id);
      })
      .catch(() => toast.error('Impossible de charger versions/scénarios.'))
      .finally(() => setLoadingMeta(false));
  }, []);

  const versionCourante = useMemo(
    () => versions.find((v) => v.id === versionId) ?? null,
    [versions, versionId],
  );

  // Scénarios pertinents pour la version sélectionnée — les scénarios
  // sans exercice ou de l'exercice courant.
  const scenariosCompatibles = useMemo(() => {
    if (!versionCourante) return scenarios;
    return scenarios.filter(
      (s) =>
        s.exerciceFiscal === null ||
        s.exerciceFiscal === versionCourante.exerciceFiscal,
    );
  }, [scenarios, versionCourante]);

  // Première fois (ou changement de version) → présélectionner le
  // scénario MEDIAN_<exercice> s'il existe, sinon le premier compatible.
  useEffect(() => {
    if (!versionCourante) return;
    const median = scenariosCompatibles.find(
      (s) => s.typeScenario === 'central',
    );
    const choix = median ?? scenariosCompatibles[0] ?? null;
    setScenarioId(choix ? choix.id : null);
  }, [versionCourante, scenariosCompatibles]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tableau de bord budgétaire"
        description="Indicateurs consolidés (PNB, MNI, Coefficient d'exploitation) — drill-down par CR et comparaison scénarios."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="version-select">Version</Label>
          <Select
            value={versionId ?? undefined}
            onValueChange={(v) => setVersionId(v)}
          >
            <SelectTrigger id="version-select" className="w-72">
              <SelectValue
                placeholder={loadingMeta ? 'Chargement…' : 'Sélectionner'}
              />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.libelle} ({v.exerciceFiscal})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="scenario-select">Scénario</Label>
          <Select
            value={scenarioId ?? undefined}
            onValueChange={(v) => setScenarioId(v)}
            disabled={!versionCourante || scenariosCompatibles.length === 0}
          >
            <SelectTrigger id="scenario-select" className="w-72">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {scenariosCompatibles.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {versionCourante && (
          <div className="text-xs text-(--muted-foreground)">
            Exercice fiscal :{' '}
            <span className="font-mono font-semibold">
              {versionCourante.exerciceFiscal}
            </span>
          </div>
        )}
      </div>

      {versionCourante && scenarioId ? (
        <IndicateursContent
          versionId={versionCourante.id}
          scenarioId={scenarioId}
          exerciceFiscal={versionCourante.exerciceFiscal}
        />
      ) : (
        !loadingMeta && (
          <div
            className="rounded-md border border-dashed border-(--border) p-8 text-center text-sm text-(--muted-foreground)"
            data-testid="tdb-pas-de-contexte"
          >
            Sélectionnez une version et un scénario pour afficher les indicateurs.
          </div>
        )
      )}
    </div>
  );
}
