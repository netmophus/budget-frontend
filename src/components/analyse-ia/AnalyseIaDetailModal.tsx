/**
 * AnalyseIaDetailModal (Chantier C2) — détail d'une analyse IA historisée :
 * en-tête (période/version/date/demandeur), KPI snapshot, markdown rendu
 * (react-markdown + remark-gfm, comme le panneau live), + actions Exporter
 * PDF / Supprimer (AI.HISTORIQUE).
 */
import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  getAnalyseIaDetail,
  supprimerAnalyseIa,
  type AnalyseIaDetail,
} from '@/lib/api/analyseIa';
import { exporterEcartsPdf } from '@/lib/api/tableau-bord';

interface Props {
  id: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Libellés des KPI du snapshot (clés connues de ecarts.kpi). */
const KPI_LABELS: Record<string, string> = {
  nbEcartsCritique: 'Écarts CRITIQUE',
  nbEcartsAttention: 'Écarts ATTENTION',
  nbEcartsTotal: 'Écarts (total)',
  nbLignesManquantes: 'Lignes manquantes',
};

export function AnalyseIaDetailModal({ id, onClose, onDeleted }: Props) {
  const canGererHistorique = useHasPermission('AI.HISTORIQUE');
  const [detail, setDetail] = useState<AnalyseIaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAnalyseIaDetail(id)
      .then(setDetail)
      .catch(() => toast.error("Impossible de charger l'analyse."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleExport(): Promise<void> {
    if (!detail) return;
    setExporting(true);
    try {
      await exporterEcartsPdf(
        {
          versionId: detail.versionId,
          scenarioId: detail.scenarioId,
          moisDebut: detail.moisDebut,
          moisFin: detail.moisFin,
          crIds: detail.crsSelectionnes ?? undefined,
        },
        {
          analyse: detail.reponseMarkdown,
          model: detail.modele,
          tokensInput: detail.tokensIn,
          tokensOutput: detail.tokensOut,
          dureeMs: detail.dureeMs,
          dryRun: detail.dryRun,
          generatedAt: detail.dateGeneration,
        },
      );
      toast.info(
        'PDF exporté — note : les écarts sont recalculés à l’export (l’analyse, elle, est figée).',
      );
    } catch {
      toast.error("Échec de l'export PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    await supprimerAnalyseIa(id);
    toast.success('Analyse supprimée.');
    setConfirmDelete(false);
    onDeleted();
  }

  const kpis = detail?.kpiSnapshot
    ? Object.entries(KPI_LABELS)
        .filter(([k]) => typeof detail.kpiSnapshot?.[k] === 'number')
        .map(([k, label]) => ({ label, value: detail.kpiSnapshot![k] as number }))
    : [];

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="max-h-[85vh] max-w-3xl overflow-y-auto"
          data-testid="analyse-ia-detail-modal"
        >
          <DialogHeader>
            <DialogTitle>Analyse MIZNAS AI</DialogTitle>
          </DialogHeader>

          {loading || !detail ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-4">
              {/* En-tête méta */}
              <div className="grid grid-cols-2 gap-2 rounded-md border border-(--border) p-3 text-sm sm:grid-cols-3">
                <Meta label="Période" value={`${detail.moisDebut} → ${detail.moisFin}`} />
                <Meta label="Version" value={detail.versionId} />
                <Meta label="Scénario" value={detail.scenarioId} />
                <Meta label="Généré le" value={formatDate(detail.dateGeneration)} />
                <Meta label="Demandeur" value={detail.demandeurEmail} />
                <Meta label="Modèle" value={detail.modele} />
              </div>

              {/* KPI snapshot */}
              {kpis.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="kpi-snapshot">
                  {kpis.map((k) => (
                    <span
                      key={k.label}
                      className="rounded bg-(--secondary) px-2 py-1 text-xs"
                    >
                      {k.label} : <strong>{k.value}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* Markdown */}
              <div
                className="prose prose-sm max-w-none border-t border-(--border) pt-3"
                data-testid="analyse-ia-markdown"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {detail.reponseMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {canGererHistorique && (
              <Button
                variant="ghost"
                className="text-(--destructive)"
                data-testid="btn-supprimer-analyse"
                disabled={!detail}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Supprimer
              </Button>
            )}
            <Button
              variant="outline"
              data-testid="btn-export-pdf"
              disabled={!detail || exporting}
              onClick={() => void handleExport()}
            >
              <Download className="mr-1 h-4 w-4" />
              {exporting ? 'Export…' : 'Exporter PDF'}
            </Button>
            <Button onClick={onClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Supprimer cette analyse ?"
        description="L'analyse historisée sera définitivement supprimée."
        confirmText="Supprimer"
        destructive
      />
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-(--muted-foreground)">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
