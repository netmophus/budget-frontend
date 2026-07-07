/**
 * HistoriqueAnalysesIaPage (Chantier C2) — liste paginée des analyses
 * MIZNAS AI historisées (les siennes, ou toutes si AI.HISTORIQUE) avec
 * filtres (version, scénario, période), consultation détail (modal),
 * export PDF et suppression (AI.HISTORIQUE).
 */
import { useEffect, useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AnalyseIaDetailModal } from '@/components/analyse-ia/AnalyseIaDetailModal';
import { useHasPermission } from '@/lib/auth/permissions';
import { exporterEcartsPdf } from '@/lib/api/tableau-bord';
import {
  getAnalyseIaDetail,
  listerAnalysesIa,
  supprimerAnalyseIa,
  type AnalyseIaListItem,
  type ListerAnalysesIaQuery,
} from '@/lib/api/analyseIa';

const LIMIT = 20;

export function HistoriqueAnalysesIaPage() {
  const canGererHistorique = useHasPermission('AI.HISTORIQUE');

  const [items, setItems] = useState<AnalyseIaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtres, setFiltres] = useState<
    Omit<ListerAnalysesIaQuery, 'page' | 'limit'>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AnalyseIaListItem | null>(null);

  function charger(): void {
    setLoading(true);
    listerAnalysesIa({ ...filtres, page, limit: LIMIT })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => toast.error("Impossible de charger l'historique."))
      .finally(() => setLoading(false));
  }

  useEffect(charger, [page, filtres]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const setFiltre = (k: keyof typeof filtres, v: string): void => {
    setPage(1);
    setFiltres((f) => ({ ...f, [k]: v || undefined }));
  };

  /** Export depuis la liste : récupère le détail puis génère le PDF. */
  async function exporter(id: string): Promise<void> {
    try {
      const d = await getAnalyseIaDetail(id);
      await exporterEcartsPdf(
        {
          versionId: d.versionId,
          scenarioId: d.scenarioId,
          moisDebut: d.moisDebut,
          moisFin: d.moisFin,
          crIds: d.crsSelectionnes ?? undefined,
        },
        {
          analyse: d.reponseMarkdown,
          model: d.modele,
          tokensInput: d.tokensIn,
          tokensOutput: d.tokensOut,
          dureeMs: d.dureeMs,
          dryRun: d.dryRun,
          generatedAt: d.dateGeneration,
        },
      );
      toast.info('PDF exporté (écarts recalculés à l’export, analyse figée).');
    } catch {
      toast.error("Échec de l'export PDF.");
    }
  }

  async function confirmerSuppression(): Promise<void> {
    if (!toDelete) return;
    await supprimerAnalyseIa(toDelete.id);
    toast.success('Analyse supprimée.');
    setToDelete(null);
    charger();
  }

  return (
    <div className="space-y-4" data-testid="historique-analyses-ia-page">
      <PageHeader
        title="Historique des analyses MIZNAS AI"
        description={
          canGererHistorique
            ? 'Toutes les analyses IA générées (AI.HISTORIQUE).'
            : 'Vos analyses IA générées.'
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <FiltreInput id="f-version" label="Version" onChange={(v) => setFiltre('versionId', v)} />
        <FiltreInput id="f-scenario" label="Scénario" onChange={(v) => setFiltre('scenarioId', v)} />
        <FiltreInput id="f-mois-debut" label="Mois début" placeholder="2027-01" onChange={(v) => setFiltre('moisDebut', v)} />
        <FiltreInput id="f-mois-fin" label="Mois fin" placeholder="2027-03" onChange={(v) => setFiltre('moisFin', v)} />
      </div>

      {/* Tableau */}
      <div className="rounded-md border border-(--border)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Généré le</TableHead>
              {canGererHistorique && <TableHead>Demandeur</TableHead>}
              <TableHead>Période</TableHead>
              <TableHead>Version / Scénario</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead className="text-right">Coût ($)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-24 w-full" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-(--muted-foreground)"
                >
                  Aucune analyse historisée.
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id} data-testid={`analyse-row-${a.id}`}>
                  <TableCell>{formatDate(a.dateGeneration)}</TableCell>
                  {canGererHistorique && <TableCell>{a.demandeurEmail}</TableCell>}
                  <TableCell>
                    {a.moisDebut} → {a.moisFin}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.versionId} / {a.scenarioId}
                    {a.dryRun && (
                      <span className="ml-1 rounded bg-(--secondary) px-1 text-[10px]">
                        dry-run
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{a.modele}</TableCell>
                  <TableCell className="text-right">
                    {a.coutEstime.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Voir"
                        data-testid={`voir-${a.id}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Exporter PDF"
                        data-testid={`export-${a.id}`}
                        onClick={() => void exporter(a.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canGererHistorique && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-(--destructive)"
                          aria-label="Supprimer"
                          data-testid={`supprimer-${a.id}`}
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-(--muted-foreground)">
          {total} analyse(s) — page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            data-testid="page-prec"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            data-testid="page-suiv"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>

      {selectedId && (
        <AnalyseIaDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={() => {
            setSelectedId(null);
            charger();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmerSuppression}
        title="Supprimer cette analyse ?"
        description="L'analyse historisée sera définitivement supprimée."
        confirmText="Supprimer"
        destructive
      />
    </div>
  );
}

function FiltreInput({
  id,
  label,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        data-testid={id}
        placeholder={placeholder}
        className="h-8 w-36"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
