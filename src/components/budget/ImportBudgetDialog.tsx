/**
 * ImportBudgetDialog (Lot 3.7) — modal d'import en masse de saisie
 * budgétaire (CSV/XLSX) accessible depuis SaisieBudgetairePage.
 *
 * 4 étapes :
 *  1. Sélection fichier (drag&drop ou bouton + lien Télécharger template)
 *  2. Validation contexte (rappel version + scenario sélectionnés)
 *  3. Upload + spinner pendant traitement
 *  4. Rapport résultats (cartes statistiques + tableau erreurs si > 0)
 */
import { AxiosError } from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
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
import {
  genererTemplateCsv,
  importBudget,
  TEMPLATE_EXEMPLES,
  TEMPLATE_HEADER,
  type ImportBudgetRapport,
} from '@/lib/api/budget-import';

type Etape = 'selection' | 'upload' | 'rapport';

/** Spécification des 9 colonnes pour le bloc d'aide en ligne. */
const COLONNES_AIDE: ReadonlyArray<{
  nom: string;
  format: string;
  obligatoire: string;
}> = [
  { nom: 'code_cr', format: 'Code CR (ex : CR_AG_SIEGE)', obligatoire: 'Oui' },
  { nom: 'code_compte', format: 'Code PCB (ex : 70213)', obligatoire: 'Oui' },
  {
    nom: 'code_ligne_metier',
    format: 'Code LM (ex : RET_PME)',
    obligatoire: 'Oui',
  },
  { nom: 'mois', format: 'Format YYYY-MM (ex : 2027-01)', obligatoire: 'Oui' },
  {
    nom: 'mode_saisie',
    format: 'MONTANT ou ENCOURS_TIE',
    obligatoire: 'Oui',
  },
  { nom: 'montant', format: 'Nombre en FCFA', obligatoire: 'Si MONTANT' },
  {
    nom: 'encours_moyen',
    format: 'Nombre en FCFA',
    obligatoire: 'Si ENCOURS',
  },
  { nom: 'tie', format: 'Décimal 0-1 (ex : 0.065)', obligatoire: 'Si ENCOURS' },
  {
    nom: 'commentaire',
    format: 'Texte libre (max 2000 car.)',
    obligatoire: 'Non',
  },
];

/** Bloc d'aide en ligne : format des 9 colonnes + exemple + rappels. */
function AideFormatImport({
  onTelecharger,
}: {
  onTelecharger: () => void;
}): JSX.Element {
  const exempleTexte = [
    TEMPLATE_HEADER.join(','),
    ...TEMPLATE_EXEMPLES.map((l) => l.join(',')),
  ].join('\n');

  return (
    <details
      open
      className="rounded-md border border-(--primary)/30 bg-(--primary)/5"
      data-testid="aide-format"
    >
      <summary className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 text-sm font-semibold">
        <Info className="h-4 w-4 text-(--primary)" />
        Format attendu (9 colonnes) — aide
      </summary>

      <div className="px-3 pb-3 space-y-3">
        {/* Tableau des 9 colonnes */}
        <div className="overflow-x-auto rounded border border-(--border) bg-(--background)">
          <table className="w-full text-xs" data-testid="aide-colonnes">
            <thead className="bg-(--muted) text-(--muted-foreground)">
              <tr>
                <th className="text-left px-2 py-1.5">Colonne</th>
                <th className="text-left px-2 py-1.5">Format</th>
                <th className="text-left px-2 py-1.5 whitespace-nowrap">
                  Obligatoire
                </th>
              </tr>
            </thead>
            <tbody>
              {COLONNES_AIDE.map((c) => (
                <tr key={c.nom} className="border-t border-(--border)">
                  <td className="px-2 py-1 font-mono">{c.nom}</td>
                  <td className="px-2 py-1">{c.format}</td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {c.obligatoire}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Exemple concret */}
        <div>
          <p className="text-xs font-semibold mb-1">Exemple concret</p>
          <pre
            className="overflow-x-auto rounded border border-(--border) bg-(--muted) p-2 text-[11px] font-mono leading-relaxed"
            data-testid="aide-exemple"
          >
            {exempleTexte}
          </pre>
        </div>

        {/* À retenir */}
        <div>
          <p className="text-xs font-semibold mb-1">À retenir</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-(--muted-foreground)">
            <li>
              1 ligne = 1 mois. Un budget annuel = 12 lignes par couple
              compte × ligne métier.
            </li>
            <li>Vous ne pouvez importer que dans votre périmètre RBAC.</li>
            <li>
              L'import ne fonctionne que si la version est{' '}
              <strong>ouverte</strong> (Brouillon).
            </li>
            <li>Formats acceptés : CSV et XLSX (max 10 Mo).</li>
          </ul>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onTelecharger}
          data-testid="aide-btn-template"
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger le template Excel
        </Button>
      </div>
    </details>
  );
}

interface ImportBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionId: string | null;
  versionCode?: string;
  /** Libellé de la version cible — affiché en grand pour confirmation (UX C.1). */
  versionLibelle?: string;
  scenarioId: string | null;
  scenarioCode?: string;
  /** Libellé du scénario cible — affiché en grand pour confirmation (UX C.1). */
  scenarioLibelle?: string;
  /** Appelé après un import accepté (lignesInserees+modifiees > 0). */
  onSucces?: () => void;
}

