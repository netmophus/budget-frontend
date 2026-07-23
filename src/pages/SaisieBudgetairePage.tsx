/**
 * SaisieBudgetairePage — page de saisie budgétaire (saisie focalisée
 * compte par compte). Seul écran de saisie depuis le retrait de
 * l'ancienne grille 12 mois (legacy).
 *
 *  - on sélectionne UN compte via autocomplétion (CompteCombobox,
 *    sans restriction parents/feuilles — politique BSIC) ;
 *  - on saisit un montant ANNUEL réparti automatiquement /12
 *    (reliquat d'arrondi sur décembre) OU 12 montants MENSUELS
 *    distincts (saisonnalité) ;
 *  - une justification optionnelle (≤250 car.) est répliquée dans le
 *    `commentaire` des 12 cellules ;
 *  - la sauvegarde n'envoie QUE la ligne du compte courant
 *    (POST /budget/grille — upsert par cellule, n'efface pas les
 *    autres lignes du CR) ;
 *  - un import en masse CSV/XLSX (ImportBudgetDialog, template 9
 *    colonnes) est accessible depuis l'en-tête.
 *
 * Le formulaire est piloté par le COMPTE sélectionné (et l'exercice),
 * pas par la grille : il s'affiche pour n'importe quel compte. La
 * grille n'est chargée qu'en best-effort pour pré-remplir les valeurs
 * déjà saisies. Grain mensuel en base : aucun changement de schéma.
 */
import { ArrowLeft, FileUp, Printer, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { CompteCombobox } from '@/components/budget/CompteCombobox';
import { ImportBudgetDialog } from '@/components/budget/ImportBudgetDialog';
import {
  LignesSaisiesTable,
  type LigneSaisieKey,
} from '@/components/budget/LignesSaisiesTable';
import { SoumissionDialog } from '@/components/budget/cr-workflow/SoumissionDialog';
import { StatutCrBanner } from '@/components/budget/cr-workflow/StatutCrBanner';
import { SelecteurContexte } from '@/components/budget/grille/SelecteurContexte';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getCrStatut,
  soumettreCr,
  type CrStatut,
} from '@/lib/api/cr-workflow';
import {
  getGrilleSaisie,
  saveGrilleSaisie,
  type GrilleLigne,
  type GrilleSaisie,
} from '@/lib/api/budget-grille';
import { listLignesMetier, type Compte } from '@/lib/api/referentiels';
import { getVersionById } from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';

type ModeSaisieUi = 'annuel' | 'mensuel';
const MODE_STORAGE_KEY = 'miznas-saisie-mode-hybride';
const VUE_STORAGE_KEY = 'miznas-saisie-vue-consolidee';
const JUSTIF_MAX = 250;

/** Ouvre la vue d'impression du CR (palier 7) dans un nouvel onglet. */
function ouvrirImpressionCr(crCode: string, versionId: string): void {
  window.open(
    `/budget/comite/cr/${encodeURIComponent(
      crCode,
    )}/impression?versionId=${encodeURIComponent(versionId)}`,
    '_blank',
    'noopener',
  );
}
const MOIS_FR = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
];

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Répartit un montant annuel sur 12 mois, reliquat d'arrondi sur décembre. */
function repartirAnnuel(annuel: number): number[] {
  const base = Math.round((annuel / 12) * 10000) / 10000;
  const mois = Array.from({ length: 12 }, () => base);
  mois[11] = Math.round((annuel - base * 11) * 10000) / 10000;
  return mois;
}

function chargerMode(): ModeSaisieUi {
  const v =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(MODE_STORAGE_KEY)
      : null;
  return v === 'mensuel' ? 'mensuel' : 'annuel';
}

/** Vue consolidée (toutes LM) mémorisée par utilisateur via localStorage. */
function chargerVueConsolidee(): boolean {
  return (
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(VUE_STORAGE_KEY) === '1'
  );
}

/**
 * Sous-ensemble du compte réellement utilisé par le formulaire — permet
 * de réhydrater l'édition depuis une ligne de grille (qui n'expose pas
 * tout le DimCompte) sans reconstruire un Compte complet.
 */
