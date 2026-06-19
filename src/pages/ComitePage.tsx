/**
 * ComitePage (/budget/comite) — écran d'arbitrage du Comité Budget.
 *
 * Pour une version SOUMIS_COMITE : vue consolidée (PNB/RN/CE/CR/Zinder
 * vs cibles D2), détail par CR validé (modale lecture seule), et les 2
 * actions du Comité — Approuver (→ VALIDE) / Demander révision (→ OUVERT
 * + CR ciblé EN_SAISIE).
 *
 * Permission d'accès : BUDGET.VALIDER (route protégée). Les actions ne
 * sont actives que si la version est effectivement SOUMIS_COMITE.
 */
import { ClipboardCheck, Eye, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ApprobationDialog } from '@/components/budget/comite/ApprobationDialog';
import { DemanderRevisionDialog } from '@/components/budget/comite/DemanderRevisionDialog';
import { DetailCrModal } from '@/components/budget/comite/DetailCrModal';
import { VueConsolideeVersion } from '@/components/budget/comite/VueConsolideeVersion';
import { Badge } from '@/components/ui/badge';
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
  approuverComite,
  demanderRevisionComite,
  getStatutsCrsVersion,
  type CrStatutLigne,
  type StatutsCrsVersion,
} from '@/lib/api/cr-workflow';
import { listVersions, type Version } from '@/lib/api/versions';
import {
  badgeClassStatutVersionWorkflow,
  libelleStatutVersionWorkflow,
} from '@/lib/labels/budget';
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

