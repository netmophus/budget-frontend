/**
 * ComptesPage (Lot 2.5E + Lot 7.3 V12 refonte Charte v1).
 *
 * Plan Comptable Bancaire UMOA — référentiel hiérarchique 4 niveaux
 * (SCD2 + classes 1 à 9).
 *
 * Refonte V12 :
 *  - Header custom : cercle Calculator catégorie config (gris ardoise)
 *    + titre + sous-libellé "(PCB UMOA)" + 2 boutons droite (Importer
 *    CSV outline + Nouveau compte bleu nuit dark)
 *  - 5 KPI cards (Total actifs / Racines / Feuilles / Saisissables /
 *    Porteurs int.) calculées useMemo
 *  - Barre de filtres dans cadre gris (2 lignes : selects + checkboxes)
 *  - Tableau grid CSS modernisé avec sous-composants `ClasseBadge`
 *    (pastille colorée par classe), `SensBadge`, `StatutBadge`,
 *    indicateur Folder/FileText pour collectif/feuille
 *  - Indentation progressive par niveau + icône CornerDownRight
 *    sur les non-racines
 */
import { AxiosError } from 'axios';
import {
  Calculator,
  Check,
  CornerDownRight,
  FileText,
  Folder,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DetailDrawer } from '@/components/common/DetailDrawer';
import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
import { CompteFormDrawer } from '@/components/comptes/CompteFormDrawer';
import { CompteImportDialog } from '@/components/comptes/CompteImportDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Compte,
  deleteCompte,
  getCompteHistorique,
  listComptes,
} from '@/lib/api/referentiels';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  badgeClassClasseCompte,
  libelleSensCompte,
} from '@/lib/labels/referentiels';
import { cn } from '@/lib/utils';

const ALL_NIVEAUX = '__all__';
const DEFAULT_LIMIT = 50;
const PAGE_SIZES = [20, 50, 100];
const NIVEAUX = [1, 2, 3, 4];

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

/** Couleurs Charte v1 par classe PCB (1-9). */
const COULEUR_CLASSE: Record<string, string> = {
  '1': '#0C447C', // bleu nuit
  '2': '#5B4E91', // violet
  '3': '#0F6E56', // vert
  '4': '#0F6E56', // vert
  '5': '#BA7517', // ambre
  '6': '#B05D3F', // terracotta
  '7': '#5F6B7A', // gris
  '8': '#5F6B7A',
  '9': '#5F6B7A',
};

function couleurClasse(classe: string): string {
  return COULEUR_CLASSE[classe] ?? '#5F6B7A';
}

