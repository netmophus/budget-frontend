/**
 * CalendrierPage (Lot 7.3 V10 — modernisation Charte v1).
 *
 * Affiche le référentiel temporel UEMOA (10 ans glissants) sur un
 * mois donné. Refonte V10 :
 *  - Header custom : cercle d'icône `--miznas-cat-config` (gris
 *    ardoise) + titre + sous-titre court
 *  - Barre de navigation mois : boutons ChevronLeft/Right + libellé
 *    centré "Mois Année" + sélecteurs Année/Mois préservés (accès
 *    rapide sur les 10 ans glissants)
 *  - 4 KPI cards (jours ouvrés / fériés-WE / total / fin période)
 *  - Tableau grid CSS modernisé avec sous-composants `StatutBadge`
 *    (3 variantes Ouvré/Férié/Week-end avec dot coloré) et
 *    `FinPeriodeBadge` (icône Flag ambre)
 *  - Coloration de ligne discrète : ambre/5 si fin de mois,
 *    destructive/[0.02] si férié (jour ouvrable non ouvré),
 *    muted/30 si week-end
 *
 * Le type `JourTemps` n'expose qu'un booléen `jourOuvre` ; le
 * statut tripartite OUVRE / FERIE / WEEKEND est calculé côté UI à
 * partir du jour de la semaine (samedi/dimanche en UTC).
 */
import { Calendar, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listJoursTemps, type JourTemps } from '@/lib/api/referentiels';
import { cn } from '@/lib/utils';

const JOURS_SEMAINE_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

const MOIS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

type StatutJour = 'OUVRE' | 'FERIE' | 'WEEKEND';

function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function jourSemaineFr(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return JOURS_SEMAINE_FR[day]!;
}

/**
 * Calcule le statut tripartite à partir des données serveur.
 * `jourOuvre=true` → OUVRE. Sinon, samedi/dimanche → WEEKEND,
 * autre jour de la semaine non ouvré → FERIE.
 */
