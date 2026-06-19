/**
 * CoordinationPage (/budget/coordination) — écran du Coordinateur.
 *
 * Palier 4 : sélection de version, initialisation du snapshot des CR
 * attendus, et vue de progression (tous CR du snapshot). La soumission
 * au Comité + le retrait de CR sont ajoutés au palier 5.
 *
 * Permission d'accès : BUDGET.COORDONNER (route protégée).
 */
import { ListTree, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { InitialiserSnapshotDialog } from '@/components/budget/coordination/InitialiserSnapshotDialog';
import { ProgressionVersionTable } from '@/components/budget/coordination/ProgressionVersionTable';
import { RetirerCrDialog } from '@/components/budget/coordination/RetirerCrDialog';
import { SoumissionComiteDialog } from '@/components/budget/coordination/SoumissionComiteDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getStatutsCrsVersion,
  initialiserSnapshot,
  retirerCrDuSnapshot,
  soumettreComite,
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

export function CoordinationPage(): JSX.Element {
  const { versionId: storeVersionId } = useBudgetGrilleStore();

  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState<string | null>(storeVersionId);
  const [vue, setVue] = useState<StatutsCrsVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapshotDialog, setSnapshotDialog] = useState(false);
  const [initSubmitting, setInitSubmitting] = useState(false);
  const [retirerCible, setRetirerCible] = useState<CrStatutLigne | null>(null);
  const [comiteDialog, setComiteDialog] = useState(false);
  const [comiteSubmitting, setComiteSubmitting] = useState(false);

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
    getStatutsCrsVersion(versionId)
      .then(setVue)
      .catch(() => {
        setVue(null);
        toast.error('Impossible de charger la progression');
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

  async function handleInit(): Promise<void> {
    if (!versionId) return;
    setInitSubmitting(true);
    try {
      const r = await initialiserSnapshot(versionId);
      toast.success(
        `Snapshot initialisé : ${r.total} CR attendus (${r.ajoutes} ajoutés).`,
      );
      setSnapshotDialog(false);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de l’initialisation : ${msg}`);
    } finally {
      setInitSubmitting(false);
    }
  }

  async function handleRetirer(motif: string): Promise<void> {
    if (!versionId || !retirerCible) return;
    try {
      await retirerCrDuSnapshot(versionId, retirerCible.crCode, motif);
      toast.success(`CR ${retirerCible.crCode} retiré du snapshot.`);
      setRetirerCible(null);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec du retrait : ${msg}`);
      throw err;
    }
  }

  async function handleSoumettreComite(commentaire?: string): Promise<void> {
    if (!versionId) return;
    setComiteSubmitting(true);
    try {
      await soumettreComite(versionId, commentaire);
      toast.success('Version soumise au Comité budgétaire.');
      setComiteDialog(false);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec de la soumission : ${msg}`);
    } finally {
      setComiteSubmitting(false);
    }
  }

  const snapshotVide = vue !== null && vue.totalAttendus === 0;
  const versionOuverte = vue?.statutVersion === 'ouvert';
  const versionPreValide = vue?.statutVersion === 'pre_valide';

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#5B4E911A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <ListTree className="w-5 h-5" style={{ color: '#5B4E91' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Coordination
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Initialisez le périmètre des CR attendus et suivez la progression.
          </p>
        </div>
      </div>

      {/* ─── Version + statut ───────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-xs text-(--muted-foreground) flex flex-col gap-1">
          Version
          <select
            value={versionId ?? ''}
            onChange={(e) => setVersionId(e.target.value || null)}
            data-testid="coordination-version"
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
            data-testid="coordination-statut-version"
            className={badgeClassStatutVersionWorkflow(vue.statutVersion)}
          >
            {libelleStatutVersionWorkflow(vue.statutVersion)}
          </Badge>
        )}
        {versionPreValide && (
          <Button
            onClick={() => setComiteDialog(true)}
            data-testid="coordination-soumettre-comite"
            className="ml-auto h-9 gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
            <Send className="w-3.5 h-3.5" />
            Soumettre au Comité
          </Button>
        )}
      </div>

      {loading && (
        <div className="rounded-md border border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {/* ─── Snapshot vide → initialisation ─────────────────────── */}
      {!loading && snapshotVide && (
        <div
          className="rounded-md border border-dashed border-(--border) p-8 text-center"
          data-testid="coordination-snapshot-vide"
        >
          <p className="text-sm text-(--muted-foreground) mb-3">
            Aucun CR attendu n’est défini pour cette version. Initialisez le
            snapshot pour démarrer le cycle de validation.
          </p>
          <Button
            onClick={() => setSnapshotDialog(true)}
            data-testid="coordination-initialiser"
            className="gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          >
            <ListTree className="w-3.5 h-3.5" />
            Initialiser le snapshot des CR attendus
          </Button>
        </div>
      )}

      {/* ─── Progression ────────────────────────────────────────── */}
      {!loading && vue && vue.totalAttendus > 0 && (
        <div className="space-y-3">
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            data-testid="coordination-progression"
          >
            <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                CR validés
              </div>
              <div className="text-base font-semibold tabular-nums">
                {vue.nbValides} / {vue.totalAttendus}
              </div>
            </div>
            <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">Soumis</div>
              <div className="text-base font-semibold tabular-nums">
                {vue.nbSoumis}
              </div>
            </div>
            <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                En saisie
              </div>
              <div className="text-base font-semibold tabular-nums">
                {vue.nbEnSaisie}
              </div>
            </div>
            <div className="rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-2">
              <div className="text-[11px] text-(--muted-foreground)">
                PNB consolidé
              </div>
              <div
                className="text-base font-semibold tabular-nums"
                data-testid="coordination-pnb"
              >
                {FMT.format(pnbConsolide)}
              </div>
            </div>
          </div>

          <ProgressionVersionTable
            crs={vue.crs}
            renderActions={
              versionOuverte
                ? (cr) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-(--destructive)"
                      onClick={() => setRetirerCible(cr)}
                      data-testid="coordination-retirer"
                      title="Retirer ce CR du snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )
                : undefined
            }
          />
        </div>
      )}

      <InitialiserSnapshotDialog
        isOpen={snapshotDialog}
        onClose={() => setSnapshotDialog(false)}
        onConfirm={handleInit}
        versionLibelle={versionLibelle}
        submitting={initSubmitting}
      />

      <RetirerCrDialog
        crCode={retirerCible?.crCode ?? null}
        onClose={() => setRetirerCible(null)}
        onConfirm={handleRetirer}
      />

      <SoumissionComiteDialog
        isOpen={comiteDialog}
        onClose={() => setComiteDialog(false)}
        onConfirm={handleSoumettreComite}
        pnbConsolide={pnbConsolide}
        submitting={comiteSubmitting}
      />
    </div>
  );
}
