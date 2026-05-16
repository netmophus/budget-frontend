/**
 * AdminEmailLogPage (Lot 4.3 + refonte Lot 7.3 V29 Charte v1).
 *
 * Journal des emails envoyés / supprimés / en échec, avec filtres
 * par statut/événement et action de rejeu sur les lignes en ECHEC.
 *
 * Refonte V29 (pattern unifié V11→V28) :
 *  - Header custom : cercle MailWarning catégorie CONFIG (gris
 *    ardoise --miznas-cat-config #5F6B7A) + titre + sous-titre
 *  - 3 KPI cards (En attente / Envoyés 24h / Échecs 24h) avec
 *    pastille colorée — calcul client sur la liste affichée (le
 *    backend ne fournit pas de stats agrégées 24h)
 *  - Cadre de filtres en 3 sections (Statut / Événement / Recherche)
 *    avec séparateurs internes border-t
 *  - Tableau grid CSS modernisé avec :
 *    - Date mono tabular-nums dd/MM HH:mm
 *    - EvenementBadge coloré par catégorie (BUDGET_* / DELEGATION_*
 *      / AFFECTATION_*)
 *    - StatutEmailBadge avec pastille ou icône AlertTriangle (ECHEC)
 *    - Ligne fond rouge subtil si statut === ECHEC
 *    - Tentatives rouge bold si > 1 et ECHEC
 *    - Bouton Rejouer visible uniquement si ECHEC (bleu nuit dark)
 *  - Bouton Rafraîchir (refresh manuel — incrémente refreshKey)
 *
 * Logique métier 100 % préservée : listerEmailLog avec filtres
 * server-side (statuts/evenements/rechercheEmail), rejouerEmail
 * avec toast success/échec selon r.envoye, refreshKey après rejeu.
 * Tous les data-testid critiques préservés strictement
 * (filtre-statut-${s}, filtre-event-${e}, recherche-email,
 * email-log-row-${id}, statut-badge-${id}, btn-rejouer-${id},
 * empty-state).
 */
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Lock,
  Mail,
  MailWarning,
  RefreshCw,
  Search,
  Send,
  TimerOff,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type EmailLog,
  EVENEMENT_LABEL,
  type StatutEmail,
  STATUT_LABEL,
  STATUTS_EMAIL,
  type TypeEvenement,
  TYPES_EVENEMENT,
  listerEmailLog,
  rejouerEmail,
} from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

const STATUT_DOT_HEX: Record<StatutEmail, string> = {
  EN_ATTENTE: '#BA7517',
  ENVOYE: '#0F6E56',
  ECHEC: '#DC2626',
  SUPPRIME: '#5F6B7A',
};

interface EvenementVisualConfig {
  bgHex: string;
  textHex: string;
  Icon: LucideIcon;
}

