/**
 * Dialog d'import CSV du PCB UMOA Révisé (Lot 2.5E Phase B).
 *
 * Formulaire en 3 étapes — sélection fichier + mode → loading →
 * rapport structuré (KPI + erreurs détaillées). Consomme l'endpoint
 * POST /api/v1/referentiels/comptes/import livré au Lot 2.4A.2
 * (FileInterceptor + multer + Zod + tri par niveau).
 */
import { AxiosError } from 'axios';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  importComptes,
  type ImportMode,
  type ImportRapport,
} from '@/lib/api/referentiels';

const HEADER_CSV = [
  'code_compte',
  'libelle',
  'classe',
  'sous_classe',
  'code_compte_parent',
  'niveau',
  'sens',
  'code_poste_budgetaire',
  'est_compte_collectif',
  'est_porteur_interets',
].join(',');

const EXEMPLE_CSV = [
  HEADER_CSV,
  '6,CHARGES,6,,,1,D,,true,false',
  '60,Achats,6,60,6,2,D,,true,false',
  '601,Achats consommables,6,60,60,3,D,,true,false',
  '601100,Fournitures de bureau,6,60,601,4,D,ACHATS_DIVERS,false,false',
].join('\n');

interface CompteImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Etape = 'idle' | 'loading' | 'done';

