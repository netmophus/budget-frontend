/**
 * VersionsAValiderPage (Lot 3.5, refonte Lot 7.3 — modernisation
 * visuelle de la file de validation).
 *
 * File d'attente du contrôleur — liste les versions au statut 'soumis'.
 * Charte v1 + maquette validée Lot 7.3 :
 *
 *   - En-tête : icône bleu nuit dark + titre + pill "Mon périmètre (N CR)"
 *   - 3 KPI cards (En attente / Anciennes >7j / Récentes <24h) :
 *     dot coloré + label uppercase + chiffre 28px bleu nuit
 *   - Barre de filtres unifiée (search + exercice + type sur une ligne)
 *   - Carte version 3 zones :
 *       Zone 1 (header) : badges + libellé + métadonnées (préparateur,
 *         date, email) + Montant total à droite
 *       Zone 2 (justification) : commentaireSoumission encadré gris
 *       Zone 3 (footer) : <details> historique + 3 boutons
 *         (Consulter la grille / Rejeter / Valider)
 *     Bordure gauche ambre 4px = "à traiter".
 *
 * Les actions Valider/Rejeter délèguent à <WorkflowActionDialog>
 * (extrait au Palier B.1) — la logique modale est partagée avec les
 * autres pages consommatrices.
 *
 * Permission requise : BUDGET.VALIDER (cf. AppRoutes.tsx).
 */
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Eye,
  Filter,
  Inbox,
  Mail,
  Search,
  Send,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  WorkflowActionDialog,
  type WorkflowAction,
} from '@/components/budget/WorkflowActionDialog';
import { WorkflowTimeline } from '@/components/budget/WorkflowTimeline';
import { BandeauDelegations } from '@/components/budget/BandeauDelegations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getMonPerimetre,
  getResumeVersion,
  listVersions,
  type MonPerimetre,
  type ResumeVersion,
  type Version,
} from '@/lib/api/versions';
import { formatDateFr, TYPES_VERSION } from '@/lib/labels/budget';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { TypeVersionBadge } from './VersionsPage';

const ALL = '__all__';