function tailleHumaine(taille: number): string {
  if (taille < 1024) return `${taille} o`;
  if (taille < 1024 * 1024) return `${(taille / 1024).toFixed(1)} ko`;
  return `${(taille / 1024 / 1024).toFixed(2)} Mo`;
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
    return msg;
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function ImportBudgetDialog({
  isOpen,
  onClose,
  versionId,
  versionCode,
  versionLibelle,
  scenarioId,
  scenarioCode,
  scenarioLibelle,
  onSucces,
}: ImportBudgetDialogProps): JSX.Element {
  const [etape, setEtape] = useState<Etape>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rapport, setRapport] = useState<ImportBudgetRapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // UX C.1 — checkbox de confirmation explicite : protège contre les
  // imports « par accident » sur le mauvais scénario (cas vécu BSIC).
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setEtape('selection');
    setFile(null);
    setRapport(null);
    setErreur(null);
    setDragOver(false);
    setConfirmed(false);
  }, []);

  const handleClose = useCallback(() => {
    if (etape === 'upload') return; // pas de fermeture pendant upload
    reset();
    onClose();
  }, [etape, onClose, reset]);

  function handleSelectFile(f: File): void {
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
      toast.error(
        `Format non supporté (${f.name}). Attendu : .csv ou .xlsx.`,
      );
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error(
        `Fichier trop volumineux (${tailleHumaine(f.size)}). Limite : 10 Mo.`,
      );
      return;
    }
    setFile(f);
    setErreur(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleSelectFile(f);
  }

  function downloadTemplate(): void {
    const blob = genererTemplateCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-budget.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleUpload(): Promise<void> {
    if (!file || !versionId || !scenarioId) return;
    setEtape('upload');
    setErreur(null);
    try {
      const r = await importBudget(file, versionId, scenarioId);
      setRapport(r);
      setEtape('rapport');
      if (!r.transactionRollback && r.lignesInserees + r.lignesModifiees > 0) {
        toast.success(
          `Import terminé : ${r.lignesInserees} insérée${r.lignesInserees > 1 ? 's' : ''}, ` +
            `${r.lignesModifiees} modifiée${r.lignesModifiees > 1 ? 's' : ''}.`,
        );
        onSucces?.();
      } else if (r.transactionRollback) {
        toast.error(
          `Trop d'erreurs (>10 %), aucune ligne sauvegardée. Corrigez le fichier et réessayez.`,
        );
      }
    } catch (err) {
      setErreur(parseError(err));
      setEtape('selection');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Excel / CSV de saisie budgétaire</DialogTitle>
          <DialogDescription>
            Chargez un fichier .csv ou .xlsx (9 colonnes). Le système valide
            chaque ligne et applique votre périmètre RBAC.
          </DialogDescription>
        </DialogHeader>

        {/* ÉTAPE 1 : Sélection */}
        {etape === 'selection' && (
          <div className="space-y-4" data-testid="etape-selection">
            {/* UX C.1 — bandeau contexte mis en évidence : la cible
                de l'import doit être impossible à manquer pour éviter
                les écrasements accidentels (cas vécu BSIC Niger). */}
            <div
              className="rounded-md border-2 border-(--primary)/40 bg-(--primary)/5 p-4"
              data-testid="bandeau-contexte"
            >
              <p className="text-xs uppercase tracking-wide font-semibold text-(--muted-foreground) mb-2">
                Cible de l'import
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase text-(--muted-foreground)">
                    Version
                  </p>
                  <p
                    className="text-base font-bold text-(--foreground)"
                    data-testid="contexte-version-libelle"
                  >
                    {versionLibelle ?? versionCode ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-(--muted-foreground)">
                    Scénario
                  </p>
                  <p
                    className="text-base font-bold text-orange-600 dark:text-orange-400"
                    data-testid="contexte-scenario-libelle"
                  >
                    {scenarioLibelle ?? scenarioCode ?? '—'}
                  </p>
                </div>
              </div>
              <div
                className="mt-3 flex items-start gap-2 rounded border border-orange-300 bg-orange-50 dark:bg-orange-950/30 p-2 text-xs"
                role="note"
              >
                <span aria-hidden>⚠️</span>
                <span>
                  Les données existantes pour ce scénario seront{' '}
                  <strong>mises à jour ou créées</strong> selon les lignes
                  du fichier. Les autres scénarios ne sont pas touchés.
                </span>
              </div>
            </div>

            {/* Aide en ligne : format des 9 colonnes + exemple + rappels. */}
            <AideFormatImport onTelecharger={downloadTemplate} />

            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              className={`rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-(--primary) bg-(--primary)/5'
                  : 'border-(--border)'
              }`}
              data-testid="drop-zone"
            >
              {file ? (
                <div
                  className="flex items-center justify-center gap-3"
                  data-testid="file-selected"
                >
                  {file.name.toLowerCase().endsWith('.xlsx') ? (
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-blue-600" />
                  )}
                  <div className="text-left text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-(--muted-foreground)">
                      {tailleHumaine(file.size)} ·{' '}
                      {file.name.toLowerCase().endsWith('.xlsx')
                        ? 'Excel'
                        : 'CSV'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    aria-label="Retirer le fichier"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-(--muted-foreground)" />
                  <p className="mt-2 text-sm">
                    Glissez-déposez un fichier ici, ou
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => inputRef.current?.click()}
                    data-testid="btn-parcourir"
                  >
                    Parcourir
                  </Button>
                  <p className="mt-3 text-xs text-(--muted-foreground)">
                    Formats acceptés : .csv, .xlsx · Taille max : 10 Mo
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSelectFile(f);
                }}
                data-testid="input-file"
              />
            </div>

            {/* UX C.1 — checkbox de confirmation explicite. */}
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-(--primary)"
                data-testid="checkbox-confirmation"
              />
              <span>
                Je confirme importer dans le scénario{' '}
                <strong className="text-orange-600 dark:text-orange-400">
                  {scenarioLibelle ?? scenarioCode ?? '—'}
                </strong>
                .
              </span>
            </label>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                data-testid="btn-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le template
              </Button>
              {erreur && (
                <span
                  className="text-xs text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {erreur}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Upload */}
        {etape === 'upload' && (
          <div
            className="py-8 text-center text-sm text-(--muted-foreground)"
            data-testid="etape-upload"
          >
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-(--primary) border-t-transparent" />
            <p className="mt-3">Traitement en cours…</p>
          </div>
        )}

        {/* ÉTAPE 3 : Rapport */}
        {etape === 'rapport' && rapport && (
          <RapportImport rapport={rapport} />
        )}

        <DialogFooter>
          {etape === 'selection' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || !versionId || !scenarioId || !confirmed}
                title={
                  !confirmed
                    ? 'Cochez la confirmation du scénario cible avant d\'importer'
                    : undefined
                }
                data-testid="btn-importer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
            </>
          )}
          {etape === 'rapport' && (
            <>
              <Button variant="outline" onClick={reset}>
                Importer un autre fichier
              </Button>
              <Button onClick={handleClose}>Fermer</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composant : Rapport ────────────────────────────────────────

function RapportImport({
  rapport,
}: {
  rapport: ImportBudgetRapport;
}): JSX.Element {
  return (
    <div className="space-y-4" data-testid="etape-rapport">
      {rapport.transactionRollback && (
        <div
          className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-4"
          role="alert"
          data-testid="rollback-alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-200">
              Trop d'erreurs (&gt; 10 %), aucune ligne n'a été sauvegardée.
            </p>
            <p className="mt-1 text-red-700 dark:text-red-300">
              Corrigez le fichier puis réessayez. Le détail ligne par ligne
              est ci-dessous.
            </p>
          </div>
        </div>
      )}

      {!rapport.transactionRollback &&
        rapport.lignesInserees + rapport.lignesModifiees > 0 && (
          <div
            className="flex items-start gap-3 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 p-4"
            data-testid="success-alert"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-900 dark:text-green-200">
              Import terminé en {rapport.dureeMs} ms.
            </div>
          </div>
        )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Traitées" value={rapport.lignesTotal} />
        <StatCard
          label="Insérées"
          value={rapport.lignesInserees}
          tone="success"
        />
        <StatCard
          label="Modifiées"
          value={rapport.lignesModifiees}
          tone="info"
        />
        <StatCard
          label="Rejetées"
          value={rapport.lignesRejetees}
          tone={rapport.lignesRejetees > 0 ? 'danger' : undefined}
        />
      </div>

      {rapport.lignesIgnorees > 0 && (
        <p className="text-xs text-(--muted-foreground)">
          {rapport.lignesIgnorees} ligne(s) identique(s) à l'existant —
          ignorées (pas de bruit historique).
        </p>
      )}

      {/* Erreurs détaillées */}
      {rapport.erreurs.length > 0 && (
        <div className="space-y-2" data-testid="erreurs-table">
          <h4 className="text-sm font-semibold">
            Erreurs ({rapport.erreurs.length})
          </h4>
          <div className="max-h-64 overflow-y-auto rounded-md border border-(--border)">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-(--muted)">
                <tr className="text-xs text-(--muted-foreground)">
                  <th className="text-left px-3 py-2">Ligne</th>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {rapport.erreurs.map((e, i) => (
                  <tr
                    key={i}
                    className="border-t border-(--border)"
                    data-testid={`erreur-ligne-${e.ligneNumero}`}
                  >
                    <td className="px-3 py-1.5 font-mono">{e.ligneNumero}</td>
                    <td className="px-3 py-1.5">
                      <span className="rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-mono">
                        {e.code}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings */}
      {rapport.warnings.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-(--muted-foreground) hover:text-(--foreground)">
            Avertissements ({rapport.warnings.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {rapport.warnings.map((w, i) => (
              <li key={i}>
                <span className="font-mono">L{w.ligneNumero}</span> ·{' '}
                <span className="font-mono text-orange-600">{w.code}</span> :{' '}
                {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'danger';
}): JSX.Element {
  const cls =
    tone === 'success'
      ? 'border-green-300 text-green-700 dark:text-green-400'
      : tone === 'info'
        ? 'border-blue-300 text-blue-700 dark:text-blue-400'
        : tone === 'danger'
          ? 'border-red-300 text-red-700 dark:text-red-400'
          : 'border-(--border)';
  return (
    <div className={`rounded-md border p-3 text-center ${cls}`}>
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-80">
        {label}
      </div>
    </div>
  );
}
