/**
 * Dialogue d'import Excel/CSV de réalisé (Lot 5.1.B). 3 étapes
 * (sélection / progression / rapport).
 *
 * NOTE produit : le mandat 5.1.B.2 prévoyait une étape 2
 * "prévisualisation locale" avec parsing client. Implémentation
 * minimale ici : pas de prévisualisation locale (zéro nouvelle
 * dépendance npm comme xlsx ou papa-parse). On affiche juste le
 * nom + taille + format détecté du fichier, et l'utilisateur lance
 * directement l'import. Le rapport serveur est très détaillé
 * (compteurs + erreurs ligne par ligne + raisons d'ignorance) ce
 * qui couvre largement le besoin pédagogique. Cf. dette résiduelle
 * Lot 5.x si le besoin de preview locale s'avère critique.
 */
import { AxiosError } from 'axios';
import { Download, FileUp, Upload } from 'lucide-react';
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
import {
  importerRealise,
  type RapportImportRealise,
} from '@/lib/api/realise';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const COLONNES_OBLIGATOIRES = [
  'code_cr',
  'code_compte',
  'code_ligne_metier',
  'mois',
  'code_devise',
  'montant',
];

type Etape = 'selection' | 'progress' | 'rapport';

function parseError(err: unknown): { msg: string; status?: number } {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
    return { msg, status: err.response?.status };
  }
  return { msg: err instanceof Error ? err.message : 'Erreur' };
}

function detecterFormat(name: string): 'csv' | 'xlsx' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  return null;
}