function daysSince(dateIso: string | null): number {
  if (!dateIso) return 0;
  return Math.floor(
    (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function hoursSince(dateIso: string | null): number {
  if (!dateIso) return 0;
  return Math.floor(
    (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60),
  );
}

function formatRelativeDate(dateIso: string | null): string {
  if (!dateIso) return '—';
  const minutes = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

const numberFmt = new Intl.NumberFormat('fr-FR');

export function VersionsAValiderPage(): JSX.Element {
  const navigate = useNavigate();
  const setVersionId = useBudgetGrilleStore((s) => s.setVersionId);

  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // null = erreur de fetch ou pas encore tenté ; undefined = en cours
  const [resumes, setResumes] = useState<
    Record<string, ResumeVersion | null>
  >({});
  const [perimetre, setPerimetre] = useState<MonPerimetre | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exerciceFilter, setExerciceFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);

  // Action workflow en cours (modale partagée — 1 instance pour toute la liste)
  const [dialogState, setDialogState] = useState<{
    version: Version;
    action: WorkflowAction;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch versions soumises
  useEffect(() => {
    setLoading(true);
    listVersions({ statut: 'soumis', page: 1, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error('Impossible de charger la file de validation.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Fetch périmètre user (une seule fois)
  useEffect(() => {
    getMonPerimetre()
      .then(setPerimetre)
      .catch(() => {
        // Non bloquant — la pill ne s'affichera juste pas.
        setPerimetre(null);
      });
  }, []);

  // Fetch résumés en batch dès qu'items change. Erreur par version =
  // resumes[id]=null, on n'interrompt pas le batch.
  useEffect(() => {
    if (items.length === 0) {
      setResumes({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      items.map((v) =>
        getResumeVersion(v.id)
          .then((r) => [v.id, r] as const)
          .catch((err: unknown) => {
            console.warn(
              `[VersionsAValiderPage] résumé indisponible pour ${v.codeVersion} :`,
              err,
            );
            return [v.id, null] as const;
          }),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      const map: Record<string, ResumeVersion | null> = {};
      for (const [id, r] of pairs) map[id] = r;
      setResumes(map);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return items.filter((v) => {
      if (term) {
        const match =
          v.codeVersion.toLowerCase().includes(term) ||
          v.libelle.toLowerCase().includes(term);
        if (!match) return false;
      }
      if (exerciceFilter !== ALL && String(v.exerciceFiscal) !== exerciceFilter) {
        return false;
      }
      if (typeFilter !== ALL && v.typeVersion !== typeFilter) return false;
      return true;
    });
  }, [items, debouncedSearch, exerciceFilter, typeFilter]);

  const exercices = useMemo(() => {
    const set = new Set<number>();
    for (const v of items) set.add(v.exerciceFiscal);
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const kpi = useMemo(() => {
    const enAttente = items.length;
    const anciennes = items.filter(
      (v) => daysSince(v.dateSoumission) > 7,
    ).length;
    const recentes = items.filter(
      (v) => hoursSince(v.dateSoumission) < 24,
    ).length;
    return { enAttente, anciennes, recentes };
  }, [items]);

  function handleConsulter(v: Version): void {
    setVersionId(v.id);
    navigate('/budget/saisie');
  }

  function handleRejeter(v: Version): void {
    setDialogState({ version: v, action: 'rejeter' });
  }

  function handleValider(v: Version): void {
    setDialogState({ version: v, action: 'valider' });
  }

  return (
    <div>
      {/* ─── En-tête + pill périmètre ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ backgroundColor: 'var(--miznas-bleu-nuit-dark)' }}
            className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Versions à valider
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              File d&apos;attente des budgets soumis par les préparateurs
            </p>
          </div>
        </div>
        {perimetre && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-(--border) text-xs text-(--foreground) shrink-0"
            data-testid="pill-perimetre"
          >
            <Filter className="w-3.5 h-3.5 text-(--muted-foreground)" />
            Mon périmètre (
            {perimetre.isAdminGlobal
              ? 'Admin global'
              : `${perimetre.nbCrAccessibles} CR`}
            )
          </span>
        )}
      </div>

      <BandeauDelegations />

      {/* ─── 3 KPI ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
        <KpiQueueCard
          label="En attente"
          value={kpi.enAttente}
          dotColor="#BA7517"
          testId="kpi-aval-en-attente"
        />
        <KpiQueueCard
          label="Anciennes (>7j)"
          value={kpi.anciennes}
          dotColor="#E24B4A"
          testId="kpi-aval-anciennes"
        />
        <KpiQueueCard
          label="Récentes (<24h)"
          value={kpi.recentes}
          dotColor="#3B6D11"
          testId="kpi-aval-recentes"
        />
      </div>

      {/* ─── Barre de filtres unifiée ──────────────────────────── */}
      <div className="bg-white border border-(--border) rounded-md px-4 py-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 md:divide-x divide-(--border)">
          <div className="relative md:pr-4 md:flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="search-aval"
              placeholder="Recherche libellé ou code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
              data-testid="search-input"
            />
          </div>
          <div className="md:px-4 flex items-center gap-2">
            <span className="text-xs text-(--muted-foreground) shrink-0">
              Exercice :
            </span>
            <Select value={exerciceFilter} onValueChange={setExerciceFilter}>
              <SelectTrigger
                id="exercice-aval"
                className="h-9 border-0 shadow-none focus:ring-0 bg-transparent w-auto gap-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {exercices.map((y) => (
                  <SelectItem
                    key={y}
                    value={String(y)}
                    className="tabular-nums"
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:pl-4 flex items-center gap-2">
            <span className="text-xs text-(--muted-foreground) shrink-0">
              Type :
            </span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                id="type-aval"
                className="h-9 border-0 shadow-none focus:ring-0 bg-transparent w-auto gap-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {TYPES_VERSION.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-(--border) rounded-md p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div
          className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center"
          data-testid="empty-state"
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
            style={{ backgroundColor: '#0F6E5614' }}
            aria-hidden="true"
          >
            <Inbox className="w-7 h-7" style={{ color: '#0F6E56' }} />
          </div>
          <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
            {items.length === 0
              ? 'Tout est à jour'
              : 'Aucune version ne correspond aux filtres'}
          </div>
          <p className="text-xs text-(--muted-foreground) max-w-[380px] mx-auto leading-relaxed">
            {items.length === 0
              ? "Aucune version en attente de validation. Vous serez notifié dès qu'une nouvelle soumission arrivera."
              : 'Ajustez votre recherche ou réinitialisez les filtres.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3" data-testid="liste-a-valider">
          {filtered.map((v) => (
            <VersionCard
              key={v.id}
              version={v}
              resume={resumes[v.id]}
              onConsulter={() => handleConsulter(v)}
              onRejeter={() => handleRejeter(v)}
              onValider={() => handleValider(v)}
            />
          ))}
        </ul>
      )}

      {/* Modale unique partagée pour Valider / Rejeter — montée à la
          demande pour ne pas avoir besoin d'un fallback version. */}
      {dialogState && (
        <WorkflowActionDialog
          version={dialogState.version}
          action={dialogState.action}
          onClose={() => setDialogState(null)}
          onTransitioned={() => {
            setDialogState(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiQueueCardProps {
  label: string;
  value: number;
  dotColor: string;
  testId: string;
}

function KpiQueueCard({
  label,
  value,
  dotColor,
  testId,
}: KpiQueueCardProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md px-4 py-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        <div className="text-[11px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-[28px] font-medium tabular-nums leading-tight"
        style={{ color: 'var(--miznas-bleu-nuit)' }}
      >
        {value}
      </div>
    </div>
  );
}

interface VersionCardProps {
  version: Version;
  /** undefined = en cours de fetch ; null = erreur ; object = OK */
  resume: ResumeVersion | null | undefined;
  onConsulter: () => void;
  onRejeter: () => void;
  onValider: () => void;
}

function VersionCard({
  version: v,
  resume,
  onConsulter,
  onRejeter,
  onValider,
}: VersionCardProps): JSX.Element {
  return (
    <li
      className="bg-white border border-(--border) rounded-md overflow-hidden"
      style={{ borderLeft: '4px solid #BA7517' }}
      data-testid={`row-${v.codeVersion}`}
    >
      {/* Zone 1 — Header */}
      <div className="px-[22px] py-[18px] flex flex-wrap gap-4 justify-between items-start border-b border-(--border)">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center font-mono text-[11px] px-2 py-[3px] rounded-[4px] text-white"
              style={{ backgroundColor: 'var(--miznas-bleu-nuit-dark)' }}
            >
              {v.codeVersion}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[4px] text-[11px] font-semibold"
              style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
            >
              <Send className="w-3 h-3" />
              Soumis
            </span>
            <TypeVersionBadge type={v.typeVersion} />
          </div>
          <h4
            className="text-[17px] font-medium leading-snug m-0"
            style={{ color: 'var(--miznas-bleu-nuit)' }}
          >
            {v.libelle}
          </h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--muted-foreground)">
            {v.utilisateurSoumission && (
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Soumise par{' '}
                <span
                  className="font-medium"
                  style={{ color: 'var(--miznas-bleu-nuit)' }}
                >
                  {v.utilisateurSoumission}
                </span>
              </span>
            )}
            {v.dateSoumission && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeDate(v.dateSoumission)} (
                {formatDateFr(v.dateSoumission)})
              </span>
            )}
            {v.utilisateurSoumission && v.utilisateurSoumission.includes('@') && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {v.utilisateurSoumission}
              </span>
            )}
          </div>
        </div>
        <div className="text-right min-w-[160px]">
          <div className="text-[11px] text-(--muted-foreground)">
            Montant total
          </div>
          <div
            className="text-[22px] font-medium tabular-nums leading-tight"
            style={{ color: 'var(--miznas-bleu-nuit)' }}
            data-testid={`montant-${v.codeVersion}`}
          >
            {resume === undefined && '…'}
            {resume === null && '—'}
            {resume && numberFmt.format(Math.round(resume.montantTotalFcfa))}
          </div>
          <div className="text-[11px] text-(--muted-foreground)">
            {resume
              ? `FCFA · ${resume.nombreComptes} compte${resume.nombreComptes > 1 ? 's' : ''}`
              : 'FCFA'}
          </div>
        </div>
      </div>

      {/* Zone 2 — Justification */}
      <div
        className="px-[22px] py-4 border-b border-(--border)"
        style={{ backgroundColor: '#FAFBFC' }}
      >
        <div className="text-[11px] text-(--muted-foreground) uppercase tracking-wider mb-1">
          Justification du préparateur
        </div>
        {v.commentaireSoumission ? (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap m-0">
            {v.commentaireSoumission}
          </p>
        ) : (
          <p className="text-[13px] italic text-(--muted-foreground) m-0">
            Aucune justification fournie.
          </p>
        )}
      </div>

      {/* Zone 3 — Footer actions */}
      <div className="px-[22px] pt-3.5 pb-[18px] flex flex-wrap items-center justify-between gap-3">
        <details className="text-xs" data-testid={`historique-${v.codeVersion}`}>
          <summary className="cursor-pointer inline-flex items-center gap-1 text-(--muted-foreground) hover:text-(--foreground) select-none list-none">
            <ChevronDown className="w-3.5 h-3.5" />
            Voir l&apos;historique workflow
          </summary>
          <div className="mt-2">
            <WorkflowTimeline version={v} />
          </div>
        </details>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            className="h-9 gap-1.5"
            onClick={onConsulter}
            data-testid={`btn-consulter-${v.codeVersion}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Consulter la grille
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-1.5 bg-white"
            style={{ borderColor: '#E24B4A', color: '#E24B4A' }}
            onClick={onRejeter}
            data-testid={`btn-rejeter-${v.codeVersion}`}
          >
            <X className="w-3.5 h-3.5" />
            Rejeter
          </Button>
          <Button
            className="h-9 gap-1.5 text-white"
            style={{ backgroundColor: 'var(--miznas-bleu-nuit-dark)' }}
            onClick={onValider}
            data-testid={`btn-valider-${v.codeVersion}`}
          >
            <Check className="w-3.5 h-3.5" />
            Valider
          </Button>
        </div>
      </div>
    </li>
  );
}