type CompteSaisi = Pick<
  Compte,
  'id' | 'codeCompte' | 'libelle' | 'estCompteCollectif'
>;

export function SaisieBudgetairePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retourValidations = searchParams.get('retour') === 'validations';
  const canSaisir = useHasPermission('BUDGET.SAISIR');
  const canSoumettre = useHasPermission('BUDGET.SOUMETTRE');
  const { versionId, scenarioId, crId, ligneMetierId, codeClasse, setLigneMetierId } =
    useBudgetGrilleStore();

  const [importOuvert, setImportOuvert] = useState(false);
  // Statut de validation du CR courant (workflow par CR).
  const [crStatut, setCrStatut] = useState<CrStatut | null>(null);
  const [soumissionOuvert, setSoumissionOuvert] = useState(false);
  const [exerciceFiscal, setExerciceFiscal] = useState<number | null>(null);
  const [statutVersion, setStatutVersion] = useState<string | null>(null);
  const [grille, setGrille] = useState<GrilleSaisie | null>(null);

  // Vue consolidée : tableau récap toutes lignes métier (sinon LM courante).
  const [vueConsolidee, setVueConsolidee] = useState<boolean>(chargerVueConsolidee);
  // Ids des LM actives (pour la boucle de chargement en vue consolidée).
  const [lmIds, setLmIds] = useState<string[]>([]);

  // Édition d'une ligne existante (null = création d'une nouvelle ligne).
  const [editingKey, setEditingKey] = useState<LigneSaisieKey | null>(null);
  // Miroir synchrone d'editingKey : permet à l'effet de changement de
  // contexte de NE PAS réinitialiser la sélection pendant une édition
  // (cas vue consolidée où Modifier bascule la LM du contexte).
  const editingKeyRef = useRef<LigneSaisieKey | null>(null);
  // Ligne en attente de confirmation de suppression.
  const [confirmDelete, setConfirmDelete] = useState<GrilleLigne | null>(null);
  // Pagination du tableau récapitulatif.
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);

  const [selectedCompte, setSelectedCompte] = useState<CompteSaisi | null>(null);
  const [mode, setMode] = useState<ModeSaisieUi>(chargerMode);
  const [montantAnnuel, setMontantAnnuel] = useState(0);
  const [montants, setMontants] = useState<number[]>(() => Array(12).fill(0));
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmBascule, setConfirmBascule] = useState(false);
  const compteInputRef = useRef<HTMLDivElement>(null);
  // Saisie rapide : armé par le commit clavier (Enter/Tab) du compte,
  // consommé par l'effet ci-dessous pour focus le 1ᵉʳ champ montant une
  // fois le formulaire rendu. Non armé sur sélection par clic.
  const focusMontantRef = useRef(false);

  // Auto-avance focus : après un commit clavier du compte, le formulaire
  // de saisie apparaît → on focus son 1ᵉʳ champ montant (selon le mode).
  useEffect(() => {
    if (!selectedCompte || !focusMontantRef.current) return;
    focusMontantRef.current = false;
    const sel =
      mode === 'annuel'
        ? '#hybride-annuel'
        : '[data-testid="hybride-mois-0"]';
    document.querySelector<HTMLInputElement>(sel)?.focus();
  }, [selectedCompte, mode]);

  // Résout l'exercice fiscal + le statut depuis la version sélectionnée.
  useEffect(() => {
    if (!versionId) {
      setExerciceFiscal(null);
      setStatutVersion(null);
      return;
    }
    let annule = false;
    getVersionById(versionId)
      .then((v) => {
        if (!annule) {
          setExerciceFiscal(v.exerciceFiscal);
          setStatutVersion(v.statut);
        }
      })
      .catch(() => {
        if (!annule) {
          setExerciceFiscal(new Date().getFullYear() + 1);
          setStatutVersion(null);
        }
      });
    return () => {
      annule = true;
    };
  }, [versionId]);

  // Statut de validation du CR courant (workflow par CR). Le crCode
  // provient de la grille chargée (best-effort).
  const crCode = grille?.cr.codeCr ?? null;
  function rafraichirStatutCr(): void {
    if (!crCode || !versionId) {
      setCrStatut(null);
      return;
    }
    getCrStatut(crCode, versionId)
      .then(setCrStatut)
      .catch(() => setCrStatut(null));
  }
  useEffect(() => {
    rafraichirStatutCr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crCode, versionId]);

  const contexteComplet =
    !!versionId &&
    !!scenarioId &&
    !!crId &&
    !!ligneMetierId &&
    exerciceFiscal !== null;

  // 12 mois canoniques (YYYY-MM-01) dérivés de l'exercice — indépendant
  // de la grille, pour que le formulaire s'affiche toujours.
  const moisKeys = useMemo(() => {
    if (exerciceFiscal === null) return [];
    return Array.from(
      { length: 12 },
      (_, i) => `${exerciceFiscal}-${String(i + 1).padStart(2, '0')}-01`,
    );
  }, [exerciceFiscal]);

  // Grille : pré-remplissage du formulaire + source du tableau récap.
  // En vue consolidée, on charge la grille de CHAQUE LM active (l'API
  // exige un ligne_metier) puis on fusionne les lignes — aucun appel
  // backend modifié. Son échec n'empêche pas la saisie.
  function reloadGrille(): void {
    if (!contexteComplet) {
      setGrille(null);
      return;
    }
    if (vueConsolidee && lmIds.length > 0) {
      Promise.all(
        lmIds.map((lmId) =>
          getGrilleSaisie({
            versionId: versionId!,
            scenarioId: scenarioId!,
            crId: crId!,
            ligneMetierId: lmId,
            exerciceFiscal: exerciceFiscal!,
          }).catch(() => null),
        ),
      ).then((resultats) => {
        const ok = resultats.filter((g): g is GrilleSaisie => g !== null);
        if (ok.length === 0) {
          setGrille(null);
          return;
        }
        setGrille({ ...ok[0]!, lignes: ok.flatMap((g) => g.lignes) });
      });
      return;
    }
    getGrilleSaisie({
      versionId: versionId!,
      scenarioId: scenarioId!,
      crId: crId!,
      ligneMetierId: ligneMetierId!,
      exerciceFiscal: exerciceFiscal!,
    })
      .then((g) => setGrille(g))
      .catch(() => setGrille(null));
  }

  // Chargement des LM actives (univers de la boucle consolidée).
  useEffect(() => {
    listLignesMetier({ limit: 200, versionCouranteUniquement: true })
      .then((res) =>
        setLmIds(res.items.filter((l) => l.estActif).map((l) => l.id)),
      )
      .catch(() => setLmIds([]));
  }, []);

  // Maintient editingKeyRef aligné sur editingKey (notamment aux clears).
  useEffect(() => {
    editingKeyRef.current = editingKey;
  }, [editingKey]);

  // Changement de contexte : recharge la grille. On ne réinitialise PAS
  // la sélection pendant une édition (la bascule de LM en vue consolidée
  // change ligneMetierId mais ne doit pas fermer le formulaire).
  useEffect(() => {
    reloadGrille();
    if (!editingKeyRef.current) setSelectedCompte(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, scenarioId, crId, ligneMetierId, exerciceFiscal]);

  // Bascule de vue (ou arrivée des LM) : recharge la grille sans toucher
  // à la sélection courante.
  useEffect(() => {
    reloadGrille();
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vueConsolidee, lmIds]);

  // À la sélection d'un compte : pré-remplit depuis la grille si la ligne
  // existe (pour la LM ciblée), sinon part de zéro.
  useEffect(() => {
    if (!selectedCompte) return;
    const targetLm = editingKey ? editingKey.ligneMetierId : ligneMetierId;
    const ligne =
      grille?.lignes.find(
        (l) => l.compte.id === selectedCompte.id && l.ligneMetier.id === targetLm,
      ) ?? null;
    if (ligne && moisKeys.length === 12) {
      const parMois = new Map(ligne.cellules.map((c) => [c.mois, c]));
      const vals = moisKeys.map((m) => parMois.get(m)?.montant ?? 0);
      setMontants(vals);
      setMontantAnnuel(vals.reduce((s, v) => s + v, 0));
      setJustification(
        ligne.cellules.find((c) => c.commentaire)?.commentaire ?? '',
      );
    } else {
      setMontants(Array(12).fill(0));
      setMontantAnnuel(0);
      setJustification('');
    }
  }, [selectedCompte, grille, moisKeys, editingKey, ligneMetierId]);

  const versionVerrouillee =
    statutVersion !== null && statutVersion !== 'ouvert';
  // CR verrouillé dès qu'il est soumis ou validé (workflow par CR).
  const crVerrouille =
    crStatut !== null &&
    (crStatut.statut === 'SOUMIS' || crStatut.statut === 'VALIDE');
  const readOnly = !canSaisir || versionVerrouillee || crVerrouille;

  const totalMensuel = useMemo(
    () => montants.reduce((s, v) => s + v, 0),
    [montants],
  );

  function setMode2(next: ModeSaisieUi): void {
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setMode(next);
  }

  function demanderBascule(next: ModeSaisieUi): void {
    if (next === mode) return;
    if (next === 'mensuel') {
      setMontants(repartirAnnuel(montantAnnuel));
      setMode2('mensuel');
      return;
    }
    const uniformes = montants.every((v) => v === montants[0]);
    if (uniformes) {
      setMontantAnnuel(totalMensuel);
      setMode2('annuel');
    } else {
      setConfirmBascule(true);
    }
  }

  function confirmerBasculeAnnuel(): void {
    setMontantAnnuel(totalMensuel);
    setMode2('annuel');
    setConfirmBascule(false);
  }

  function onMontantAnnuelChange(v: string): void {
    const n = Number(v.replace(',', '.'));
    const annuel = Number.isFinite(n) ? n : 0;
    setMontantAnnuel(annuel);
    setMontants(repartirAnnuel(annuel));
  }

  function onMontantMensuelChange(index: number, v: string): void {
    const n = Number(v.replace(',', '.'));
    setMontants((prev) => {
      const next = [...prev];
      next[index] = Number.isFinite(n) ? n : 0;
      return next;
    });
  }

  function reset(): void {
    setSelectedCompte(null);
    setMontants(Array(12).fill(0));
    setMontantAnnuel(0);
    setJustification('');
  }

  async function enregistrer(ajouterAutre: boolean): Promise<void> {
    if (
      !selectedCompte ||
      readOnly ||
      !versionId ||
      !scenarioId ||
      !crId ||
      !ligneMetierId ||
      moisKeys.length !== 12
    ) {
      return;
    }
    const valeurs = mode === 'annuel' ? repartirAnnuel(montantAnnuel) : montants;
    const justif = justification.trim() || null;
    const cellules = moisKeys.map((mois, i) => ({
      mois,
      montant: valeurs[i] ?? 0,
      modeSaisie: 'MONTANT' as const,
      commentaire: justif,
    }));
    setSaving(true);
    try {
      const res = await saveGrilleSaisie({
        versionId,
        scenarioId,
        crId,
        lignes: [
          {
            compteId: selectedCompte.id,
            ligneMetierId,
            cellules,
          },
        ],
      });
      if (res.erreurs.length > 0) {
        toast.error(`Saisie refusée : ${res.erreurs[0]!.message}`);
        return;
      }
      toast.success(
        `Compte ${selectedCompte.codeCompte} enregistré (${
          res.inserees + res.modifiees
        } cellule(s)).`,
      );
      reloadGrille();
      reset();
      setEditingKey(null);
      if (ajouterAutre) {
        compteInputRef.current
          ?.querySelector<HTMLInputElement>('input')
          ?.focus();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la sauvegarde : ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  // ─── Tableau récapitulatif : lignes réellement saisies ────────────
  // On filtre la grille (qui contient TOUS les comptes éligibles) sur
  // celles ayant au moins une cellule persistée (ligneId != null).
  // Vue consolidée : tri LM puis code compte ; sinon code compte.
  // (L'ordre de création n'est pas exposé par GET /budget/grille.)
  const lignesSaisies = useMemo<GrilleLigne[]>(() => {
    if (!grille) return [];
    return grille.lignes
      .filter((l) => l.cellules.some((c) => c.ligneId !== null))
      .sort((a, b) => {
        if (vueConsolidee) {
          const parLm = a.ligneMetier.codeLigneMetier.localeCompare(
            b.ligneMetier.codeLigneMetier,
          );
          if (parLm !== 0) return parLm;
        }
        return a.compte.codeCompte.localeCompare(b.compte.codeCompte);
      });
  }, [grille, vueConsolidee]);

  // ─── Soumission du CR au validateur (workflow par CR) ─────────────
  const recapSoumission = useMemo(() => {
    const produits = lignesSaisies
      .filter((l) => l.compte.classe === '7')
      .reduce((s, l) => s + l.totalAnnee, 0);
    const charges = lignesSaisies
      .filter((l) => l.compte.classe === '6')
      .reduce((s, l) => s + l.totalAnnee, 0);
    return {
      nbLignes: lignesSaisies.length,
      totalProduits: produits,
      totalCharges: charges,
      pnb: produits - charges,
    };
  }, [lignesSaisies]);

  async function handleSoumettre(commentaire?: string): Promise<void> {
    if (!crCode || !versionId) return;
    try {
      await soumettreCr(crCode, versionId, commentaire);
      toast.success(`CR ${crCode} soumis au validateur.`);
      rafraichirStatutCr();
      reloadGrille();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la soumission : ${msg}`);
      throw err; // garde la modale ouverte
    }
  }

  // ─── Édition d'une ligne existante ────────────────────────────────
  function modifierLigne(ligne: GrilleLigne): void {
    // Ref synchrone AVANT tout setState : l'effet de changement de
    // contexte (déclenché par la bascule de LM ci-dessous en vue
    // consolidée) doit voir qu'une édition est en cours.
    editingKeyRef.current = {
      compteId: ligne.compte.id,
      ligneMetierId: ligne.ligneMetier.id,
    };
    setEditingKey({
      compteId: ligne.compte.id,
      ligneMetierId: ligne.ligneMetier.id,
    });
    // Vue consolidée : bascule la LM du contexte sur celle de la ligne.
    if (vueConsolidee && ligne.ligneMetier.id !== ligneMetierId) {
      setLigneMetierId(ligne.ligneMetier.id);
    }
    setSelectedCompte({
      id: ligne.compte.id,
      codeCompte: ligne.compte.codeCompte,
      libelle: ligne.compte.libelle,
      estCompteCollectif: false,
    });
    // Déduit le mode pour afficher le bon onglet (le pré-remplissage des
    // montants/justification est géré par l'effet sur selectedCompte).
    const parMois = new Map(ligne.cellules.map((c) => [c.mois, c.montant]));
    const vals = moisKeys.map((m) => parMois.get(m) ?? 0);
    const uniforme =
      vals.length === 12 && vals.slice(0, 11).every((v) => v === vals[0]);
    setMode(uniforme ? 'annuel' : 'mensuel');
    // Remonter au formulaire (no-op silencieux sous jsdom).
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0 });
      } catch {
        /* jsdom : scrollTo non implémenté */
      }
    }
  }

  function annulerEdition(): void {
    setEditingKey(null);
    reset();
  }

  // ─── Suppression d'une ligne (POST 12 cellules à 0 → suppression) ──
  async function confirmerSuppression(): Promise<void> {
    const ligne = confirmDelete;
    if (
      !ligne ||
      !versionId ||
      !scenarioId ||
      !crId ||
      moisKeys.length !== 12
    ) {
      setConfirmDelete(null);
      return;
    }
    const cellules = moisKeys.map((mois) => ({
      mois,
      montant: 0,
      modeSaisie: 'MONTANT' as const,
      commentaire: null,
    }));
    try {
      const res = await saveGrilleSaisie({
        versionId,
        scenarioId,
        crId,
        lignes: [
          {
            compteId: ligne.compte.id,
            ligneMetierId: ligne.ligneMetier.id,
            cellules,
          },
        ],
      });
      toast.success(
        `Ligne ${ligne.compte.codeCompte} supprimée (${res.supprimees} cellule(s)).`,
      );
      if (
        editingKey?.compteId === ligne.compte.id &&
        editingKey?.ligneMetierId === ligne.ligneMetier.id
      ) {
        setEditingKey(null);
        reset();
      }
      reloadGrille();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la suppression : ${msg}`);
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {retourValidations && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 mb-3 gap-1.5 -ml-2"
          onClick={() => navigate('/budget/validations')}
          data-testid="retour-validations"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux validations
        </Button>
      )}

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight m-0">
            Saisie budgétaire
          </h3>
          <p className="text-sm text-(--muted-foreground) mt-0.5">
            Saisie focalisée compte par compte — mode annuel (réparti /12)
            ou mensuel
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {crCode && versionId && (
            <Button
              variant="outline"
              onClick={() => ouvrirImpressionCr(crCode, versionId)}
              data-testid="saisie-imprimer"
              title="Imprimer la saisie de ce CR"
              className="h-9 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer ma saisie
            </Button>
          )}
          {canSoumettre && crStatut?.statut === 'EN_SAISIE' && (
            <Button
              onClick={() => setSoumissionOuvert(true)}
              disabled={!contexteComplet || recapSoumission.nbLignes === 0}
              title={
                recapSoumission.nbLignes === 0
                  ? 'Saisissez au moins une ligne avant de soumettre'
                  : 'Soumettre la saisie de ce CR au validateur'
              }
              data-testid="cr-soumettre"
              className="h-9 gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              Soumettre au validateur
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setImportOuvert(true)}
            disabled={!contexteComplet || readOnly}
            title={
              !contexteComplet
                ? 'Sélectionnez un contexte (version, scénario, CR…) avant d’importer'
                : readOnly
                  ? 'Saisie verrouillée — import impossible'
                  : 'Importer un fichier CSV ou XLSX'
            }
            data-testid="hybride-import"
            className="h-9 gap-1.5"
          >
            <FileUp className="w-3.5 h-3.5" />
            Importer Excel
          </Button>
        </div>
      </div>

      {/* ─── Bandeau de statut du CR (workflow par CR) ──────────── */}
      {crStatut && <StatutCrBanner statut={crStatut} />}

      {/* ─── Bandeau mode édition ───────────────────────────────── */}
      {editingKey && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-2 text-sm"
          role="status"
          data-testid="hybride-edition-banner"
        >
          <span>
            ✏️ <strong>Mode édition</strong> — ligne{' '}
            <span className="font-mono">{selectedCompte?.codeCompte}</span>.
            Modifiez les valeurs puis « Mettre à jour ».
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0"
            onClick={annulerEdition}
            data-testid="hybride-annuler-edition"
          >
            Annuler l’édition
          </Button>
        </div>
      )}

      <SelecteurContexte />

      {/* ─── Filtre compte ──────────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3.5 mb-4">
        <Label htmlFor="hybride-compte" className="text-xs mb-1 block">
          Compte à saisir
        </Label>
        <div ref={compteInputRef} className="max-w-xl">
          <CompteCombobox
            id="hybride-compte"
            value={selectedCompte?.codeCompte ?? ''}
            onChange={(code) => {
              if (!code) setSelectedCompte(null);
            }}
            onSelectCompte={setSelectedCompte}
            onCommit={() => {
              focusMontantRef.current = true;
            }}
            classes={[codeClasse]}
            inclureCollectifs
            disabled={!contexteComplet}
          />
        </div>
      </div>

      {versionVerrouillee && (
        <div
          className="rounded-md border border-(--miznas-cat-validation)/40 bg-(--miznas-cat-validation)/5 p-3 text-sm mb-4"
          data-testid="hybride-verrou"
        >
          🔒 Version « {statutVersion} » — saisie en lecture seule.
        </div>
      )}

      {!selectedCompte && (
        <div
          className="bg-white border border-dashed border-(--border) rounded-lg py-12 px-7 text-center text-sm text-(--muted-foreground)"
          data-testid="hybride-vide"
        >
          Sélectionnez un compte pour commencer la saisie.
        </div>
      )}

      {selectedCompte && (
        <div
          className="bg-white border border-(--border) rounded-md p-4 space-y-4"
          data-testid="hybride-form"
        >
          <div className="text-sm font-semibold">
            <span className="font-mono">{selectedCompte.codeCompte}</span>
            <span className="mx-2 text-(--muted-foreground)">—</span>
            {selectedCompte.libelle}
          </div>

          {selectedCompte.estCompteCollectif && (
            <div
              className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 p-2.5 text-xs"
              data-testid="hybride-collectif-hint"
            >
              ⚠ Compte agrégé (parent). La saisie peut être refusée par le
              contrôle budgétaire backend selon la configuration en vigueur.
            </div>
          )}

          {/* Sélecteur de mode */}
          <fieldset className="flex gap-5" disabled={readOnly}>
            <legend className="sr-only">Mode de saisie</legend>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="mode-saisie"
                checked={mode === 'annuel'}
                onChange={() => demanderBascule('annuel')}
                data-testid="hybride-mode-annuel"
                className="accent-(--primary)"
              />
              Saisie annuelle (réparti auto /12)
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="mode-saisie"
                checked={mode === 'mensuel'}
                onChange={() => demanderBascule('mensuel')}
                data-testid="hybride-mode-mensuel"
                className="accent-(--primary)"
              />
              Saisie mensuelle (12 montants distincts)
            </label>
          </fieldset>

          {/* Mode annuel */}
          {mode === 'annuel' && (
            <div className="space-y-2">
              <div className="max-w-xs">
                <Label htmlFor="hybride-annuel" className="text-xs mb-1 block">
                  Montant annuel (XOF)
                </Label>
                <Input
                  id="hybride-annuel"
                  data-testid="hybride-montant-annuel"
                  type="number"
                  value={montantAnnuel}
                  onChange={(e) => onMontantAnnuelChange(e.target.value)}
                  disabled={readOnly}
                  className="h-9 tabular-nums"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {montants.map((m, i) => (
                  <div
                    key={moisKeys[i] ?? i}
                    className="text-xs bg-(--secondary) rounded px-2 py-1.5 tabular-nums"
                    data-testid={`hybride-mois-ro-${i}`}
                  >
                    <div className="text-(--muted-foreground)">
                      {MOIS_FR[i]} {exerciceFiscal ?? ''}
                    </div>
                    <div className="font-medium">{FMT.format(m)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode mensuel */}
          {mode === 'mensuel' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {montants.map((m, i) => (
                  <div key={moisKeys[i] ?? i}>
                    <Label className="text-[11px] mb-0.5 block text-(--muted-foreground)">
                      {MOIS_FR[i]} {exerciceFiscal ?? ''}
                    </Label>
                    <Input
                      type="number"
                      value={m}
                      onChange={(e) => onMontantMensuelChange(i, e.target.value)}
                      disabled={readOnly}
                      data-testid={`hybride-mois-${i}`}
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div
                className="text-sm font-semibold text-right tabular-nums"
                data-testid="hybride-total"
              >
                Total annuel : {FMT.format(totalMensuel)} XOF
              </div>
            </div>
          )}

          {/* Justification */}
          <div className="max-w-2xl">
            <Label htmlFor="hybride-justif" className="text-xs mb-1 block">
              Justification{' '}
              <span className="text-(--muted-foreground) font-normal">
                (optionnel, {JUSTIF_MAX} car. max)
              </span>
            </Label>
            <textarea
              id="hybride-justif"
              data-testid="hybride-justif"
              value={justification}
              onChange={(e) =>
                setJustification(e.target.value.slice(0, JUSTIF_MAX))
              }
              disabled={readOnly}
              rows={2}
              maxLength={JUSTIF_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Hypothèse retenue, base de calcul…"
            />
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border)">
              <Button
                onClick={() => void enregistrer(false)}
                disabled={saving}
                data-testid="hybride-enregistrer"
                className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
              >
                {saving
                  ? editingKey
                    ? 'Mise à jour…'
                    : 'Enregistrement…'
                  : editingKey
                    ? 'Mettre à jour'
                    : 'Enregistrer'}
              </Button>
              {!editingKey && (
                <Button
                  variant="outline"
                  onClick={() => void enregistrer(true)}
                  disabled={saving}
                  data-testid="hybride-enregistrer-autre"
                >
                  Enregistrer et ajouter une autre ligne
                </Button>
              )}
              <Button
                variant="outline"
                onClick={editingKey ? annulerEdition : reset}
                disabled={saving}
                data-testid="hybride-annuler"
              >
                {editingKey ? 'Annuler l’édition' : 'Annuler'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Synthèse PNB (cartes accentuées) + tableau récap ─────── */}
      {contexteComplet && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiSaisieCard
              label="Produits (cl. 7)"
              value={FMT.format(recapSoumission.totalProduits)}
              gradient={['#10b981', '#059669']}
              testId="kpi-saisie-produits"
            />
            <KpiSaisieCard
              label="Charges (cl. 6)"
              value={FMT.format(recapSoumission.totalCharges)}
              gradient={['#fb7185', '#e11d48']}
              testId="kpi-saisie-charges"
            />
            <KpiSaisieCard
              label="PNB (Produits − Charges)"
              value={FMT.format(recapSoumission.pnb)}
              gradient={
                recapSoumission.pnb >= 0
                  ? ['#3b82f6', '#4f46e5']
                  : ['#f59e0b', '#ea580c']
              }
              testId="kpi-saisie-pnb"
            />
            <KpiSaisieCard
              label="Lignes saisies"
              value={String(recapSoumission.nbLignes)}
              gradient={['#8b5cf6', '#6d28d9']}
              testId="kpi-saisie-lignes"
            />
          </div>
          <LignesSaisiesTable
            lignes={lignesSaisies}
            moisKeys={moisKeys}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(0);
            }}
            onModifier={modifierLigne}
            onSupprimer={(ligne) => setConfirmDelete(ligne)}
            readOnly={readOnly}
            editingKey={editingKey}
            vueConsolidee={vueConsolidee}
            onToggleVue={(next) => {
              localStorage.setItem(VUE_STORAGE_KEY, next ? '1' : '0');
              setVueConsolidee(next);
            }}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmBascule}
        onClose={() => setConfirmBascule(false)}
        onConfirm={() => {
          confirmerBasculeAnnuel();
          return Promise.resolve();
        }}
        title="Passer en saisie annuelle ?"
        description={
          <p>
            Les 12 montants mensuels ne sont pas identiques. Passer en mode
            annuel va <strong>répartir uniformément</strong> le total sur les
            12 mois et <strong>perdre la saisonnalité</strong> actuelle.
          </p>
        }
        confirmText="Passer en annuel"
        cancelText="Garder le mensuel"
        destructive
      />

      {/* Confirmation de suppression d'une ligne saisie */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmerSuppression}
        title="Supprimer cette ligne ?"
        description={
          <p>
            La ligne{' '}
            <strong className="font-mono">
              {confirmDelete?.compte.codeCompte}
            </strong>{' '}
            — {confirmDelete?.compte.libelle} et ses 12 valeurs mensuelles
            vont être supprimées. Cette action est irréversible.
          </p>
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        destructive
      />

      {/* Import en masse CSV/XLSX (porté depuis l'ancienne grille) */}
      <ImportBudgetDialog
        isOpen={importOuvert}
        onClose={() => setImportOuvert(false)}
        versionId={versionId}
        versionCode={grille?.version.codeVersion}
        versionLibelle={grille?.version.libelle}
        scenarioId={scenarioId}
        scenarioCode={grille?.scenario.codeScenario}
        scenarioLibelle={grille?.scenario.libelle}
        onSucces={() => reloadGrille()}
      />

      {/* Soumission du CR au validateur (workflow par CR) */}
      {crCode && (
        <SoumissionDialog
          isOpen={soumissionOuvert}
          onClose={() => setSoumissionOuvert(false)}
          onConfirm={handleSoumettre}
          crCode={crCode}
          recap={recapSoumission}
        />
      )}
    </div>
  );
}

/** Carte de synthèse à dégradé vibrant (design accentué V8). */
function KpiSaisieCard({
  label,
  value,
  gradient,
  testId,
}: {
  label: string;
  value: string;
  gradient: [string, string];
  testId: string;
}): JSX.Element {
  const [c1, c2] = gradient;
  return (
    <div
      style={{ backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }}
      className="rounded-xl p-3.5 text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
      data-testid={testId}
    >
      <div className="text-[10px] font-medium text-white/85 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}
