/**
 * RealiseSaisiePage (Lot 5.1.B) — page principale du module
 * Réalisé. Sélecteur de contexte (CR + période + devise) + grille
 * mensuelle + actions (Importer / Nouvelle ligne / Valider lot).
 *
 * Pas de filtrage périmètre côté lecture (cohérent ADMIN.D) ; le
 * backend rejette en écriture si le user n'a pas accès au CR.
 *
 * Permissions :
 *   REALISE.LIRE       → consultation grille
 *   REALISE.SAISIR     → boutons Nouvelle ligne / Modifier
 *   REALISE.IMPORTER   → bouton Importer
 *   REALISE.VALIDER    → bouton Valider la sélection
 *   REALISE.SUPPRIMER  → action Supprimer dans le kebab
 */
import { Eye, FileUp, History, MoreVertical, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CreerModifierLigneRealiseDialog } from '@/components/realise/CreerModifierLigneRealiseDialog';
import { HistoriqueLigneRealiseDialog } from '@/components/realise/HistoriqueLigneRealiseDialog';
import { RealiseImportDialog } from '@/components/realise/RealiseImportDialog';
import { ValiderLignesRealiseDialog } from '@/components/realise/ValiderLignesRealiseDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { resolveFkTemps as resolveFkTempsUtil } from '@/lib/realise/resolve-fk-temps';
import {
  type FaitRealise,
  MODE_LABEL,
  SOURCE_LABEL,
  STATUT_LABEL,
  type StatutFaitRealise,
  supprimerRealise,
  type SourceFaitRealise,
} from '@/lib/api/realise';
import {
  type CentreResponsabilite,
  type Devise,
  listCrs,
  listDevises,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import { useRealiseStore } from '@/lib/stores/realise-store';

function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function statutClasse(s: StatutFaitRealise): string {
  if (s === 'IMPORTE') return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
}

interface CompteCache {
  [id: string]: { code: string; libelle: string };
}
interface LigneMetierCache {
  [id: string]: { code: string; libelle: string };
}
interface TempsCache {
  [id: string]: { mois: string; libelleAffiche: string };
}

export function RealiseSaisiePage(): JSX.Element {
  const canSaisir = useHasPermission('REALISE.SAISIR');
  const canImporter = useHasPermission('REALISE.IMPORTER');
  const canValider = useHasPermission('REALISE.VALIDER');
  const canSupprimer = useHasPermission('REALISE.SUPPRIMER');

  const {
    crId,
    moisDebut,
    moisFin,
    fkDeviseDefaut,
    lignes,
    selection,
    filtreCodeCompte,
    filtreStatut,
    filtreSource,
    loading,
    setCrId,
    setPeriode,
    setDeviseDefaut,
    setFiltreCodeCompte,
    setFiltreStatut,
    setFiltreSource,
    toggleSelection,
    clearSelection,
    fetchGrille,
  } = useRealiseStore();

  const [crs, setCrs] = useState<CentreResponsabilite[]>([]);
  const [devises, setDevises] = useState<Devise[]>([]);

  const [creerOuvert, setCreerOuvert] = useState(false);
  const [editing, setEditing] = useState<FaitRealise | null>(null);
  const [validerOuvert, setValiderOuvert] = useState(false);
  const [historiqueId, setHistoriqueId] = useState<string | null>(null);
  const [importOuvert, setImportOuvert] = useState(false);

  // Caches dim_*
  const [comptes, setComptes] = useState<CompteCache>({});
  const [lignesMetier, setLignesMetier] = useState<LigneMetierCache>({});
  const [temps, setTemps] = useState<TempsCache>({});

  useEffect(() => {
    Promise.all([listCrs({ limit: 200 }), listDevises({ estActive: true })])
      .then(([c, d]) => {
        setCrs(c.items);
        setDevises(d.items);
        if (!fkDeviseDefaut && d.items.length > 0) {
          const xof =
            d.items.find((x) => x.codeIso === 'XOF') ?? d.items[0]!;
          setDeviseDefaut(xof.id);
        }
      })
      .catch(() =>
        toast.error('Impossible de charger les référentiels (CR/devises).'),
      );
  }, []);

  useEffect(() => {
    void fetchGrille();
  }, [crId, moisDebut, moisFin]);

  // Charge les caches dim_* à partir des ids présents dans la grille.
  useEffect(() => {
    if (lignes.length === 0) return;
    const compteIds = Array.from(new Set(lignes.map((l) => l.fkCompte)));
    const lmIds = Array.from(new Set(lignes.map((l) => l.fkLigneMetier)));
    const tempsIds = Array.from(new Set(lignes.map((l) => l.fkTemps)));

    // Compte ids → /referentiels/comptes (1 par 1 si peu, sinon listing)
    if (compteIds.some((id) => !comptes[id])) {
      apiClient
        .get<{ items: Array<{ id: string; codeCompte: string; libelle: string }> }>(
          '/referentiels/comptes',
          { params: { limit: 200, versionCouranteUniquement: true } },
        )
        .then(({ data }) => {
          const c: CompteCache = {};
          for (const it of data.items) {
            c[it.id] = { code: it.codeCompte, libelle: it.libelle };
          }
          setComptes(c);
        })
        .catch(() => {});
    }
    if (lmIds.some((id) => !lignesMetier[id])) {
      apiClient
        .get<{
          items: Array<{ id: string; codeLigneMetier: string; libelle: string }>;
        }>('/referentiels/lignes-metier', {
          params: { limit: 200, versionCouranteUniquement: true },
        })
        .then(({ data }) => {
          const c: LigneMetierCache = {};
          for (const it of data.items) {
            c[it.id] = { code: it.codeLigneMetier, libelle: it.libelle };
          }
          setLignesMetier(c);
        })
        .catch(() => {});
    }
    if (tempsIds.some((id) => !temps[id])) {
      // L'API GET /referentiels/temps n'accepte pas `jour` en query
      // (DTO whitelist). On cible donc la plage `dateDebut`/`dateFin`
      // de la grille et on filtre côté client `jour === 1`.
      apiClient
        .get<{
          items: Array<{
            id: string;
            date: string;
            libelleMois: string;
            annee: number;
            jour: number;
          }>;
        }>('/referentiels/temps', {
          params: {
            limit: 366,
            dateDebut: `${moisDebut}-01`,
            dateFin: `${moisFin}-01`,
          },
        })
        .then(({ data }) => {
          const c: TempsCache = {};
          for (const it of data.items) {
            // Ne garder que les 1ers du mois — la grille réalisé est
            // mensuelle ; les autres jours du mois sont écartés.
            if (it.jour !== 1) continue;
            const mois = it.date.slice(0, 7);
            c[it.id] = {
              mois,
              libelleAffiche: `${it.libelleMois} ${it.annee}`,
            };
          }
          setTemps(c);
        })
        .catch(() => {});
    }
  }, [lignes]);

  async function resolveFkTemps(mois: string): Promise<string | null> {
    // Délégué à l'utility partagée (cf. lib/realise/resolve-fk-temps.ts).
    return resolveFkTempsUtil(mois, temps);
  }

  async function handleSupprimer(l: FaitRealise): Promise<void> {
    if (!window.confirm(`Supprimer la ligne #${l.id} (statut Importé) ?`))
      return;
    try {
      await supprimerRealise(l.id);
      toast.success('Ligne supprimée.');
      void fetchGrille();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Suppression refusée : ${msg}`);
    }
  }

  // Lignes filtrées (côté client — la grille fait le mois côté serveur)
  const lignesFiltrees = useMemo(() => {
    return lignes.filter((l) => {
      if (filtreStatut !== 'TOUS' && l.statut !== filtreStatut) return false;
      if (filtreSource !== 'TOUS' && l.source !== filtreSource) return false;
      if (filtreCodeCompte) {
        const code = comptes[l.fkCompte]?.code ?? '';
        if (!code.toLowerCase().includes(filtreCodeCompte.toLowerCase()))
          return false;
      }
      return true;
    });
  }, [lignes, filtreStatut, filtreSource, filtreCodeCompte, comptes]);

  const nbImporte = lignes.filter((l) => l.statut === 'IMPORTE').length;
  const nbValide = lignes.filter((l) => l.statut === 'VALIDE').length;
  const lignesSelectionnees = lignes.filter((l) => selection.has(l.id));

  return (
    <div>
      <PageHeader
        title="Saisie réalisé"
        description="Saisie manuelle / import du réalisé budgétaire mensuel. Workflow Importé → Validé."
        actions={
          <div className="flex items-center gap-2">
            {canImporter && (
              <Button
                variant="outline"
                onClick={() => setImportOuvert(true)}
                data-testid="btn-importer"
              >
                <FileUp className="h-4 w-4" />
                Importer
              </Button>
            )}
            {canValider && (
              <Button
                onClick={() => setValiderOuvert(true)}
                disabled={lignesSelectionnees.length === 0}
                data-testid="btn-valider-selection"
              >
                <ShieldCheck className="h-4 w-4" />
                Valider ({lignesSelectionnees.length})
              </Button>
            )}
            {canSaisir && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setCreerOuvert(true);
                }}
                disabled={!crId}
                data-testid="btn-nouvelle-ligne"
              >
                <Plus className="h-4 w-4" />
                Nouvelle ligne
              </Button>
            )}
          </div>
        }
      />

      {/* Sélecteur contexte */}
      <div
        className="rounded-md border border-(--border) p-3 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        data-testid="selecteur-contexte"
      >
        <div>
          <Label htmlFor="r-cr">Centre de responsabilité</Label>
          <Select
            value={crId ?? undefined}
            onValueChange={(v) => setCrId(v)}
          >
            <SelectTrigger id="r-cr" data-testid="r-cr">
              <SelectValue placeholder="Choisir un CR…" />
            </SelectTrigger>
            <SelectContent>
              {crs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codeCr} — {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="r-debut">Mois début</Label>
          <Input
            id="r-debut"
            data-testid="r-mois-debut"
            type="month"
            value={moisDebut}
            onChange={(e) => setPeriode(e.target.value, moisFin)}
          />
        </div>
        <div>
          <Label htmlFor="r-fin">Mois fin</Label>
          <Input
            id="r-fin"
            data-testid="r-mois-fin"
            type="month"
            value={moisFin}
            onChange={(e) => setPeriode(moisDebut, e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="r-deviseDefaut">Devise (défaut)</Label>
          <Select
            value={fkDeviseDefaut ?? undefined}
            onValueChange={setDeviseDefaut}
          >
            <SelectTrigger id="r-deviseDefaut" data-testid="r-devise-defaut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {devises.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.codeIso}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtres + compteurs */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label htmlFor="f-compte">Compte (filtre)</Label>
          <Input
            id="f-compte"
            data-testid="f-compte"
            placeholder="ex. 611"
            value={filtreCodeCompte}
            onChange={(e) => setFiltreCodeCompte(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="f-statut">Statut</Label>
          <Select
            value={filtreStatut}
            onValueChange={(v) => setFiltreStatut(v as never)}
          >
            <SelectTrigger id="f-statut" data-testid="f-statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS">Tous</SelectItem>
              <SelectItem value="IMPORTE">Importé</SelectItem>
              <SelectItem value="VALIDE">Validé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="f-source">Source</Label>
          <Select
            value={filtreSource}
            onValueChange={(v) => setFiltreSource(v as SourceFaitRealise | 'TOUS')}
          >
            <SelectTrigger id="f-source" data-testid="f-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS">Toutes</SelectItem>
              <SelectItem value="SAISIE">Saisie</SelectItem>
              <SelectItem value="IMPORT">Import</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-(--muted-foreground)">
          <span data-testid="compteur-total">{lignes.length}</span> lignes · {' '}
          <span data-testid="compteur-importe">{nbImporte}</span> Importé · {' '}
          <span data-testid="compteur-valide">{nbValide}</span> Validé
        </div>
      </div>

      {/* Tableau */}
      {!crId && (
        <p
          className="text-sm text-(--muted-foreground)"
          data-testid="empty-no-cr"
        >
          Sélectionnez un centre de responsabilité pour afficher la grille.
        </p>
      )}
      {crId && loading && (
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      )}
      {crId && !loading && lignesFiltrees.length === 0 && (
        <p
          className="text-sm text-(--muted-foreground)"
          data-testid="empty-grid"
        >
          Aucune ligne pour ce CR sur cette période. Importez un fichier ou
          ajoutez une ligne manuellement.
        </p>
      )}
      {crId && !loading && lignesFiltrees.length > 0 && (
        <table className="w-full text-xs" data-testid="grille-realise">
          <thead className="text-(--muted-foreground) border-b border-(--border)">
            <tr>
              <th className="p-2 w-8" />
              <th className="text-left p-2">Compte</th>
              <th className="text-left p-2">Ligne métier</th>
              <th className="text-left p-2">Mois</th>
              <th className="text-right p-2">Montant</th>
              <th className="text-left p-2">Mode</th>
              <th className="text-left p-2">Statut</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">⋮</th>
            </tr>
          </thead>
          <tbody>
            {lignesFiltrees.map((l) => (
              <tr
                key={l.id}
                className="border-b border-(--border)/50"
                data-testid={`ligne-${l.id}`}
              >
                <td className="p-2">
                  {l.statut === 'IMPORTE' && canValider && (
                    <input
                      type="checkbox"
                      checked={selection.has(l.id)}
                      onChange={() => toggleSelection(l.id)}
                      data-testid={`cb-${l.id}`}
                      aria-label={`Sélectionner ligne ${l.id}`}
                    />
                  )}
                </td>
                <td className="p-2">
                  {comptes[l.fkCompte]
                    ? `${comptes[l.fkCompte]!.code} — ${comptes[l.fkCompte]!.libelle.slice(0, 30)}`
                    : `#${l.fkCompte}`}
                </td>
                <td className="p-2">
                  {lignesMetier[l.fkLigneMetier]
                    ? lignesMetier[l.fkLigneMetier]!.code
                    : `#${l.fkLigneMetier}`}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {temps[l.fkTemps]?.libelleAffiche ?? `#${l.fkTemps}`}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {formatMontant(l.montant)}
                </td>
                <td className="p-2">
                  <Badge variant="secondary">{MODE_LABEL[l.mode]}</Badge>
                </td>
                <td className="p-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutClasse(l.statut)}`}
                    data-testid={`statut-${l.id}`}
                  >
                    {STATUT_LABEL[l.statut]}
                  </span>
                </td>
                <td className="p-2 text-(--muted-foreground)">
                  {l.source === 'IMPORT' ? '📥' : '✏️'}{' '}
                  <span className="text-xs">{SOURCE_LABEL[l.source]}</span>
                </td>
                <td className="p-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Actions"
                        data-testid={`btn-actions-${l.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canSaisir && l.statut === 'IMPORTE' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(l);
                            setCreerOuvert(true);
                          }}
                          data-testid={`act-modifier-${l.id}`}
                        >
                          <Pencil className="h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                      )}
                      {canSupprimer && l.statut === 'IMPORTE' && (
                        <DropdownMenuItem
                          onClick={() => handleSupprimer(l)}
                          data-testid={`act-supprimer-${l.id}`}
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setHistoriqueId(l.id)}
                        data-testid={`act-historique-${l.id}`}
                      >
                        <History className="h-4 w-4" /> Voir l'historique
                      </DropdownMenuItem>
                      {!canSaisir && !canSupprimer && (
                        <DropdownMenuItem disabled>
                          <Eye className="h-4 w-4" /> Lecture seule
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Dialogues */}
      {crId && (
        <CreerModifierLigneRealiseDialog
          isOpen={creerOuvert}
          onClose={() => {
            setCreerOuvert(false);
            setEditing(null);
          }}
          mode={editing ? 'edit' : 'create'}
          editing={editing}
          crId={crId}
          moisDebut={moisDebut}
          moisFin={moisFin}
          fkDeviseDefaut={fkDeviseDefaut}
          resolveFkTemps={resolveFkTemps}
          onSaved={() => {
            void fetchGrille();
          }}
        />
      )}
      <ValiderLignesRealiseDialog
        isOpen={validerOuvert}
        onClose={() => {
          setValiderOuvert(false);
          clearSelection();
        }}
        lignesSelectionnees={lignesSelectionnees}
      />
      {historiqueId && (
        <HistoriqueLigneRealiseDialog
          isOpen={historiqueId !== null}
          onClose={() => setHistoriqueId(null)}
          faitRealiseId={historiqueId}
        />
      )}
      <RealiseImportDialog
        isOpen={importOuvert}
        onClose={() => setImportOuvert(false)}
        onImported={() => void fetchGrille()}
      />
    </div>
  );
}
