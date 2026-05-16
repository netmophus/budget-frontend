/**
 * SelecteurContexte (Lot 3.4) — barre sticky en haut de la page de
 * saisie budgétaire avec 4 dropdowns : version / scénario / CR /
 * classe.
 *
 * Le store Zustand `useBudgetGrilleStore` persiste les choix dans
 * localStorage. À l'ouverture de la page, on hydrate la sélection
 * depuis le store ; si vide, on auto-sélectionne :
 *  - la dernière version Brouillon (statut='ouvert')
 *  - le scénario MEDIAN (type='central')
 *  - le 1er CR du périmètre user
 *  - classe '6' (charges)
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listCrs,
  listLignesMetier,
  type CentreResponsabilite,
  type LigneMetier,
} from '@/lib/api/referentiels';
import { listScenarios, type Scenario } from '@/lib/api/scenarios';
import { listVersions, type Version } from '@/lib/api/versions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';

// UX A.3 — saisie budgétaire : seules les classes 6 (charges) et 7
// (produits) sont saisissables. Les classes 1-5 sont des comptes
// patrimoniaux (bilan), non concernés par le budget.
const CLASSES_OPTIONS: Array<{ value: string; libelle: string }> = [
  { value: '6', libelle: 'Classe 6 — Charges' },
  { value: '7', libelle: 'Classe 7 — Produits' },
];

export interface SelecteurContexteProps {
  /** Appelé quand le contexte change (versionId, scenarioId, crId, codeClasse). */
  onChange?: () => void;
}

export function SelecteurContexte({ onChange }: SelecteurContexteProps) {
  const {
    versionId,
    scenarioId,
    crId,
    ligneMetierId,
    codeClasse,
    setVersionId,
    setScenarioId,
    setCrId,
    setLigneMetierId,
    setCodeClasse,
  } = useBudgetGrilleStore();

  const [versions, setVersions] = useState<Version[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [crs, setCrs] = useState<CentreResponsabilite[]>([]);
  const [lignesMetier, setLignesMetier] = useState<LigneMetier[]>([]);
  const [loading, setLoading] = useState(true);

  // Chargement parallèle des 4 référentiels (Lot 3.4-bis : +ligne_metier)
  useEffect(() => {
    setLoading(true);
    Promise.all([
      listVersions({ limit: 200 }),
      listScenarios({ limit: 200, statut: 'actif' }),
      listCrs({ limit: 200 }),
      listLignesMetier({ limit: 200, versionCouranteUniquement: true }),
    ])
      .then(([resVers, resScen, resCr, resLm]) => {
        // Tri versions : par exercice DESC, puis libellé
        const versionsTries = [...resVers.items].sort((a, b) => {
          if (a.exerciceFiscal !== b.exerciceFiscal) {
            return b.exerciceFiscal - a.exerciceFiscal;
          }
          return a.libelle.localeCompare(b.libelle);
        });
        setVersions(versionsTries);
        setScenarios(resScen.items);
        setCrs(resCr.items);
        // Tri lignes_metier par code (les feuilles MVP sont mélangées
        // avec les agrégats — on prend tout pour le contexte de saisie,
        // les axes intermédiaires peuvent porter du budget).
        const lignesTriees = [...resLm.items]
          .filter((l) => l.estActif)
          .sort((a, b) => a.codeLigneMetier.localeCompare(b.codeLigneMetier));
        setLignesMetier(lignesTriees);

        // Auto-sélection si store vide
        if (!versionId) {
          const brouillon = versionsTries.find((v) => v.statut === 'ouvert');
          if (brouillon) setVersionId(brouillon.id);
        }
        if (!scenarioId) {
          const median = resScen.items.find((s) => s.typeScenario === 'central');
          if (median) setScenarioId(median.id);
        }
        if (!crId && resCr.items.length > 0) {
          setCrId(resCr.items[0]!.id);
        }
        if (!ligneMetierId && lignesTriees.length > 0) {
          setLigneMetierId(lignesTriees[0]!.id);
        }
      })
      .catch(() => toast.error('Impossible de charger le contexte de saisie'))
      .finally(() => setLoading(false));
    // versionId/scenarioId/crId/ligneMetierId volontairement hors
    // dépendance — hydratation initiale uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const versionSelectionnee = useMemo(
    () => versions.find((v) => v.id === versionId) ?? null,
    [versions, versionId],
  );

  function handleVersionChange(id: string) {
    setVersionId(id);
    onChange?.();
  }
  function handleScenarioChange(id: string) {
    setScenarioId(id);
    onChange?.();
  }
  function handleCrChange(id: string) {
    setCrId(id);
    onChange?.();
  }
  function handleLigneMetierChange(id: string) {
    setLigneMetierId(id);
    onChange?.();
  }
  function handleClasseChange(code: string) {
    setCodeClasse(code);
    onChange?.();
  }

  if (loading) {
    return (
      <div className="rounded-md border border-(--border) bg-(--card) p-3 text-sm text-(--muted-foreground)">
        Chargement du contexte de saisie…
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm">
        Aucune version disponible. L'admin doit en créer une via{' '}
        <a href="/budget/versions" className="underline text-(--primary)">
          /budget/versions
        </a>
        .
      </div>
    );
  }

  if (crs.length === 0) {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm">
        Aucun centre de responsabilité dans votre périmètre. Contactez
        l'administrateur pour vous attribuer un rôle.
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-10 bg-(--secondary) border border-(--border) rounded-md p-3 mb-4"
      data-testid="selecteur-contexte"
    >
      {/* Ligne 1 : Version + Scénario + Classe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
        <div>
          <Label htmlFor="version-select" className="text-xs mb-1 block">
            Version
          </Label>
          <Select
            value={versionId ?? undefined}
            onValueChange={handleVersionChange}
          >
            <SelectTrigger id="version-select" className="h-9 bg-white">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.libelle} ({v.exerciceFiscal})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {versionSelectionnee && versionSelectionnee.statut !== 'ouvert' && (
            <p className="text-[11px] text-(--miznas-cat-validation) mt-1">
              🔒 Version verrouillée (statut « {versionSelectionnee.statut} »)
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="scenario-select" className="text-xs mb-1 block">
            Scénario
          </Label>
          <Select
            value={scenarioId ?? undefined}
            onValueChange={handleScenarioChange}
          >
            <SelectTrigger id="scenario-select" className="h-9 bg-white">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="classe-select" className="text-xs mb-1 block">
            Classe de comptes
          </Label>
          <Select value={codeClasse} onValueChange={handleClasseChange}>
            <SelectTrigger id="classe-select" className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLASSES_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ligne 2 : CR + Ligne métier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div>
          <Label htmlFor="cr-select" className="text-xs mb-1 block">
            Centre de responsabilité
          </Label>
          <Select value={crId ?? undefined} onValueChange={handleCrChange}>
            <SelectTrigger id="cr-select" className="h-9 bg-white">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {crs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label
            htmlFor="ligne-metier-select"
            className="text-xs mb-1 block"
          >
            Ligne métier
          </Label>
          <Select
            value={ligneMetierId ?? undefined}
            onValueChange={handleLigneMetierChange}
          >
            <SelectTrigger
              id="ligne-metier-select"
              className="h-9 bg-white"
            >
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {lignesMetier.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lignesMetier.length === 0 && (
            <p className="text-[11px] text-(--miznas-ambre) mt-1">
              ⚠ Aucune ligne métier active. L&apos;admin doit en créer via{' '}
              <a
                href="/referentiels/lignes-metier"
                className="underline text-(--primary)"
              >
                Référentiels → Lignes métier
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