function exporterRapportCsv(rapport: RapportImportRealise): void {
  const lignes = ['type,ligne,detail'];
  for (const e of rapport.erreurs) {
    lignes.push(`erreur,${e.ligne},"${e.message.replace(/"/g, '""')}"`);
  }
  for (const i of rapport.lignesIgnorees) {
    lignes.push(`ignoree,${i.ligne},"${i.raison.replace(/"/g, '""')}"`);
  }
  const blob = new Blob([lignes.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-import-realise-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RealiseImportDialog({
  isOpen,
  onClose,
  onImported,
}: Props): JSX.Element {
  const [etape, setEtape] = useState<Etape>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [rapport, setRapport] = useState<RapportImportRealise | null>(null);

  function handleClose(): void {
    if (etape === 'progress') return; // pas de fermeture pendant l'import
    setEtape('selection');
    setFile(null);
    setErreurFichier(null);
    setRapport(null);
    onClose();
  }

  function handleFileSelected(f: File): void {
    setErreurFichier(null);
    const format = detecterFormat(f.name);
    if (!format) {
      setErreurFichier('Format non supporté. Attendu : .csv ou .xlsx.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setErreurFichier(
        `Fichier trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
      );
      return;
    }
    setFile(f);
  }

  async function handleLancerImport(): Promise<void> {
    if (!file) return;
    setEtape('progress');
    try {
      const r = await importerRealise(file);
      setRapport(r);
      setEtape('rapport');
      if (r.nbErreurs === 0) {
        toast.success(
          `Import réussi : ${r.nbLignesCreees} créée(s), ${r.nbLignesMisesAJour} mise(s) à jour.`,
        );
      } else {
        toast.error(
          `Import partiel : ${r.nbErreurs} erreur(s), ${r.nbLignesIgnorees} ignorée(s).`,
        );
      }
      onImported();
    } catch (err) {
      const { msg, status } = parseError(err);
      if (status === 403) {
        toast.error("Vous n'avez pas les droits pour importer.");
      } else if (status === 413) {
        toast.error('Fichier trop volumineux côté serveur (max 10 MB).');
      } else {
        toast.error(`Échec import : ${msg}`);
      }
      setEtape('selection');
    }
  }

  const erreursAffichees = rapport
    ? rapport.erreurs.slice(0, 50)
    : [];
  const erreursReste = rapport
    ? Math.max(0, rapport.erreurs.length - 50)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="!max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import réalisé Excel/CSV</DialogTitle>
          <DialogDescription>
            Format attendu : 6 colonnes obligatoires (
            {COLONNES_OBLIGATOIRES.join(', ')}) + 2 optionnelles (mode,
            commentaire).
          </DialogDescription>
        </DialogHeader>

        {etape === 'selection' && (
          <div className="space-y-3">
            <div
              className="rounded-md border-2 border-dashed border-(--border) p-6 text-center"
              data-testid="zone-fichier"
            >
              <FileUp className="h-8 w-8 mx-auto text-(--muted-foreground) mb-2" />
              <p className="text-sm text-(--muted-foreground) mb-3">
                Glissez-déposez un fichier ou cliquez pour sélectionner.
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                data-testid="input-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                className="block mx-auto"
              />
              {file && (
                <div
                  className="mt-3 text-sm rounded-md bg-(--muted)/50 p-2 inline-block"
                  data-testid="file-info"
                >
                  <strong>{file.name}</strong> —{' '}
                  {(file.size / 1024).toFixed(1)} KB —{' '}
                  {detecterFormat(file.name)?.toUpperCase()}
                </div>
              )}
              {erreurFichier && (
                <p
                  className="text-sm text-red-500 mt-2"
                  data-testid="erreur-fichier"
                >
                  {erreurFichier}
                </p>
              )}
            </div>
            <div className="text-xs text-(--muted-foreground)">
              Stratégie d'import : ligne existante en statut Importé →
              mise à jour ; en statut Validé → ignorée ; sinon → création.
              Toute ligne dont le CR est hors de votre périmètre est
              ignorée avec raison explicite.
            </div>
          </div>
        )}

        {etape === 'progress' && (
          <div
            className="py-12 text-center"
            data-testid="zone-progress"
          >
            <Upload className="h-10 w-10 mx-auto animate-pulse text-(--primary)" />
            <p className="text-sm mt-3">Import en cours…</p>
            <p className="text-xs text-(--muted-foreground)">
              Ne fermez pas cette fenêtre.
            </p>
          </div>
        )}

        {etape === 'rapport' && rapport && (
          <div className="space-y-3" data-testid="zone-rapport">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                className="rounded-md bg-green-100 text-green-800 p-3 text-center"
                data-testid="rapport-creees"
              >
                <div className="text-2xl font-bold">
                  {rapport.nbLignesCreees}
                </div>
                <div className="text-xs">Créées</div>
              </div>
              <div
                className="rounded-md bg-blue-100 text-blue-800 p-3 text-center"
                data-testid="rapport-maj"
              >
                <div className="text-2xl font-bold">
                  {rapport.nbLignesMisesAJour}
                </div>
                <div className="text-xs">Mises à jour</div>
              </div>
              <div
                className="rounded-md bg-amber-100 text-amber-800 p-3 text-center"
                data-testid="rapport-ignorees"
              >
                <div className="text-2xl font-bold">
                  {rapport.nbLignesIgnorees}
                </div>
                <div className="text-xs">Ignorées</div>
              </div>
              <div
                className="rounded-md bg-red-100 text-red-800 p-3 text-center"
                data-testid="rapport-erreurs"
              >
                <div className="text-2xl font-bold">{rapport.nbErreurs}</div>
                <div className="text-xs">Erreurs</div>
              </div>
            </div>

            {rapport.nbErreurs > 0 && (
              <div data-testid="zone-erreurs">
                <h4 className="text-sm font-semibold mt-3 mb-1">
                  Erreurs ({rapport.nbErreurs})
                </h4>
                <div className="max-h-32 overflow-y-auto rounded-md border border-(--border) text-xs">
                  <table className="w-full">
                    <thead className="bg-(--muted)/50 text-(--muted-foreground)">
                      <tr>
                        <th className="text-left p-1">N° ligne</th>
                        <th className="text-left p-1">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {erreursAffichees.map((e, i) => (
                        <tr
                          key={i}
                          className="border-b border-(--border)/50"
                        >
                          <td className="p-1">{e.ligne}</td>
                          <td className="p-1">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {erreursReste > 0 && (
                    <p className="p-1 text-(--muted-foreground) text-center">
                      … et {erreursReste} autre(s) erreur(s).
                    </p>
                  )}
                </div>
              </div>
            )}

            {rapport.nbLignesIgnorees > 0 && (
              <div data-testid="zone-ignorees">
                <h4 className="text-sm font-semibold mt-3 mb-1">
                  Lignes ignorées ({rapport.nbLignesIgnorees})
                </h4>
                <div className="max-h-32 overflow-y-auto rounded-md border border-(--border) text-xs">
                  <table className="w-full">
                    <thead className="bg-(--muted)/50 text-(--muted-foreground)">
                      <tr>
                        <th className="text-left p-1">N° ligne</th>
                        <th className="text-left p-1">Raison</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.lignesIgnorees.slice(0, 50).map((e, i) => (
                        <tr
                          key={i}
                          className="border-b border-(--border)/50"
                        >
                          <td className="p-1">{e.ligne}</td>
                          <td className="p-1">{e.raison}</td>
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
          {etape === 'selection' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="btn-annuler-import"
              >
                Annuler
              </Button>
              <Button
                onClick={handleLancerImport}
                disabled={!file || erreurFichier !== null}
                data-testid="btn-lancer-import"
              >
                Lancer l'import
              </Button>
            </>
          )}
          {etape === 'progress' && (
            <Button disabled>Import en cours…</Button>
          )}
          {etape === 'rapport' && rapport && (
            <>
              {(rapport.nbErreurs > 0 || rapport.nbLignesIgnorees > 0) && (
                <Button
                  variant="outline"
                  onClick={() => exporterRapportCsv(rapport)}
                  data-testid="btn-export-rapport"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le rapport
                </Button>
              )}
              <Button
                onClick={handleClose}
                data-testid="btn-fermer-rapport"
              >
                Fermer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
