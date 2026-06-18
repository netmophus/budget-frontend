/**
 * ValidationsPage (/budget/validations) — écran du validateur.
 *
 * Liste les CR de SON périmètre (GET statuts-crs?monPerimetre=true) pour
 * une version, avec filtres + pagination + actions (valider / rejeter /
 * rouvrir) selon le statut. « Voir détail » redirige vers la saisie en
 * lecture seule (statut hérité).
 *
 * Permission d'accès : BUDGET.VALIDER (route protégée).
 */
import { CheckCheck, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { StatutCrBadge } from '@/components/budget/cr-workflow/StatutCrBadge';
import {
  ValidationDialog,
  type ValidationAction,
} from '@/components/budget/cr-workflow/ValidationDialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getStatutsCrsVersion,
  rejeterCr,
  rouvrirCr,
  validerCr,
  type CrStatutLigne,
  type StatutCr,
  type StatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { listVersions, type Version } from '@/lib/api/versions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDateFr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function ValidationsPage(): JSX.Element {
  const navigate = useNavigate();
  const { versionId: storeVersionId, setVersionId: setStoreVersionId, setCrId } =
    useBudgetGrilleStore();

  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(storeVersionId);
  const [vue, setVue] = useState<StatutsCrsVersion | null>(null);
  const [loading, setLoading] = useState(false);

  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | StatutCr>('TOUS');
  const [filtreCr, setFiltreCr] = useState('TOUS');
  const [filtreSaisisseur, setFiltreSaisisseur] = useState('TOUS');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);

  // Action en cours (modale valider/rejeter/rouvrir).
  const [action, setAction] = useState<ValidationAction | null>(null);
  const [cible, setCible] = useState<CrStatutLigne | null>(null);

  // Chargement des versions + sélection par défaut (Brouillon).
  useEffect(() => {
    listVersions({ limit: 200 })
      .then((res) => {
        const tries = [...res.items].sort(
          (a, b) => b.exerciceFiscal - a.exerciceFiscal,
        );
        setVersions(tries);
        if (!versionId) {
          const ouverte =
            tries.find((v) => v.statut === 'ouvert') ?? tries[0] ?? null;
          if (ouverte) setVersionId(ouverte.id);
        }
      })
      .catch(() => toast.error('Impossible de charger les versions'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reload(): void {
    if (!versionId) {
      setVue(null);
      return;
    }
    setLoading(true);
    getStatutsCrsVersion(versionId, true)
      .then(setVue)
      .catch(() => {
        setVue(null);
        toast.error('Impossible de charger les CR à valider');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const saisisseurs = useMemo(
    () =>
      Array.from(
        new Set((vue?.crs ?? []).map((c) => c.saisisseurEmail).filter(Boolean)),
      ) as string[],
    [vue],
  );

  const lignesFiltrees = useMemo(() => {
    let l = vue?.crs ?? [];
    if (filtreStatut !== 'TOUS') l = l.filter((c) => c.statut === filtreStatut);
    if (filtreCr !== 'TOUS') l = l.filter((c) => c.crCode === filtreCr);
    if (filtreSaisisseur !== 'TOUS')
      l = l.filter((c) => c.saisisseurEmail === filtreSaisisseur);
    return l;
  }, [vue, filtreStatut, filtreCr, filtreSaisisseur]);

  const totalPages = Math.max(1, Math.ceil(lignesFiltrees.length / limit));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageLignes = lignesFiltrees.slice(
    pageClamped * limit,
    pageClamped * limit + limit,
  );

  function voirDetail(ligne: CrStatutLigne): void {
    if (!versionId) return;
    setStoreVersionId(versionId);
    setCrId(ligne.crId);
    navigate('/budget/saisie?retour=validations');
  }

  function ouvrirAction(act: ValidationAction, ligne: CrStatutLigne): void {
    setCible(ligne);
    setAction(act);
  }

  async function confirmerAction(texte: string): Promise<void> {
    if (!action || !cible || !versionId) return;
    try {
      if (action === 'valider') {
        await validerCr(cible.crCode, versionId, texte || undefined);
        toast.success(`CR ${cible.crCode} validé.`);
      } else if (action === 'rejeter') {
        await rejeterCr(cible.crCode, versionId, texte);
        toast.success(`CR ${cible.crCode} rejeté.`);
      } else {
        await rouvrirCr(cible.crCode, versionId, texte);
        toast.success(`CR ${cible.crCode} rouvert.`);
      }
      setCible(null);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de l’action : ${msg}`);
      throw err; // garde la modale ouverte
    }
  }

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#0F6E561A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <CheckCheck className="w-5 h-5" style={{ color: '#0F6E56' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Validations
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Valider, rejeter ou rouvrir les CR de votre périmètre.
          </p>
        </div>
      </div>

      {/* ─── Sélecteur de version + indicateur ──────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <label className="text-xs text-(--muted-foreground) flex flex-col gap-1">
          Version
          <select
            value={versionId ?? ''}
            onChange={(e) => setVersionId(e.target.value || null)}
            data-testid="validations-version"
            className="h-9 rounded-md border border-(--border) bg-white px-2 text-sm"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle} ({v.exerciceFiscal})
              </option>
            ))}
          </select>
        </label>
        {vue && (
          <div
            className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2 text-sm"
            data-testid="validations-indicateur"
          >
            <strong className="tabular-nums">{vue.nbSoumis}</strong> CR à valider
            sur <strong className="tabular-nums">{vue.totalAttendus}</strong> CR
            de votre périmètre.
          </div>
        )}
      </div>

      {/* ─── Filtres ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filtreStatut}
          onChange={(e) => {
            setFiltreStatut(e.target.value as 'TOUS' | StatutCr);
            setPage(0);
          }}
          data-testid="filtre-statut"
          className="h-8 rounded-md border border-(--border) bg-white px-2 text-sm"
        >
          <option value="TOUS">Tous les statuts</option>
          <option value="SOUMIS">Soumis</option>
          <option value="VALIDE">Validé</option>
          <option value="EN_SAISIE">En cours de saisie</option>
        </select>
        <select
          value={filtreCr}
          onChange={(e) => {
            setFiltreCr(e.target.value);
            setPage(0);
          }}
          data-testid="filtre-cr"
          className="h-8 rounded-md border border-(--border) bg-white px-2 text-sm"
        >
          <option value="TOUS">Tous les CR</option>
          {(vue?.crs ?? []).map((c) => (
            <option key={c.crId} value={c.crCode}>
              {c.crCode}
            </option>
          ))}
        </select>
        <select
          value={filtreSaisisseur}
          onChange={(e) => {
            setFiltreSaisisseur(e.target.value);
            setPage(0);
          }}
          data-testid="filtre-saisisseur"
          className="h-8 rounded-md border border-(--border) bg-white px-2 text-sm"
        >
          <option value="TOUS">Tous les saisisseurs</option>
          {saisisseurs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="text-xs text-(--muted-foreground) flex items-center gap-1.5 ml-auto">
          Lignes / page
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(0);
            }}
            className="h-8 rounded-md border border-(--border) bg-white px-2 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      {/* ─── Tableau ────────────────────────────────────────────── */}
      {loading && (
        <div className="rounded-md border border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}
      {!loading && lignesFiltrees.length === 0 && (
        <div
          className="rounded-md border border-dashed border-(--border) p-8 text-center text-sm text-(--muted-foreground)"
          data-testid="validations-vide"
        >
          Aucun CR à afficher pour ce filtre.
        </div>
      )}
      {!loading && lignesFiltrees.length > 0 && (
        <div className="rounded-md border border-(--border) overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">N°</TableHead>
                <TableHead>Code CR</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Saisisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Soumis le</TableHead>
                <TableHead className="text-right">PNB</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageLignes.map((ligne, i) => (
                <TableRow key={ligne.crId} data-testid="validation-row">
                  <TableCell className="text-(--muted-foreground) tabular-nums">
                    {pageClamped * limit + i + 1}
                  </TableCell>
                  <TableCell className="font-mono">{ligne.crCode}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {ligne.libelle}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-(--muted-foreground)">
                    {ligne.saisisseurEmail ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatutCrBadge statut={ligne.statut} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateFr(ligne.dateSoumission)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {FMT.format(ligne.pnb)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => voirDetail(ligne)}
                      data-testid="action-voir"
                      title="Voir le détail (lecture seule)"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {ligne.statut === 'SOUMIS' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-700"
                          onClick={() => ouvrirAction('valider', ligne)}
                          data-testid="action-valider"
                        >
                          Valider
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-(--destructive)"
                          onClick={() => ouvrirAction('rejeter', ligne)}
                          data-testid="action-rejeter"
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    {ligne.statut === 'VALIDE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => ouvrirAction('rouvrir', ligne)}
                        data-testid="action-rouvrir"
                      >
                        Rouvrir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm mt-3">
          <span className="text-(--muted-foreground)">
            Page {pageClamped + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageClamped <= 0}
            onClick={() => setPage(pageClamped - 1)}
            data-testid="validations-prev"
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageClamped >= totalPages - 1}
            onClick={() => setPage(pageClamped + 1)}
            data-testid="validations-next"
          >
            Suivant
          </Button>
        </div>
      )}

      <ValidationDialog
        action={action}
        crCode={cible?.crCode ?? null}
        onClose={() => setAction(null)}
        onConfirm={confirmerAction}
      />
    </div>
  );
}
