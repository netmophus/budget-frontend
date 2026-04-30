import { type ColumnDef } from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { ArrowLeft, ChevronRight, Eye, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FaitBudgetDetailDrawer } from '@/components/common/FaitBudgetDetailDrawer';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
  createFaitBudgetFromBusinessKeys,
  deleteFaitBudget,
  type FaitBudget,
  type FaitBudgetWithResolution,
  listFaitsBudget,
  type TypeTaux,
  updateFaitBudget,
} from '@/lib/api/budget';
import {
  type Compte,
  type CentreResponsabilite,
  type LigneMetier,
  type Produit,
  type Segment,
  type Structure,
  listComptes,
  listCrs,
  listDevises,
  listLignesMetier,
  listProduits,
  listSegments,
  listStructures,
  type Devise,
} from '@/lib/api/referentiels';
import { listScenarios, type Scenario } from '@/lib/api/scenarios';
import { getVersionByCode, type Version } from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassStatutVersion,
  badgeClassTypeVersion,
  formatDateFr,
  formatMontant,
  estPremierDuMois,
  libelleStatutVersion,
  libelleTypeVersion,
  premierDuMoisCourant,
} from '@/lib/labels/budget';

const ALL = '__all__';
const AUTO = '__auto__';
const PAGE_SIZE = 20;
const TYPES_TAUX_OPTIONS: { value: TypeTaux; libelle: string }[] = [
  { value: 'fixe_budgetaire', libelle: 'Fixe budgétaire' },
  { value: 'cloture', libelle: 'Clôture' },
  { value: 'moyen_mensuel', libelle: 'Moyen mensuel' },
];

interface FormState {
  dateMetier: string;
  codeStructure: string;
  codeCentre: string;
  codeCompte: string;
  codeLigneMetier: string;
  codeProduit: string;
  codeSegment: string;
  codeDevise: string;
  codeScenario: string;
  montantDevise: string;
  tauxChangeApplique: string;
  montantFcfa: string;
  typeTaux: string; // includes AUTO
}

function emptyForm(): FormState {
  return {
    dateMetier: premierDuMoisCourant(),
    codeStructure: '',
    codeCentre: '',
    codeCompte: '',
    codeLigneMetier: '',
    codeProduit: '',
    codeSegment: '',
    codeDevise: 'XOF',
    codeScenario: '',
    montantDevise: '',
    tauxChangeApplique: '',
    montantFcfa: '',
    typeTaux: AUTO,
  };
}

function parseApiError(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const dataMsg =
      (err.response?.data as { message?: string | string[] } | undefined)
        ?.message;
    const message = Array.isArray(dataMsg)
      ? dataMsg.join(' ; ')
      : (dataMsg ?? err.message);
    return { status, message };
  }
  return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
}

interface MoisOption {
  value: string;
  libelle: string;
}

function buildMoisOptions(annee: number): MoisOption[] {
  const months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  return months.map((label, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: `${annee}-${m}`, libelle: `${label} ${annee}` };
  });
}