export function ComitePage(): JSX.Element {
  const { versionId: storeVersionId } = useBudgetGrilleStore();

  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(storeVersionId);
  const [vue, setVue] = useState<StatutsCrsVersion | null>(null);
  const [loading, setLoading] = useState(false);

  const [detailCible, setDetailCible] = useState<CrStatutLigne | null>(null);
  const [approbationOpen, setApprobationOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [approSubmitting, setApproSubmitting] = useState(false);
  const [revSubmitting, setRevSubmitting] = useState(false);

  useEffect(() => {
    listVersions({ limit: 200 })
      .then((res) => {
        const tries = [...res.items].sort(
          (a, b) => b.exerciceFiscal - a.exerciceFiscal,
        );
        setVersions(tries);
        if (!versionId) {
          // Priorité à une version effectivement soumise au Comité.
          const cible =
            tries.find((v) => v.statut === 'soumis_comite') ??
            tries[0] ??
            null;
          if (cible) setVersionId(cible.id);
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
    getStatutsCrsVersion(versionId)
      .then(setVue)
      .catch(() => {
        setVue(null);
        toast.error('Impossible de charger la consolidation');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const versionLibelle = useMemo(
    () => versions.find((v) => v.id === versionId)?.libelle ?? null,
    [versions, versionId],
  );

  const pnbConsolide = useMemo(
    () => (vue?.crs ?? []).reduce((s, c) => s + c.pnb, 0),
    [vue],
  );

  const crsValides = useMemo(
    () => (vue?.crs ?? []).filter((c) => c.statut === 'VALIDE'),
    [vue],
  );

  const versionSoumisComite = vue?.statutVersion === 'soumis_comite';

  async function handleApprouver(commentaire?: string): Promise<void> {
    if (!versionId) return;
    setApproSubmitting(true);
    try {
      await approuverComite(versionId, commentaire);
      toast.success('Budget approuvé par le Comité — version validée.');
      setApprobationOpen(false);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de l’approbation : ${msg}`);
    } finally {
      setApproSubmitting(false);
    }
  }

  async function handleRevision(crCode: string, motif: string): Promise<void> {
    if (!versionId) return;
    setRevSubmitting(true);
    try {
      await demanderRevisionComite(versionId, crCode, motif);
      toast.success(
        `Révision demandée sur ${crCode} — version réouverte pour correction.`,
      );
      setRevisionOpen(false);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la demande de révision : ${msg}`);
    } finally {
      setRevSubmitting(false);
    }
  }

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#1B2A4A1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <ClipboardCheck className="w-5 h-5" style={{ color: '#1B2A4A' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Comité Budget
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Consolidation vs cibles, détail par CR, et arbitrage du Comité.
          </p>
        </div>
      </div>

      {/* ─── Version + statut + actions ─────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs text-(--muted-foreground) flex flex-col gap-1">
          Version
          <select
            value={versionId ?? ''}
            onChange={(e) => setVersionId(e.target.value || null)}
            data-testid="comite-version"
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
          <Badge
            data-testid="comite-statut-version"
            className={badgeClassStatutVersionWorkflow(vue.statutVersion)}
          >
            {libelleStatutVersionWorkflow(vue.statutVersion)}
          </Badge>
        )}
        {versionSoumisComite && (
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRevisionOpen(true)}
              data-testid="comite-demander-revision"
              className="h-9 gap-1.5 border-(--miznas-ambre) text-(--miznas-ambre) hover:bg-(--miznas-ambre)/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Demander révision
            </Button>
            <Button
              onClick={() => setApprobationOpen(true)}
              data-testid="comite-approuver"
              className="h-9 gap-1.5 bg-green-700 hover:bg-green-700/90 text-white"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Approuver
            </Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-md border border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {!loading && vue && !versionSoumisComite && (
        <div
          className="rounded-md border border-dashed border-(--border) p-4 mb-4 text-sm text-(--muted-foreground)"
          data-testid="comite-non-soumis"
        >
          Cette version n’est pas soumise au Comité (statut «&nbsp;
          {libelleStatutVersionWorkflow(vue.statutVersion)}&nbsp;»). Les actions
          d’arbitrage seront disponibles une fois la version transmise par le
          Coordinateur.
        </div>
      )}

      {!loading && vue && (
        <div className="space-y-5">
          {/* ─── Vue consolidée ───────────────────────────────── */}
          <section>
            <h4 className="text-sm font-semibold mb-2">
              Consolidation vs cibles D2
            </h4>
            <VueConsolideeVersion pnbConsolide={pnbConsolide} />
          </section>

          {/* ─── Détail par CR validé ─────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                CR validés ({crsValides.length})
              </h4>
              <div
                className="text-xs text-(--muted-foreground)"
                data-testid="comite-pnb"
              >
                PNB consolidé :{' '}
                <strong className="tabular-nums">
                  {FMT.format(pnbConsolide)}
                </strong>
              </div>
            </div>
            {crsValides.length === 0 ? (
              <div className="rounded-md border border-dashed border-(--border) p-6 text-center text-sm text-(--muted-foreground)">
                Aucun CR validé pour cette version.
              </div>
            ) : (
              <div className="rounded-md border border-(--border) overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">N°</TableHead>
                      <TableHead>Code CR</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Saisisseur</TableHead>
                      <TableHead>Validateur</TableHead>
                      <TableHead className="text-right">PNB</TableHead>
                      <TableHead>Validé le</TableHead>
                      <TableHead className="text-right">Détail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crsValides.map((cr, i) => (
                      <TableRow key={cr.crId} data-testid="comite-cr-row">
                        <TableCell className="text-(--muted-foreground) tabular-nums">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-mono">{cr.crCode}</TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {cr.libelle}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-(--muted-foreground)">
                          {cr.saisisseurEmail ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-(--muted-foreground)">
                          {cr.validateurEmail ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {FMT.format(cr.pnb)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDateFr(cr.dateValidation)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setDetailCible(cr)}
                            data-testid="comite-voir-detail"
                            title="Voir le détail du CR"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      )}

      <DetailCrModal
        versionId={versionId}
        cr={detailCible}
        onClose={() => setDetailCible(null)}
      />

      <ApprobationDialog
        isOpen={approbationOpen}
        onClose={() => setApprobationOpen(false)}
        onConfirm={handleApprouver}
        versionLibelle={versionLibelle}
        submitting={approSubmitting}
      />

      <DemanderRevisionDialog
        isOpen={revisionOpen}
        onClose={() => setRevisionOpen(false)}
        crs={crsValides}
        onConfirm={handleRevision}
        submitting={revSubmitting}
      />
    </div>
  );
}