export function ComptesPage() {
  const canGerer = useHasPermission('REFERENTIEL.GERER');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState<string>('');
  const [niveauFilter, setNiveauFilter] = useState<string>(ALL_NIVEAUX);
  const [racinesUniquement, setRacinesUniquement] = useState(false);
  const [feuillesUniquement, setFeuillesUniquement] = useState(false);
  const [porteursUniquement, setPorteursUniquement] = useState(false);
  const [activesUniquement, setActivesUniquement] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [data, setData] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState<Compte | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Compte | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    classeFilter,
    niveauFilter,
    racinesUniquement,
    feuillesUniquement,
    porteursUniquement,
    activesUniquement,
    debouncedSearch,
    limit,
  ]);

  useEffect(() => {
    setLoading(true);
    listComptes({
      page,
      limit,
      classe: classeFilter || undefined,
      search: debouncedSearch || undefined,
      estCompteCollectif: feuillesUniquement ? false : undefined,
      estPorteurInterets: porteursUniquement ? true : undefined,
    })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger les comptes');
      })
      .finally(() => setLoading(false));
  }, [
    page,
    limit,
    classeFilter,
    feuillesUniquement,
    porteursUniquement,
    debouncedSearch,
    refreshKey,
  ]);

  function parseApiError(err: unknown): { status: number; message: string } {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const dataMsg =
        (err.response?.data as { message?: string | string[] } | undefined)
          ?.message;
      const message = Array.isArray(dataMsg)
        ? dataMsg.join(' ; ')
        : (dataMsg ?? err.message);
      return { status, message };
    }
    return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
  }

  async function handleDeleteConfirmed(): Promise<void> {
    if (!confirmDelete) return;
    try {
      await deleteCompte(confirmDelete.codeCompte);
      toast.success(`Compte ${confirmDelete.codeCompte} désactivé.`);
      setConfirmDelete(null);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        toast.error(message);
      } else if (status === 404) {
        toast.error('Compte introuvable.');
      } else {
        toast.error(message || 'Désactivation refusée.');
      }
      throw err;
    }
  }

  // Filtres niveau / racines / actives uniquement appliqués côté client.
  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (racinesUniquement && c.fkCompteParent !== null) return false;
      if (activesUniquement && !c.estActif) return false;
      if (niveauFilter !== ALL_NIVEAUX && String(c.niveau) !== niveauFilter)
        return false;
      return true;
    });
  }, [data, racinesUniquement, activesUniquement, niveauFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau - b.niveau;
      return a.codeCompte.localeCompare(b.codeCompte);
    });
  }, [filtered]);

  // 5 KPI cards (sur les data filtrées par le serveur uniquement,
  // pour cohérence avec l'affichage tableau).
  const kpi = useMemo(() => {
    const actifs = data.filter((c) => c.estActif);
    return {
      totalActifs: actifs.length,
      racines: actifs.filter((c) => c.fkCompteParent === null).length,
      feuilles: actifs.filter((c) => !c.estCompteCollectif).length,
      saisissables: actifs.filter(
        (c) => !c.estCompteCollectif && c.estActif,
      ).length,
      porteurs: actifs.filter((c) => c.estPorteurInterets).length,
    };
  }, [data]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#5F6B7A1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <Calculator className="w-5 h-5" style={{ color: '#5F6B7A' }} />
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Comptes{' '}
              <span className="text-(--muted-foreground) font-normal text-sm">
                (PCB UMOA)
              </span>
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Plan Comptable Bancaire UMOA — référentiel hiérarchique
              4 niveaux (SCD2)
            </p>
          </div>
        </div>

        {canGerer && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="h-9 gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Importer CSV
            </Button>
            <Button
              onClick={() => setFormMode('create')}
              className="h-9 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau compte
            </Button>
          </div>
        )}
      </div>

      {/* ─── 5 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <KpiCardCompte label="Total actifs" value={kpi.totalActifs} color="#0F6E56" testId="kpi-comptes-total-actifs" />
        <KpiCardCompte label="Racines" value={kpi.racines} color="#0C447C" testId="kpi-comptes-racines" />
        <KpiCardCompte label="Feuilles" value={kpi.feuilles} color="#BA7517" testId="kpi-comptes-feuilles" />
        <KpiCardCompte label="Saisissables" value={kpi.saisissables} color="#5B4E91" testId="kpi-comptes-saisissables" />
        <KpiCardCompte label="Porteurs int." value={kpi.porteurs} color="#B05D3F" testId="kpi-comptes-porteurs" />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_100px] gap-2.5 mb-2.5">
          <div>
            <Label htmlFor="search-comptes" className="text-xs mb-1 block">
              Recherche libellé / code
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-comptes"
                placeholder="ex. salaires"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="classe-filter" className="text-xs mb-1 block">
              Classe PCB
            </Label>
            <RefSecondaireSelect
              id="classe-filter"
              refKey="classe-compte"
              value={classeFilter}
              onValueChange={setClasseFilter}
              labelChamp="les classes PCB"
              placeholder="Toutes"
              showWarningIfDisabled={false}
            />
          </div>

          <div>
            <Label htmlFor="niveau-filter" className="text-xs mb-1 block">
              Niveau
            </Label>
            <Select value={niveauFilter} onValueChange={setNiveauFilter}>
              <SelectTrigger id="niveau-filter" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_NIVEAUX}>Tous</SelectItem>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Niveau {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="limit-select" className="text-xs mb-1 block">
              Lignes / page
            </Label>
            <Select
              value={String(limit)}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger id="limit-select" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-(--border)">
          <CheckboxLabel
            checked={racinesUniquement}
            onChange={setRacinesUniquement}
            label="Racines uniquement"
          />
          <CheckboxLabel
            checked={feuillesUniquement}
            onChange={setFeuillesUniquement}
            label="Feuilles uniquement (saisissables)"
          />
          <CheckboxLabel
            checked={porteursUniquement}
            onChange={setPorteursUniquement}
            label="Porteurs d'intérêts"
          />
          <CheckboxLabel
            checked={activesUniquement}
            onChange={setActivesUniquement}
            label="Actifs uniquement"
          />
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="comptes-table"
      >
        <div className="grid grid-cols-[80px_1fr_60px_50px_50px_60px_50px_110px_90px] bg-(--secondary) px-4 py-2.5 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Classe</ColumnHeader>
          <ColumnHeader>N</ColumnHeader>
          <ColumnHeader>Sens</ColumnHeader>
          <ColumnHeader>Type</ColumnHeader>
          <ColumnHeader>Int.</ColumnHeader>
          <ColumnHeader>Poste</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucun compte ne correspond aux filtres.
          </div>
        )}
        {!loading &&
          sorted.map((compte) => (
            <button
              key={compte.id}
              type="button"
              onClick={() => setSelected(compte)}
              data-testid={`compte-row-${compte.id}`}
              style={{ paddingLeft: `${16 + (compte.niveau - 1) * 16}px` }}
              className="w-full text-left grid grid-cols-[80px_1fr_60px_50px_50px_60px_50px_110px_90px] pr-4 py-2.5 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors tabular-nums"
            >
              <div
                className="font-mono text-[13px]"
                style={{ color: couleurClasse(compte.classe) }}
              >
                {compte.codeCompte}
              </div>

              <div className="flex items-center gap-1.5">
                {compte.niveau > 1 && (
                  <CornerDownRight
                    className="w-3 h-3 text-(--muted-foreground)/50 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="text-[13px]">{compte.libelle}</span>
              </div>

              <div>
                <ClasseBadge classe={compte.classe} />
              </div>

              <div className="text-[13px] text-(--muted-foreground)">
                {compte.niveau}
              </div>

              <div>
                {compte.sens ? (
                  <SensBadge sens={compte.sens} />
                ) : (
                  <span className="text-[13px] text-(--muted-foreground)/60">
                    —
                  </span>
                )}
              </div>

              <div>
                {compte.estCompteCollectif ? (
                  <Folder
                    className="w-3.5 h-3.5 text-(--miznas-ambre)"
                    aria-label="Compte collectif"
                  />
                ) : (
                  <FileText
                    className="w-3.5 h-3.5 text-(--miznas-cat-config)"
                    aria-label="Compte feuille saisissable"
                  />
                )}
              </div>

              <div className="text-[13px]">
                {compte.estPorteurInterets ? (
                  <Check
                    className="w-3.5 h-3.5 text-(--miznas-cat-validation)"
                    aria-label="Porteur d'intérêts"
                  />
                ) : (
                  <span className="text-(--muted-foreground)/60">—</span>
                )}
              </div>

              <div className="text-[12px] text-(--muted-foreground) font-mono truncate">
                {compte.codePosteBudgetaire || '—'}
              </div>

              <div>
                <StatutCompteBadge actif={compte.estActif} />
              </div>
            </button>
          ))}
      </div>

      <DetailDrawer<Compte, Compte>
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        entity={selected ?? undefined}
        title={selected ? `Compte ${selected.codeCompte}` : ''}
        description={selected?.libelle}
        fields={
          selected
            ? [
                {
                  label: 'Classe',
                  value: (
                    <Badge className={badgeClassClasseCompte(selected.classe)}>
                      {selected.classe}
                    </Badge>
                  ),
                },
                { label: 'Sous-classe', value: selected.sousClasse },
                { label: 'Niveau', value: selected.niveau },
                {
                  label: 'Sens',
                  value: selected.sens
                    ? `${selected.sens} — ${libelleSensCompte(selected.sens)}`
                    : null,
                },
                {
                  label: 'Poste budgétaire',
                  value: selected.codePosteBudgetaire,
                },
                {
                  label: 'Type',
                  value: selected.estCompteCollectif
                    ? 'Collectif (agrégat)'
                    : 'Feuille (saisissable budget)',
                },
                {
                  label: "Porteur d'intérêts",
                  value: selected.estPorteurInterets ? 'Oui' : 'Non',
                },
                {
                  label: 'Statut',
                  value: selected.estActif ? 'Actif' : 'Inactif',
                },
                {
                  label: 'Validité',
                  value: `depuis ${formatDateFr(selected.dateDebutValidite)}${
                    selected.dateFinValidite
                      ? ` jusqu'au ${formatDateFr(selected.dateFinValidite)}`
                      : ''
                  }`,
                },
                {
                  label: 'Version courante',
                  value: selected.versionCourante ? 'Oui' : 'Non',
                },
                { label: 'Créé par', value: selected.utilisateurCreation },
                {
                  label: 'Dernière modification',
                  value: selected.utilisateurModification,
                },
              ]
            : []
        }
        footer={
          selected ? (
            <div className="space-y-3">
              {selected.parentCourant && (
                <button
                  type="button"
                  className="text-sm text-(--primary) hover:underline"
                  onClick={() => {
                    if (!selected?.parentCourant) return;
                    listComptes({
                      search: selected.parentCourant.codeCompte,
                      page: 1,
                      limit: 1,
                    })
                      .then((res) => {
                        const parent = res.items.find(
                          (c) =>
                            c.codeCompte === selected.parentCourant!.codeCompte,
                        );
                        if (parent) setSelected(parent);
                      })
                      .catch(() =>
                        toast.error('Impossible de charger le compte parent'),
                      );
                  }}
                >
                  Voir le parent : {selected.parentCourant.codeCompte} —{' '}
                  {selected.parentCourant.libelle}
                </button>
              )}
              {canGerer && (
                <div className="flex items-center gap-2">
                  {selected.estActif && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setFormMode('edit')}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmDelete(selected)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Désactiver
                      </Button>
                    </>
                  )}
                  {!selected.estActif && (
                    <span className="text-xs text-(--muted-foreground)">
                      Compte inactif — pour le réactiver, utilisez Modifier
                      puis cochez Actif.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null
        }
        loadHistory={
          selected
            ? () => getCompteHistorique(selected.codeCompte)
            : undefined
        }
        renderHistoryRow={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{row.libelle}</div>
              <div className="text-xs text-(--muted-foreground)">
                du {formatDateFr(row.dateDebutValidite)}
                {row.dateFinValidite
                  ? ` au ${formatDateFr(row.dateFinValidite)}`
                  : " à aujourd'hui"}
              </div>
            </div>
            {row.versionCourante ? (
              <Badge variant="success">Courante</Badge>
            ) : (
              <Badge variant="secondary">Historique</Badge>
            )}
          </div>
        )}
      />

      <CompteFormDrawer
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        onSuccess={(compte) => {
          if (formMode === 'create') {
            toast.success(`Compte ${compte.codeCompte} créé.`);
          }
          setFormMode(null);
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      <CompteImportDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />

      {confirmDelete && (
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirmed}
          title={`Désactiver le compte ${confirmDelete.codeCompte} ?`}
          description={
            <>
              <p>
                <strong>
                  {confirmDelete.codeCompte} — {confirmDelete.libelle}
                </strong>
              </p>
              <p className="mt-2">
                Ce compte ne pourra plus être utilisé pour de nouvelles
                saisies budgétaires. Les saisies déjà effectuées
                restent rattachées à ce compte dans l&apos;historique.
              </p>
              <p className="mt-2 text-xs text-(--muted-foreground)">
                Si ce compte a des enfants courants, le backend
                refusera la désactivation (409) — désactivez d&apos;abord
                les descendants.
              </p>
            </>
          }
          confirmText="Désactiver"
          cancelText="Annuler"
          destructive
        />
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiCardCompteProps {
  label: string;
  value: number;
  color: string;
  testId: string;
}

function KpiCardCompte({
  label,
  value,
  color,
  testId,
}: KpiCardCompteProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-2.5 px-3"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div
        className="text-xl font-medium tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

interface CheckboxLabelProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function CheckboxLabel({
  checked,
  onChange,
  label,
}: CheckboxLabelProps): JSX.Element {
  return (
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
      />
      {label}
    </label>
  );
}

function ColumnHeader({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}

export function ClasseBadge({ classe }: { classe: string }): JSX.Element {
  return (
    <span
      data-testid={`classe-badge-${classe}`}
      style={{ backgroundColor: couleurClasse(classe) }}
      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-[11px] font-bold text-white tabular-nums"
    >
      {classe}
    </span>
  );
}

const SENS_CONFIG: Record<
  'D' | 'C' | 'M',
  { bg: string; text: string; label: string }
> = {
  D: {
    bg: 'bg-(--destructive)/10',
    text: 'text-(--destructive)',
    label: 'Débit',
  },
  C: {
    bg: 'bg-(--miznas-cat-validation)/10',
    text: 'text-(--miznas-cat-validation)',
    label: 'Crédit',
  },
  M: {
    bg: 'bg-(--muted)',
    text: 'text-(--muted-foreground)',
    label: 'Mixte',
  },
};

export function SensBadge({ sens }: { sens: 'D' | 'C' | 'M' }): JSX.Element {
  const cfg = SENS_CONFIG[sens];
  return (
    <span
      data-testid={`sens-badge-${sens}`}
      title={cfg.label}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold',
        cfg.bg,
        cfg.text,
      )}
    >
      {sens}
    </span>
  );
}

function StatutCompteBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-compte-actif"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
          aria-hidden="true"
        />
        Actif
      </span>
    );
  }
  return (
    <span
      data-testid="statut-compte-inactif"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactif
    </span>
  );
}
