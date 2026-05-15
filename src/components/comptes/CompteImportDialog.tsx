/**
 * CompteImportDialog (Lot 2.5E Phase B + Lot 7.3 V12 refonte Charte v1).
 *
 * Modale d'import CSV du PCB UMOA. Refondue V12 :
 *   - Header gradient bleu nuit dark→light avec icône FileUp ambre
 *   - Body scrollable avec :
 *     * Zone DROP CSV (border dashed bleu nuit + cercle ambre central)
 *     * 2 tiles "mode d'import" (Insertion seulement / Upsert) avec
 *       bordure ambre + fond ambre/4 % au sélectionné
 *     * Bloc info bleu nuit (border-left + bg) avec format CSV
 *       attendu et lien "Télécharger un exemple" en ambre
 *   - Footer sticky shrink-0 avec Annuler + "Lancer l'import" bleu
 *     nuit dark + icône Upload
 *
 * Logique métier 100 % préservée :
 *   - 3 étapes (idle / loading / done)
 *   - Affichage rapport import (4 KPI + table erreurs)
 *   - Export erreurs CSV
 *   - Téléchargement exemple
 */
import { AxiosError } from 'axios';
import {
  CheckCircle2,
  Download,
  FileUp,
  Info,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  importComptes,
  type ImportMode,
  type ImportRapport,
} from '@/lib/api/referentiels';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-3xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* Header gradient */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
          data-testid="compte-import-header"
        >
          <div className="flex items-start gap-2.5">
            <FileUp
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                Importer un fichier CSV (PCB UMOA)
              </DialogTitle>
              <p className="text-xs text-white/95 mt-1.5">
                Import en masse des comptes depuis un fichier CSV.
              </p>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="px-7 py-5 overflow-y-auto flex-1">
          {etape === 'idle' && (
            <div className="space-y-4">
              {/* Zone DROP CSV
                  Structure : <Label> seul (sans asterisk dans le
                  Label pour préserver le test `/^Fichier CSV$/i`),
                  asterisk séparé en <span> à côté, drop zone en
                  <div> cliquable via ref (pas de double <label>
                  qui causerait des matches multiples). */}
              <div>
                <div className="flex items-baseline gap-1 mb-1.5">
                  <Label
                    htmlFor="file"
                    className="text-sm font-medium text-(--foreground)"
                  >
                    Fichier CSV
                  </Label>
                  <span className="text-(--destructive)">*</span>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="block cursor-pointer rounded-md border border-dashed border-(--border) p-6 text-center transition-colors hover:bg-(--miznas-bleu-nuit)/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
                  style={{ backgroundColor: 'rgba(12, 68, 124, 0.02)' }}
                  data-testid="compte-import-drop-zone"
                  aria-label="Sélectionner un fichier CSV"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#BA75171A' }}
                    >
                      <Upload
                        className="w-5 h-5 text-(--miznas-ambre)"
                        aria-hidden="true"
                      />
                    </div>
                    {file ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{file.name}</span>
                        <span className="text-xs text-(--muted-foreground)">
                          ({(file.size / 1024).toFixed(1)} ko)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="ml-1 text-(--muted-foreground) hover:text-(--destructive)"
                          aria-label="Retirer le fichier"
                          data-testid="compte-import-clear-file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-(--foreground)">
                          Glissez votre fichier ici ou{' '}
                          <span className="text-(--miznas-ambre) underline underline-offset-2">
                            parcourir
                          </span>
                        </div>
                        <div className="text-xs text-(--muted-foreground)">
                          CSV UTF-8, séparateur virgule, max 5 Mo
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </div>

              {/* Mode d'import — 2 tiles */}
              <div>
                <Label className="text-sm font-medium text-(--foreground)">
                  Mode d&apos;import
                </Label>
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5"
                  role="radiogroup"
                  aria-label="Mode d'import"
                >
                  <ModeImportTile
                    value="insert-only"
                    selected={mode === 'insert-only'}
                    onSelect={() => setMode('insert-only')}
                    title="Insertion seulement"
                    description="Recommandé pour le premier import. Les comptes existants sont ignorés silencieusement."
                  />
                  <ModeImportTile
                    value="upsert"
                    selected={mode === 'upsert'}
                    onSelect={() => setMode('upsert')}
                    title="Mise à jour (upsert)"
                    description="Pour ré-imports avec corrections. Les comptes existants modifiés créent une nouvelle version SCD2."
                  />
                </div>
              </div>

              {/* Bloc info format */}
              <div
                className="rounded-md border-l-[3px] border-(--miznas-bleu-nuit) p-3 text-xs space-y-2"
                style={{ backgroundColor: 'rgba(12, 68, 124, 0.04)' }}
                data-testid="compte-import-format-info"
              >
                <div className="flex items-start gap-2">
                  <Info
                    className="w-3.5 h-3.5 mt-0.5 text-(--miznas-bleu-nuit) shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-(--foreground)">
                      Format attendu
                    </p>
                    <p className="text-(--muted-foreground)">
                      10 colonnes dans cet ordre strict (séparateur
                      virgule, encodage UTF-8) :
                    </p>
                    <code className="block font-mono text-[11px] break-all bg-white border border-(--border) rounded px-2 py-1 text-(--foreground)">
                      {HEADER_CSV}
                    </code>
                    <button
                      type="button"
                      className="text-(--miznas-ambre) hover:underline underline-offset-[3px] inline-flex items-center gap-1.5"
                      onClick={downloadExample}
                    >
                      <Download className="w-3 h-3" aria-hidden="true" />
                      Télécharger un exemple
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {etape === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-(--miznas-bleu-nuit)" />
              <p className="text-sm text-(--muted-foreground)">
                Import en cours…
              </p>
            </div>
          )}

          {etape === 'done' && rapport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <RapportKpi label="Total" value={rapport.totalLines} tone="neutral" />
                <RapportKpi label="Importés" value={rapport.imported} tone="success" />
                <RapportKpi label="Mis à jour" value={rapport.updated} tone="info" />
                <RapportKpi
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
                <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                      className="text-xs text-(--miznas-ambre) hover:underline"
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
                            <td className="p-2 font-mono">
                              {e.codeCompte ?? '—'}
                            </td>
                            <td className="p-2">
                              <code className="text-(--destructive)">
                                {e.code}
                              </code>
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
        </div>

        {/* Footer sticky */}
        <div
          className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0"
          data-testid="compte-import-footer"
        >
          {etape === 'idle' && (
            <>
              <DialogClose asChild>
                <Button variant="outline" className="gap-1.5">
                  <X className="w-3 h-3" />
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={lancerImport}
                disabled={!file}
                className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Lancer l&apos;import
              </Button>
            </>
          )}
          {etape === 'done' && (
            <>
              <Button variant="outline" onClick={reset}>
                Nouvel import
              </Button>
              <Button
                onClick={handleClose}
                className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
              >
                Fermer
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface ModeImportTileProps {
  value: ImportMode;
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}

function ModeImportTile({
  value,
  selected,
  onSelect,
  title,
  description,
}: ModeImportTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={`mode-import-tile-${value}`}
      style={
        selected
          ? {
              borderColor: '#BA7517',
              backgroundColor: 'rgba(186, 117, 23, 0.04)',
            }
          : undefined
      }
      className={cn(
        'border rounded-md p-3 text-left transition-colors',
        !selected && 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full border',
            selected
              ? 'bg-(--miznas-ambre) border-(--miznas-ambre)'
              : 'border-(--border)',
          )}
          aria-hidden="true"
        />
        <span
          className="text-sm font-semibold"
          style={selected ? { color: '#BA7517' } : undefined}
        >
          {title}
        </span>
      </div>
      <p className="text-xs text-(--muted-foreground) mt-1.5 leading-relaxed">
        {description}
      </p>
    </button>
  );
}

interface RapportKpiProps {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'info' | 'danger';
}

function RapportKpi({ label, value, tone }: RapportKpiProps): JSX.Element {
  const cls =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : tone === 'info'
        ? 'border-blue-300 bg-blue-50 text-blue-700'
        : tone === 'danger'
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-(--border) bg-(--muted)/30 text-(--foreground)';
  return (
    <div className={`rounded-md border p-3 text-center ${cls}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}