export function SaisieBudgetPage() {
  const navigate = useNavigate();
  const { codeVersion = '' } = useParams<{ codeVersion: string }>();
  const canSaisir = useHasPermission('BUDGET.SAISIR');

  const [version, setVersion] = useState<Version | null>(null);
  const [versionLoading, setVersionLoading] = useState(true);
  const [versionError, setVersionError] = useState<string | null>(null);

  // Référentiels chargés une fois.
  const [structures, setStructures] = useState<Structure[]>([]);
  const [centres, setCentres] = useState<CentreResponsabilite[]>([]);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [lignesMetier, setLignesMetier] = useState<LigneMetier[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [devises, setDevises] = useState<Devise[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // Tableau des lignes saisies
  const [lignes, setLignes] = useState<FaitBudget[]>([]);
  const [lignesTotal, setLignesTotal] = useState(0);
  const [lignesLoading, setLignesLoading] = useState(false);
  const [lignesPage, setLignesPage] = useState(1);
  const [filterScenario, setFilterScenario] = useState<string>(ALL);
  const [filterMois, setFilterMois] = useState<string>(ALL);
  const [filterCompte, setFilterCompte] = useState<string>(ALL);
  const [filterCentre, setFilterCentre] = useState<string>(ALL);

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Chargements

  useEffect(() => {
    if (!codeVersion) return;
    setVersionLoading(true);
    setVersionError(null);
    getVersionByCode(codeVersion)
      .then((v) => setVersion(v))
      .catch((err) => {
        const { status } = parseApiError(err);
        setVersionError(
          status === 404
            ? `La version ${codeVersion} n'existe pas.`
            : 'Impossible de charger la version.',
        );
      })
      .finally(() => setVersionLoading(false));
  }, [codeVersion]);

  useEffect(() => {
    Promise.all([
      listStructures({ versionCouranteUniquement: true, limit: 200 }),
      listCrs({ versionCouranteUniquement: true, limit: 200 }),
      // limit max=200 côté backend (cf. ListComptesQueryDto @Max(200)).
      // Le filtre estCompteCollectif=false ne ramène que les comptes
      // feuilles, ce qui tient largement dans 200 lignes pour un PCB
      // UMOA standard.
      listComptes({
        versionCouranteUniquement: true,
        estCompteCollectif: false,
        limit: 200,
      }),
      listLignesMetier({ versionCouranteUniquement: true, limit: 200 }),
      listProduits({ versionCouranteUniquement: true, limit: 200 }),
      listSegments({ versionCouranteUniquement: true, limit: 200 }),
      listDevises({ estActive: true, limit: 50 }),
      listScenarios({ statut: 'actif', limit: 50 }),
    ])
      .then(([str, cr, cpt, lm, prd, seg, dvs, scn]) => {
        setStructures(str.items);
        setCentres(cr.items);
        setComptes(cpt.items);
        setLignesMetier(lm.items);
        setProduits(prd.items);
        setSegments(seg.items);
        setDevises(dvs.items);
        setScenarios(scn.items);
        // Auto-default scenario CENTRAL si présent
        setForm((f) => ({
          ...f,
          codeScenario:
            f.codeScenario ||
            (scn.items.find((s) => s.codeScenario === 'CENTRAL')
              ?.codeScenario ?? scn.items[0]?.codeScenario ?? ''),
        }));
      })
      .catch(() => toast.error('Impossible de charger les référentiels'));
  }, []);

  useEffect(() => {
    if (!codeVersion) return;
    setLignesLoading(true);
    listFaitsBudget({
      codeVersion,
      codeScenario: filterScenario === ALL ? undefined : filterScenario,
      annee:
        filterMois === ALL ? undefined : Number(filterMois.split('-')[0]),
      mois:
        filterMois === ALL ? undefined : Number(filterMois.split('-')[1]),
      page: lignesPage,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        // Filtrage client supplémentaire sur compte / CR (pas exposé côté backend)
        const items = res.items.filter((l) => {
          if (filterCompte !== ALL && l.compte?.code !== filterCompte) return false;
          if (filterCentre !== ALL && l.centre?.code !== filterCentre) return false;
          return true;
        });
        setLignes(items);
        setLignesTotal(
          filterCompte === ALL && filterCentre === ALL
            ? res.total
            : items.length,
        );
      })
      .catch(() => toast.error('Impossible de charger les lignes saisies'))
      .finally(() => setLignesLoading(false));
  }, [
    codeVersion,
    filterScenario,
    filterMois,
    filterCompte,
    filterCentre,
    lignesPage,
    refreshKey,
  ]);

  useEffect(() => {
    setLignesPage(1);
  }, [filterScenario, filterMois, filterCompte, filterCentre]);

  // ─── Logiques calculées

  const isPivotXof = form.codeDevise === 'XOF';
  const versionOuverte = version?.statut === 'ouvert';
  const canSubmit =
    !!version &&
    versionOuverte &&
    canSaisir &&
    !submitting &&
    !!form.codeStructure &&
    !!form.codeCentre &&
    !!form.codeCompte &&
    !!form.codeLigneMetier &&
    !!form.codeProduit &&
    !!form.codeSegment &&
    !!form.codeDevise &&
    !!form.codeScenario &&
    !!form.dateMetier &&
    form.montantDevise.trim() !== '' &&
    Number(form.montantDevise) >= 0;

  // Auto-fill montantFcfa quand XOF + montantDevise saisi
  useEffect(() => {
    if (isPivotXof && form.montantDevise) {
      setForm((f) =>
        f.montantFcfa === f.montantDevise
          ? f
          : { ...f, montantFcfa: form.montantDevise },
      );
    }
  }, [isPivotXof, form.montantDevise]);

  const moisOptions = useMemo(() => {
    if (!version) return [];
    return buildMoisOptions(version.exerciceFiscal);
  }, [version]);

  // ─── Soumission

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        dateMetier: form.dateMetier,
        codeStructure: form.codeStructure,
        codeCentre: form.codeCentre,
        codeCompte: form.codeCompte,
        codeLigneMetier: form.codeLigneMetier,
        codeProduit: form.codeProduit,
        codeSegment: form.codeSegment,
        codeDevise: form.codeDevise,
        codeVersion,
        codeScenario: form.codeScenario,
        montantDevise: Number(form.montantDevise),
        ...(form.tauxChangeApplique
          ? { tauxChangeApplique: Number(form.tauxChangeApplique) }
          : {}),
        ...(form.montantFcfa
          ? { montantFcfa: Number(form.montantFcfa) }
          : {}),
        ...(form.typeTaux !== AUTO
          ? { typeTaux: form.typeTaux as TypeTaux }
          : {}),
      };
      const res: FaitBudgetWithResolution =
        await createFaitBudgetFromBusinessKeys(payload);
      toast.success(
        `Ligne enregistrée — ${formatMontant(res.montantFcfa, 'XOF')} FCFA`,
      );
      // Reset partiel : garde codeScenario, codeDevise, dateMetier, axes choisis
      setForm((f) => ({
        ...emptyForm(),
        codeScenario: f.codeScenario,
        codeDevise: f.codeDevise,
        dateMetier: f.dateMetier,
      }));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(
          'Une ligne identique existe déjà pour ce grain (10 axes + même date). ' +
            "Modifiez l'un des axes ou supprimez l'ancienne ligne.",
        );
      } else if (status === 422) {
        toast.error(message);
      } else if (status === 404) {
        toast.error(
          message ||
            "Un des codes business n'existe pas. Vérifiez vos sélections.",
        );
      } else if (status === 400) {
        toast.error(message);
      } else {
        toast.error(message || "Échec de l'enregistrement.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Colonnes du tableau

  const columns: ColumnDef<FaitBudget, unknown>[] = [
    {
      accessorKey: 'temps.date',
      header: 'Date',
      cell: ({ row }) => formatDateFr(row.original.temps?.date ?? null),
    },
    {
      accessorKey: 'compte.code',
      header: 'Compte',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.compte?.code ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'centre.code',
      header: 'CR',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.centre?.code ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'devise.code',
      header: 'Devise',
      cell: ({ row }) => row.original.devise?.code ?? '—',
    },
    {
      accessorKey: 'montantDevise',
      header: 'Montant devise',
      cell: ({ row }) => (
        <span className="text-right block tabular-nums">
          {formatMontant(
            row.original.montantDevise,
            row.original.devise?.code ?? 'XOF',
          )}
        </span>
      ),
    },
    {
      accessorKey: 'montantFcfa',
      header: 'Montant FCFA',
      cell: ({ row }) => (
        <span className="text-right block font-bold tabular-nums">
          {formatMontant(row.original.montantFcfa, 'XOF')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDrawerId(row.original.id);
          }}
          aria-label="Voir le détail"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const totalFcfaAffiche = useMemo(
    () => lignes.reduce((acc, l) => acc + Number(l.montantFcfa), 0),
    [lignes],
  );

  // ─── Render

  if (versionLoading) {
    return (
      <div className="text-sm text-(--muted-foreground) p-4">
        Chargement de la version…
      </div>
    );
  }
  if (versionError || !version) {
    return (
      <div className="space-y-4">
        <PageHeader title="Saisie budget" />
        <div className="rounded-md border border-(--destructive) bg-(--destructive)/10 p-4 text-sm">
          {versionError ?? 'Version introuvable.'}
        </div>
        <Button variant="outline" onClick={() => navigate('/budget/versions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste des versions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-(--muted-foreground)">
        <button
          type="button"
          onClick={() => navigate('/budget/versions')}
          className="hover:text-(--foreground) hover:underline"
        >
          Versions
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-(--foreground) font-mono">
          {version.codeVersion}
        </span>
      </nav>

      <PageHeader
        title={`Saisie budget — ${version.libelle}`}
        description={`Exercice ${version.exerciceFiscal} • ${
          version.libelle
        } • Statut :`}
        actions={
          <div className="flex items-center gap-2">
            <Badge className={badgeClassTypeVersion(version.typeVersion)}>
              {libelleTypeVersion(version.typeVersion)}
            </Badge>
            <Badge className={badgeClassStatutVersion(version.statut)}>
              {libelleStatutVersion(version.statut)}
            </Badge>
            <Button variant="outline" onClick={() => navigate('/budget/versions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        }
      />

      {!versionOuverte && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-4 text-sm">
          Cette version est en statut <strong>{version.statut}</strong> — la
          saisie n'est pas autorisée. Le workflow soumettre / valider / geler
          arrivera en Lot 3.3.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* PANNEAU GAUCHE — Formulaire (40%) */}
        <div className="lg:col-span-2 space-y-4 rounded-md border border-(--border) bg-(--background) p-4">
          <h2 className="text-base font-semibold">Nouvelle ligne</h2>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dateMetier">Date métier</Label>
              <Input
                id="dateMetier"
                type="date"
                value={form.dateMetier}
                onChange={(e) =>
                  setForm({ ...form, dateMetier: e.target.value })
                }
                disabled={!versionOuverte}
              />
              <p className="text-xs text-(--muted-foreground)">
                1<sup>er</sup> du mois (ex. 2026-05-01) — la maille budgétaire
                est mensuelle.
                {form.dateMetier && !estPremierDuMois(form.dateMetier) && (
                  <span className="ml-1 text-yellow-600">
                    ⚠ La date doit être un 1<sup>er</sup>.
                  </span>
                )}
              </p>
            </div>

            <FormSelect
              id="codeStructure"
              label="Structure"
              value={form.codeStructure}
              onChange={(v) => setForm({ ...form, codeStructure: v })}
              disabled={!versionOuverte}
              options={structures.map((s) => ({
                value: s.codeStructure,
                libelle: `${s.codeStructure} — ${s.libelle}`,
                niveau: s.niveauHierarchique,
              }))}
            />

            <FormSelect
              id="codeCentre"
              label="Centre de responsabilité"
              value={form.codeCentre}
              onChange={(v) => setForm({ ...form, codeCentre: v })}
              disabled={!versionOuverte}
              options={centres.map((c) => ({
                value: c.codeCr,
                libelle: `${c.codeCr} — ${c.libelle}`,
              }))}
            />

            <FormSelect
              id="codeCompte"
              label="Compte (PCB)"
              value={form.codeCompte}
              onChange={(v) => setForm({ ...form, codeCompte: v })}
              disabled={!versionOuverte}
              options={comptes.map((c) => ({
                value: c.codeCompte,
                libelle: `${c.codeCompte} — ${c.libelle}`,
                niveau: c.niveau,
              }))}
            />

            <FormSelect
              id="codeLigneMetier"
              label="Ligne de métier"
              value={form.codeLigneMetier}
              onChange={(v) => setForm({ ...form, codeLigneMetier: v })}
              disabled={!versionOuverte}
              options={lignesMetier.map((l) => ({
                value: l.codeLigneMetier,
                libelle: `${l.codeLigneMetier} — ${l.libelle}`,
                niveau: l.niveau,
              }))}
            />

            <FormSelect
              id="codeProduit"
              label="Produit"
              value={form.codeProduit}
              onChange={(v) => setForm({ ...form, codeProduit: v })}
              disabled={!versionOuverte}
              options={produits.map((p) => ({
                value: p.codeProduit,
                libelle: `${p.codeProduit} — ${p.libelle} (${p.typeProduit})`,
              }))}
            />

            <FormSelect
              id="codeSegment"
              label="Segment"
              value={form.codeSegment}
              onChange={(v) => setForm({ ...form, codeSegment: v })}
              disabled={!versionOuverte}
              options={segments.map((s) => ({
                value: s.codeSegment,
                libelle: `${s.codeSegment} — ${s.libelle}`,
              }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                id="codeDevise"
                label="Devise"
                value={form.codeDevise}
                onChange={(v) =>
                  setForm({
                    ...form,
                    codeDevise: v,
                    // Reset taux + fcfa si on bascule devise
                    tauxChangeApplique: v === 'XOF' ? '' : form.tauxChangeApplique,
                    montantFcfa: v === 'XOF' ? form.montantDevise : '',
                    typeTaux: v === 'XOF' ? AUTO : form.typeTaux,
                  })
                }
                disabled={!versionOuverte}
                options={devises.map((d) => ({
                  value: d.codeIso,
                  libelle: `${d.codeIso} — ${d.libelle}`,
                }))}
              />

              <FormSelect
                id="codeScenario"
                label="Scénario"
                value={form.codeScenario}
                onChange={(v) => setForm({ ...form, codeScenario: v })}
                disabled={!versionOuverte}
                options={scenarios.map((s) => ({
                  value: s.codeScenario,
                  libelle: `${s.codeScenario} — ${s.libelle}`,
                }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="montantDevise">
                Montant devise <span className="text-red-500">*</span>
              </Label>
              <Input
                id="montantDevise"
                type="number"
                step="0.0001"
                min="0"
                value={form.montantDevise}
                onChange={(e) =>
                  setForm({ ...form, montantDevise: e.target.value })
                }
                disabled={!versionOuverte}
                placeholder="ex. 1000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tauxChangeApplique">Taux de change</Label>
                <Input
                  id="tauxChangeApplique"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={isPivotXof ? '1' : form.tauxChangeApplique}
                  onChange={(e) =>
                    setForm({ ...form, tauxChangeApplique: e.target.value })
                  }
                  disabled={!versionOuverte || isPivotXof}
                  placeholder={isPivotXof ? '1' : 'auto si vide'}
                />
                <p className="text-xs text-(--muted-foreground)">
                  {isPivotXof
                    ? 'Devise pivot — taux fixé à 1.0.'
                    : 'Optionnel — auto-calculé via taux BCEAO si vide.'}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="montantFcfa">Montant FCFA</Label>
                <Input
                  id="montantFcfa"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.montantFcfa}
                  onChange={(e) =>
                    setForm({ ...form, montantFcfa: e.target.value })
                  }
                  disabled={!versionOuverte}
                  placeholder="auto si vide"
                />
                <p className="text-xs text-(--muted-foreground)">
                  Optionnel — calculé = montant × taux.
                </p>
              </div>
            </div>

            <FormSelect
              id="typeTaux"
              label="Type de taux"
              value={form.typeTaux}
              onChange={(v) => setForm({ ...form, typeTaux: v })}
              disabled={!versionOuverte || isPivotXof}
              options={[
                { value: AUTO, libelle: 'Auto (défaut selon version)' },
                ...TYPES_TAUX_OPTIONS.map((t) => ({
                  value: t.value,
                  libelle: t.libelle,
                })),
              ]}
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Enregistrement…' : 'Enregistrer la ligne'}
          </Button>
        </div>

        {/* PANNEAU DROIT — Lignes saisies (60%) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label>Scénario</Label>
              <Select
                value={filterScenario}
                onValueChange={setFilterScenario}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {scenarios.map((s) => (
                    <SelectItem key={s.codeScenario} value={s.codeScenario}>
                      {s.codeScenario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Mois</Label>
              <Select value={filterMois} onValueChange={setFilterMois}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {moisOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Compte</Label>
              <Select value={filterCompte} onValueChange={setFilterCompte}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {comptes.map((c) => (
                    <SelectItem key={c.codeCompte} value={c.codeCompte}>
                      {c.codeCompte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>CR</Label>
              <Select value={filterCentre} onValueChange={setFilterCentre}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tous</SelectItem>
                  {centres.map((c) => (
                    <SelectItem key={c.codeCr} value={c.codeCr}>
                      {c.codeCr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={lignes}
            total={lignesTotal}
            page={lignesPage}
            limit={PAGE_SIZE}
            isLoading={lignesLoading}
            onPageChange={setLignesPage}
            onRowClick={(l) => setDrawerId(l.id)}
          />

          {lignes.length > 0 && (
            <div className="flex justify-end text-sm">
              <span className="text-(--muted-foreground) mr-2">
                Total page :
              </span>
              <span className="font-bold tabular-nums">
                {formatMontant(totalFcfaAffiche, 'XOF')} FCFA
              </span>
            </div>
          )}
        </div>
      </div>

      <FaitBudgetDetailDrawer
        id={drawerId}
        onClose={() => setDrawerId(null)}
        canEditMesures={versionOuverte && canSaisir}
        onPatch={async (id, dto) => {
          await updateFaitBudget(id, dto);
          toast.success('Mesures modifiées.');
          setRefreshKey((k) => k + 1);
        }}
        canDelete={versionOuverte && useHasPermissionFlag('BUDGET.SUPPRIMER')}
        onDelete={async (id) => {
          await deleteFaitBudget(id);
          toast.success('Ligne supprimée.');
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

// ─── helpers internes

interface FormSelectOption {
  value: string;
  libelle: string;
  /** Optionnel — pour indentation hiérarchique. */
  niveau?: number;
}

function FormSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  options: FormSelectOption[];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span
                style={{
                  paddingLeft:
                    o.niveau !== undefined ? `${(o.niveau - 1) * 12}px` : 0,
                }}
              >
                {o.libelle}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Wrapper pour utilisation de useHasPermission dans le JSX inline (typage). */
function useHasPermissionFlag(code: string): boolean {
  return useHasPermission(code);
}