function statutJour(j: JourTemps): StatutJour {
  if (j.jourOuvre) return 'OUVRE';
  const day = new Date(`${j.date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? 'WEEKEND' : 'FERIE';
}

function formatMonthYear(year: number, month: number): string {
  return `${MOIS_FR[month - 1]} ${year}`;
}

const ANNEE_COURANTE = new Date().getUTCFullYear();
const ANNEES = Array.from({ length: 10 }, (_, i) => ANNEE_COURANTE - 5 + i);
const ANNEE_MIN = ANNEES[0]!;
const ANNEE_MAX = ANNEES[ANNEES.length - 1]!;

export function CalendrierPage() {
  const [annee, setAnnee] = useState<number>(ANNEE_COURANTE);
  const [mois, setMois] = useState<number>(new Date().getUTCMonth() + 1);
  const [data, setData] = useState<JourTemps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listJoursTemps({ annee, mois, page: 1, limit: 366 })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger le calendrier');
      })
      .finally(() => setLoading(false));
  }, [annee, mois]);

  // Navigation mois (avec rollover année). On reste dans la fenêtre
  // [ANNEE_MIN, ANNEE_MAX] des 10 ans glissants exposés.
  function handlePreviousMonth(): void {
    if (mois === 1) {
      if (annee > ANNEE_MIN) {
        setAnnee(annee - 1);
        setMois(12);
      }
    } else {
      setMois(mois - 1);
    }
  }

  function handleNextMonth(): void {
    if (mois === 12) {
      if (annee < ANNEE_MAX) {
        setAnnee(annee + 1);
        setMois(1);
      }
    } else {
      setMois(mois + 1);
    }
  }

  const isFirstMonth = annee === ANNEE_MIN && mois === 1;
  const isLastMonth = annee === ANNEE_MAX && mois === 12;

  // KPI calculés sur les rows du mois affiché. useMemo pour éviter
  // de recompter à chaque re-render UI (pagination, hover, etc.).
  const kpi = useMemo(() => {
    let nbOuvres = 0;
    let nbNonOuvres = 0;
    let nbFinPeriode = 0;
    for (const j of data) {
      if (j.jourOuvre) nbOuvres++;
      else nbNonOuvres++;
      if (j.estFinDeMois || j.estFinDeTrimestre || j.estFinDAnnee) {
        nbFinPeriode++;
      }
    }
    return {
      nbOuvres,
      nbNonOuvres,
      nbTotal: data.length,
      nbFinPeriode,
    };
  }, [data]);

  return (
    <div className="space-y-0">
      {/* ─── Header custom ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          style={{ backgroundColor: '#5F6B7A1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center"
          aria-hidden="true"
        >
          <Calendar className="w-5 h-5" style={{ color: '#5F6B7A' }} />
        </div>
        <div>
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Calendrier
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Référentiel temporel régional UEMOA — 10 ans glissants
          </p>
        </div>
      </div>

      {/* ─── Barre de navigation mois ───────────────────────────── */}
      <div className="flex items-center justify-between mb-5 px-4 py-3 bg-(--secondary) border border-(--border) rounded-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreviousMonth}
            disabled={isFirstMonth}
            className="w-8 h-8 border border-(--border) bg-white rounded-md flex items-center justify-center hover:bg-(--muted) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Mois précédent"
            data-testid="calendrier-btn-mois-precedent"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-(--muted-foreground)" />
          </button>

          <div
            className="text-base font-semibold text-(--miznas-bleu-nuit) min-w-[140px] text-center"
            data-testid="calendrier-label-mois"
          >
            {formatMonthYear(annee, mois)}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isLastMonth}
            className="w-8 h-8 border border-(--border) bg-white rounded-md flex items-center justify-center hover:bg-(--muted) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Mois suivant"
            data-testid="calendrier-btn-mois-suivant"
          >
            <ChevronRight className="w-3.5 h-3.5 text-(--muted-foreground)" />
          </button>
        </div>

        <div className="flex gap-2">
          <Select
            value={String(annee)}
            onValueChange={(v) => setAnnee(Number(v))}
          >
            <SelectTrigger
              className="h-8 px-2.5 text-[13px] bg-white"
              id="annee-select"
            >
              <span className="text-(--muted-foreground) mr-1.5">Année</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNEES.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(mois)}
            onValueChange={(v) => setMois(Number(v))}
          >
            <SelectTrigger
              className="h-8 px-2.5 text-[13px] bg-white"
              id="mois-select"
            >
              <span className="text-(--muted-foreground) mr-1.5">Mois</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOIS_FR.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <KpiCard
          label="Jours ouvrés"
          value={kpi.nbOuvres}
          color="#0F6E56"
          testId="kpi-jours-ouvres"
        />
        <KpiCard
          label="Fériés / W-E"
          value={kpi.nbNonOuvres}
          color="#DC2626"
          testId="kpi-jours-non-ouvres"
        />
        <KpiCard
          label="Total jours"
          value={kpi.nbTotal}
          color={null}
          testId="kpi-total-jours"
        />
        <KpiCard
          label="Fin de période"
          value={kpi.nbFinPeriode}
          color="#BA7517"
          testId="kpi-fin-periode"
        />
      </div>

      {/* ─── Tableau ────────────────────────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="calendrier-table"
      >
        {/* Header colonnes */}
        <div className="grid grid-cols-[110px_130px_130px_130px_80px_80px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Date
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Jour
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Statut
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Fin de période
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Trim.
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Sem.
          </div>
        </div>

        {/* Lignes */}
        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading &&
          data.map((row) => {
            const statut = statutJour(row);
            const isFin =
              row.estFinDeMois || row.estFinDeTrimestre || row.estFinDAnnee;
            return (
              <div
                key={row.id}
                data-testid={`calendrier-row-${row.date}`}
                className={cn(
                  'grid grid-cols-[110px_130px_130px_130px_80px_80px] px-4 py-3 tabular-nums border-b border-(--border) last:border-b-0',
                  isFin && 'bg-(--miznas-ambre)/5',
                  statut === 'FERIE' && !isFin && 'bg-(--destructive)/[0.02]',
                  statut === 'WEEKEND' && !isFin && 'bg-(--muted)/30',
                )}
              >
                <div className="text-[13px]">{formatDateFr(row.date)}</div>
                <div className="text-[13px] text-(--muted-foreground)">
                  {jourSemaineFr(row.date)}
                </div>
                <div>
                  <StatutBadge statut={statut} />
                </div>
                <div>
                  {isFin ? (
                    <FinPeriodeBadge />
                  ) : (
                    <span className="text-[13px] text-(--muted-foreground)/60">
                      —
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-(--muted-foreground)">
                  T{row.trimestre}
                </div>
                <div className="text-[13px] text-(--muted-foreground)">
                  {row.semaineIso ?? '—'}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  /** Hex de couleur pour la valeur. null = muted (Total jours). */
  color: string | null;
  testId: string;
}

function KpiCard({ label, value, color, testId }: KpiCardProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-medium tabular-nums',
          !color && 'text-(--foreground)',
        )}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

const STATUT_CONFIG: Record<
  StatutJour,
  { bg: string; text: string; dot: string; label: string }
> = {
  OUVRE: {
    bg: 'bg-(--miznas-cat-validation)/10',
    text: 'text-(--miznas-cat-validation)',
    dot: 'bg-(--miznas-cat-validation)',
    label: 'Ouvré',
  },
  FERIE: {
    bg: 'bg-(--destructive)/10',
    text: 'text-(--destructive)',
    dot: 'bg-(--destructive)',
    label: 'Férié',
  },
  WEEKEND: {
    bg: 'bg-(--miznas-cat-config)/10',
    text: 'text-(--miznas-cat-config)',
    dot: 'bg-(--miznas-cat-config)',
    label: 'Week-end',
  },
};

function StatutBadge({ statut }: { statut: StatutJour }): JSX.Element {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium',
        cfg.bg,
        cfg.text,
      )}
      data-testid={`statut-badge-${statut}`}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}

function FinPeriodeBadge(): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-(--miznas-ambre)/15 text-(--miznas-ambre) text-[11px] font-semibold"
      data-testid="fin-periode-badge"
    >
      <Flag className="w-2.5 h-2.5" aria-hidden="true" />
      Fin mois
    </span>
  );
}