const EVENEMENT_VISUAL: Record<TypeEvenement, EvenementVisualConfig> = {
  BUDGET_SOUMIS: { bgHex: '#BA75171F', textHex: '#854F0B', Icon: Send },
  BUDGET_VALIDE: { bgHex: '#0F6E561F', textHex: '#085041', Icon: Check },
  BUDGET_REJETE: { bgHex: '#DC26261A', textHex: '#A32D2D', Icon: ArrowLeft },
  BUDGET_PUBLIE: { bgHex: '#0C447C1A', textHex: '#0C447C', Icon: Lock },
  DELEGATION_CREEE: {
    bgHex: '#B05D3F1F',
    textHex: '#712B13',
    Icon: UserPlus,
  },
  DELEGATION_EXPIREE: {
    bgHex: '#5F6B7A1F',
    textHex: '#444441',
    Icon: TimerOff,
  },
  DELEGATION_REVOQUEE: {
    bgHex: '#BA75171F',
    textHex: '#854F0B',
    Icon: Ban,
  },
  AFFECTATION_CREEE: {
    bgHex: '#B05D3F1F',
    textHex: '#712B13',
    Icon: UsersRound,
  },
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const SEUIL_24H_MS = 24 * 60 * 60 * 1000;

function computeKpi(items: EmailLog[]): {
  enAttente: number;
  envoyes24h: number;
  echecs24h: number;
} {
  const refNow = Date.now();
  let enAttente = 0;
  let envoyes24h = 0;
  let echecs24h = 0;
  for (const e of items) {
    const age = refNow - new Date(e.dateCreation).getTime();
    if (e.statut === 'EN_ATTENTE') enAttente += 1;
    if (e.statut === 'ENVOYE' && age <= SEUIL_24H_MS) envoyes24h += 1;
    if (e.statut === 'ECHEC' && age <= SEUIL_24H_MS) echecs24h += 1;
  }
  return { enAttente, envoyes24h, echecs24h };
}

export function AdminEmailLogPage(): JSX.Element {
  const [items, setItems] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutsFilter, setStatutsFilter] = useState<StatutEmail[]>([]);
  const [evenementsFilter, setEvenementsFilter] = useState<TypeEvenement[]>(
    [],
  );
  const [rechercheEmail, setRechercheEmail] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listerEmailLog({
      statuts: statutsFilter.length > 0 ? statutsFilter : undefined,
      evenements: evenementsFilter.length > 0 ? evenementsFilter : undefined,
      rechercheEmail: rechercheEmail || undefined,
      limit: 100,
    })
      .then((r) => setItems(r.items))
      .catch(() => toast.error('Impossible de charger le journal des emails.'))
      .finally(() => setLoading(false));
  }, [refreshKey, statutsFilter, evenementsFilter, rechercheEmail]);

  function toggleStatut(s: StatutEmail): void {
    setStatutsFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }
  function toggleEvenement(e: TypeEvenement): void {
    setEvenementsFilter((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }

  async function handleRejouer(id: string): Promise<void> {
    try {
      const r = await rejouerEmail(id);
      if (r.envoye) {
        toast.success('Email rejoué avec succès.');
      } else {
        toast.error('Le rejeu a échoué — voir le journal.');
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Rejeu refusé : ${msg}`);
    }
  }

  function handleRefresh(): void {
    setRefreshKey((k) => k + 1);
  }

  const kpi = useMemo(() => computeKpi(items), [items]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#5F6B7A1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <MailWarning className="w-5 h-5" style={{ color: '#5F6B7A' }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Journal des emails
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Trace de toutes les notifications envoyées — rejeu disponible sur
            les échecs
          </p>
        </div>
      </div>

      {/* ─── 3 KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        <KpiWithDotCard
          label="En attente"
          value={kpi.enAttente}
          colorHex="#BA7517"
          testId="kpi-mail-en-attente"
        />
        <KpiWithDotCard
          label="Envoyés 24h"
          value={kpi.envoyes24h}
          colorHex="#0F6E56"
          testId="kpi-mail-envoyes-24h"
        />
        <KpiWithDotCard
          label="Échecs 24h"
          value={kpi.echecs24h}
          colorHex="#DC2626"
          testId="kpi-mail-echecs-24h"
        />
      </div>

      {/* ─── Cadre filtres en 3 sections ─────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3.5 mb-4">
        {/* Section 1 : Statut */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: '#5F6B7A' }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
              Statut
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mb-3.5">
            {STATUTS_EMAIL.map((s) => {
              const checked = statutsFilter.includes(s);
              return (
                <label
                  key={s}
                  data-testid={`filtre-statut-${s}`}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStatut(s)}
                    className="h-3.5 w-3.5 rounded border border-(--border) cursor-pointer"
                    style={{ accentColor: STATUT_DOT_HEX[s] }}
                  />
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: STATUT_DOT_HEX[s] }}
                      aria-hidden="true"
                    />
                    {STATUT_LABEL[s]}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 2 : Événement */}
        <div className="pt-3 border-t border-(--border)">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: '#5F6B7A' }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
              Événement
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mb-3.5">
            {TYPES_EVENEMENT.map((e) => {
              const checked = evenementsFilter.includes(e);
              return (
                <label
                  key={e}
                  data-testid={`filtre-event-${e}`}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvenement(e)}
                    className="h-3.5 w-3.5 rounded border border-(--border) cursor-pointer accent-(--miznas-cat-config)"
                  />
                  {EVENEMENT_LABEL[e]}
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 3 : Recherche */}
        <div className="pt-2.5 border-t border-(--border)">
          <Label
            htmlFor="recherche-email"
            className="text-xs mb-1 block"
          >
            Recherche email destinataire
          </Label>
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="recherche-email"
              data-testid="recherche-email"
              value={rechercheEmail}
              onChange={(e) => setRechercheEmail(e.target.value)}
              placeholder="ex : @miznas.local"
              className="h-9 pl-9 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Compteur + Rafraîchir */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-[11px] text-(--muted-foreground) tabular-nums">
          {loading
            ? '…'
            : `${items.length} email${items.length > 1 ? 's' : ''}`}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-7 px-2.5 gap-1.5 text-xs"
        >
          <RefreshCw
            className={cn('w-3 h-3', loading && 'animate-spin')}
          />
          Rafraîchir
        </Button>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────── */}
      <div className="bg-white border border-(--border) rounded-md overflow-hidden">
        <div className="grid grid-cols-[120px_180px_1fr_1fr_110px_60px_100px] bg-(--secondary) px-3.5 py-2.5 border-b border-(--border) gap-2.5 items-center">
          <ColumnHeader>Date</ColumnHeader>
          <ColumnHeader>Événement</ColumnHeader>
          <ColumnHeader>Destinataire</ColumnHeader>
          <ColumnHeader>Sujet</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeaderRight>Tent.</ColumnHeaderRight>
          <ColumnHeaderRight>Action</ColumnHeaderRight>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div
            className="px-7 py-12 text-center"
            data-testid="empty-state"
          >
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: '#5F6B7A14' }}
              aria-hidden="true"
            >
              <Mail className="w-6 h-6" style={{ color: '#5F6B7A' }} />
            </div>
            <div className="text-sm font-semibold mb-1">
              Aucun email enregistré
            </div>
            <p className="text-xs text-(--muted-foreground)">
              Aucune notification ne correspond aux filtres appliqués.
            </p>
          </div>
        )}
        {!loading &&
          items.map((l) => {
            const isEchec = l.statut === 'ECHEC';
            return (
              <div
                key={l.id}
                className={cn(
                  'grid grid-cols-[120px_180px_1fr_1fr_110px_60px_100px] px-3.5 py-2.5 border-b border-(--border) last:border-b-0 gap-2.5 items-center transition-colors',
                  isEchec
                    ? 'bg-(--destructive)/[0.04] hover:bg-(--destructive)/[0.06]'
                    : 'hover:bg-(--muted)/30',
                )}
                data-testid={`email-log-row-${l.id}`}
              >
                <div className="text-[11px] font-mono tabular-nums text-(--muted-foreground)">
                  {formatDateShort(l.dateCreation)}
                </div>
                <div>
                  <EvenementBadge evenement={l.evenement} />
                </div>
                <div
                  className="text-[11px] font-mono truncate"
                  title={l.destinataireEmail}
                >
                  {l.destinataireEmail}
                </div>
                <div className="text-xs truncate" title={l.sujet}>
                  {l.sujet}
                </div>
                <div>
                  <StatutEmailBadge
                    statut={l.statut}
                    testId={`statut-badge-${l.id}`}
                  />
                </div>
                <div
                  className={cn(
                    'text-xs tabular-nums text-right',
                    isEchec && l.tentatives > 1
                      ? 'text-(--destructive) font-bold'
                      : 'text-(--muted-foreground)',
                  )}
                >
                  {l.tentatives}
                </div>
                <div className="flex justify-end">
                  {isEchec ? (
                    <Button
                      size="sm"
                      onClick={() => void handleRejouer(l.id)}
                      data-testid={`btn-rejouer-${l.id}`}
                      className="h-6 px-2 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1 text-[11px]"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Rejouer
                    </Button>
                  ) : (
                    <span className="text-[11px] text-(--muted-foreground)/70">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

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

function ColumnHeaderRight({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider text-right">
      {children}
    </div>
  );
}

function KpiWithDotCard({
  label,
  value,
  colorHex,
  testId,
}: {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        />
        <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}

function EvenementBadge({
  evenement,
}: {
  evenement: TypeEvenement;
}): JSX.Element {
  const visual = EVENEMENT_VISUAL[evenement] ?? {
    bgHex: '#5F6B7A1A',
    textHex: '#5F6B7A',
    Icon: Mail,
  };
  const Icon = visual.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-[10px] font-medium"
      style={{ backgroundColor: visual.bgHex, color: visual.textHex }}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden="true" />
      {EVENEMENT_LABEL[evenement]}
    </span>
  );
}

function StatutEmailBadge({
  statut,
  testId,
}: {
  statut: StatutEmail;
  testId: string;
}): JSX.Element {
  const hex = STATUT_DOT_HEX[statut];
  const isEchec = statut === 'ECHEC';
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-[10px] font-semibold"
      style={{
        backgroundColor: `${hex}1F`,
        color: hex,
      }}
    >
      {isEchec ? (
        <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
      )}
      {STATUT_LABEL[statut]}
    </span>
  );
}