export function CompteImportDialog({
  isOpen,
  onClose,
  onImported,
}: CompteImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('insert-only');
  const [etape, setEtape] = useState<Etape>('idle');
  const [rapport, setRapport] = useState<ImportRapport | null>(null);

  function reset(): void {
    setFile(null);
    setMode('insert-only');
    setEtape('idle');
    setRapport(null);
  }

  function handleClose(): void {
    if (etape === 'loading') return;
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  function downloadExample(): void {
    const blob = new Blob([EXEMPLE_CSV], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compte-import-exemple.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function lancerImport(): Promise<void> {
    if (!file) return;
    setEtape('loading');
    try {
      const r = await importComptes(file, mode);
      setRapport(r);
      setEtape('done');
      if (r.errors.length === 0) {
        toast.success(
          `Import terminé : ${r.imported} créés${r.updated > 0 ? `, ${r.updated} mis à jour` : ''}.`,
        );
      } else {
        toast.error(
          `${r.errors.length} ligne(s) en erreur — voir le détail ci-dessous.`,
        );
      }
      onImported();
    } catch (err) {
      setEtape('idle');
      if (err instanceof AxiosError) {
        const status = err.response?.status ?? 0;
        const dataMsg =
          (err.response?.data as { message?: string | string[] } | undefined)
            ?.message;
        const msg = Array.isArray(dataMsg)
          ? dataMsg.join(' ; ')
          : (dataMsg ?? err.message);
        if (status === 401) {
          toast.error('Session expirée — veuillez vous reconnecter.');
        } else if (status === 400) {
          toast.error(msg || 'Fichier CSV invalide.');
        } else if (status === 413) {
          toast.error('Fichier trop volumineux.');
        } else {
          toast.error(msg || "Échec de l'import.");
        }
      } else {
        toast.error("Échec de l'import.");
      }
    }
  }

  function exportErrorsCsv(): void {
    if (!rapport || rapport.errors.length === 0) return;
    const lignes = ['ligne,code_compte,code_erreur,message'];
    for (const e of rapport.errors) {
      const codeCompte = e.codeCompte ?? '';
      const message = e.message.replace(/"/g, '""');
      lignes.push(`${e.ligne},"${codeCompte}",${e.code},"${message}"`);
    }
    const blob = new Blob([lignes.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compte-import-erreurs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer un fichier CSV (PCB UMOA)</DialogTitle>
          <DialogDescription>
            Import en masse des comptes depuis un fichier CSV.
          </DialogDescription>
        </DialogHeader>

        {etape === 'idle' && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="file">Fichier CSV</Label>
              <input
                id="file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-(--primary) file:text-(--primary-foreground) hover:file:opacity-90 cursor-pointer"
              />
              {file && (
                <p className="text-xs text-(--muted-foreground)">
                  Sélectionné : <strong>{file.name}</strong> (
                  {(file.size / 1024).toFixed(1)} ko)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mode d'import</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded-md border border-(--border) hover:bg-(--accent)/30">
                  <input
                    type="radio"
                    name="import-mode"
                    value="insert-only"
                    checked={mode === 'insert-only'}
                    onChange={() => setMode('insert-only')}
                    className="mt-1"
                  />
                  <span>
                    <strong>Insertion seulement</strong>
                    <span className="block text-xs text-(--muted-foreground)">
                      Recommandé pour le premier import. Les comptes
                      existants sont ignorés silencieusement.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded-md border border-(--border) hover:bg-(--accent)/30">
                  <input
                    type="radio"
                    name="import-mode"
                    value="upsert"
                    checked={mode === 'upsert'}
                    onChange={() => setMode('upsert')}
                    className="mt-1"
                  />
                  <span>
                    <strong>Mise à jour (upsert)</strong>
                    <span className="block text-xs text-(--muted-foreground)">
                      Pour ré-imports avec corrections. Les comptes
                      existants modifiés créent une nouvelle version SCD2.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-md border border-(--border) bg-(--muted)/30 p-3 text-xs space-y-2">
              <p className="font-semibold">Format CSV attendu :</p>
              <p>
                10 colonnes dans cet ordre strict (séparateur virgule,
                encodage UTF-8) :{' '}
                <code className="font-mono break-all">{HEADER_CSV}</code>
              </p>
              <button
                type="button"
                className="text-(--primary) hover:underline"
                onClick={downloadExample}
              >
                Télécharger un fichier d'exemple
              </button>
            </div>
          </div>
        )}

        {etape === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-(--primary)" />
            <p className="text-sm text-(--muted-foreground)">
              Import en cours…
            </p>
          </div>
        )}

        {etape === 'done' && rapport && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-3">
              <KpiCard label="Total" value={rapport.totalLines} tone="neutral" />
              <KpiCard label="Importés" value={rapport.imported} tone="success" />
              <KpiCard label="Mis à jour" value={rapport.updated} tone="info" />
              <KpiCard
                label={rapport.errors.length > 0 ? 'Erreurs' : 'Ignorés'}
                value={
                  rapport.errors.length > 0
                    ? rapport.errors.length
                    : rapport.skipped
                }
                tone={rapport.errors.length > 0 ? 'danger' : 'neutral'}
              />
            </div>

            {rapport.errors.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  Import réussi — {rapport.imported} compte(s) créé(s)
                  {rapport.updated > 0
                    ? `, ${rapport.updated} mis à jour`
                    : ''}
                  {' '}en {rapport.dureeMs} ms.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    Erreurs détaillées ({rapport.errors.length})
                  </h3>
                  <button
                    type="button"
                    className="text-xs text-(--primary) hover:underline"
                    onClick={exportErrorsCsv}
                  >
                    Exporter les erreurs (CSV)
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto border border-(--border) rounded-md">
                  <table className="text-xs w-full">
                    <thead className="bg-(--muted)/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Ligne</th>
                        <th className="text-left p-2 font-medium">Code</th>
                        <th className="text-left p-2 font-medium">Erreur</th>
                        <th className="text-left p-2 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.errors.map((e, i) => (
                        <tr
                          key={`${e.ligne}-${i}`}
                          className="border-t border-(--border)"
                        >
                          <td className="p-2 font-mono">{e.ligne}</td>
                          <td className="p-2 font-mono">{e.codeCompte ?? '—'}</td>
                          <td className="p-2">
                            <code className="text-red-600">{e.code}</code>
                          </td>
                          <td className="p-2">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {etape === 'idle' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" /> Annuler
              </Button>
              <Button onClick={lancerImport} disabled={!file}>
                <Upload className="h-4 w-4 mr-2" /> Lancer l'import
              </Button>
            </>
          )}
          {etape === 'done' && (
            <>
              <Button variant="ghost" onClick={reset}>
                Nouvel import
              </Button>
              <Button onClick={handleClose}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'info' | 'danger';
}) {
  const cls =
    tone === 'success'
      ? 'border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
      : tone === 'info'
        ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
        : tone === 'danger'
          ? 'border-red-300 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
          : 'border-(--border) bg-(--muted)/30 text-(--foreground)';
  return (
    <div className={`rounded-md border p-3 text-center ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}
