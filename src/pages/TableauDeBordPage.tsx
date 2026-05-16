/**
 * TableauDeBordPage (Lot 3.6 + refonte Lot 7.3 V22 Charte v1).
 *
 * Version pleine page du tableau de bord indicateurs (route
 * /budget/tableau-de-bord, permission BUDGET.LIRE).
 *
 * Sélecteurs : version + scénario en haut, qui pilotent
 * `IndicateursContent` réutilisé du panel modal (composant
 * autonome qui contient PNB / MNI / Coef. exploitation et
 * éventuels drill-downs).
 *
 * Refonte V22 (pattern unifié V11–V21) :
 *  - Header custom : cercle BarChart3 catégorie REALISE (violet
 *    #5B4E91) + titre + sous-titre + badge Exercice à droite
 *  - Sélecteurs Version + Scénario en cadre gris bg-(--secondary)
 *  - Note métier "Maj. {dernier calcul}" reportée dans
 *    `IndicateursContent` (déjà géré). Ici, on se contente de
 *    fournir le contexte (versionId/scenarioId/exerciceFiscal).
 *  - Logique métier (chargement versions/scénarios, présélection
 *    MEDIAN, fallback contexte vide) 100 % préservée.
 */
import { BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { IndicateursContent } from '@/components/budget/indicateurs/IndicateursContent';
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
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            style={{ backgroundColor: '#5B4E911A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <BarChart3 className="w-5 h-5" style={{ color: '#5B4E91' }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Tableau de bord budgétaire
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Indicateurs consolidés PNB, MNI, coefficient d&apos;exploitation
              — drill-down par CR et comparaison scénarios
            </p>
          </div>
        </div>

        {/* Badge Exercice à droite */}
        <div className="bg-(--secondary) border border-(--border) px-3 py-1.5 rounded-md flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-(--muted-foreground) uppercase tracking-wider">
            Exercice
          </span>
          <span className="text-[13px] font-semibold tabular-nums">
            {versionCourante?.exerciceFiscal ?? '—'}
          </span>
        </div>
      </div>

      {/* ─── Sélecteurs en cadre gris ──────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <Label htmlFor="version-select" className="text-xs mb-1 block">
              Version
            </Label>
            <Select
              value={versionId ?? undefined}
              onValueChange={(v) => setVersionId(v)}
            >
              <SelectTrigger id="version-select" className="h-9 bg-white">
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

          <div>
            <Label htmlFor="scenario-select" className="text-xs mb-1 block">
              Scénario
            </Label>
            <Select
              value={scenarioId ?? undefined}
              onValueChange={(v) => setScenarioId(v)}
              disabled={!versionCourante || scenariosCompatibles.length === 0}
            >
              <SelectTrigger id="scenario-select" className="h-9 bg-white">
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
        </div>
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
            className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center"
            data-testid="tdb-pas-de-contexte"
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
              style={{ backgroundColor: '#5B4E9114' }}
              aria-hidden="true"
            >
              <BarChart3 className="w-7 h-7" style={{ color: '#5B4E91' }} />
            </div>
            <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
              Sélectionnez un contexte
            </div>
            <p className="text-xs text-(--muted-foreground) max-w-[420px] mx-auto leading-relaxed">
              Choisissez une version et un scénario pour afficher les
              indicateurs consolidés.
            </p>
          </div>
        )
      )}
    </div>
  );
}
