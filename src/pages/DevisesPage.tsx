/**
 * DevisesPage (Lot 2 + Lot 7.3 V13 refonte Charte v1).
 *
 * Référentiel des devises BCEAO/UEMOA et devises convertibles.
 *
 * Refonte V13 :
 *  - Header custom : cercle Coins catégorie config (gris ardoise)
 *    + titre + sous-titre court
 *  - 4 KPI cards (Devise pivot / Total actives / UEMOA / Convertibles)
 *    calculées useMemo
 *  - Barre de filtres dans cadre gris : Search élargi (libellé +
 *    code ISO + symbole) + checkbox "Actives uniquement"
 *  - Tableau grid CSS modernisé avec coloration spéciale ligne
 *    PIVOT (fond ambre/4 %) + badge PIVOT inline
 *  - StatutBadge unifié (réutilisé du pattern V11/V12)
 *
 * Logique métier 100 % préservée : flux API listDevises avec
 * estActive=true au mount (test régression), debounce recherche,
 * toast erreur fallback.
 */
import { Coins, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listDevises, type Devise } from '@/lib/api/referentiels';
import { cn } from '@/lib/utils';

/**
 * Codes ISO faisant partie de la zone UEMOA (BCEAO).
 * Liste statique — la zone UEMOA n'utilise qu'une seule devise
 * commune (XOF) pour les 8 États membres. Si d'autres codes
 * apparaissent (UEMOA-Sud par ex.), étendre ce Set.
 */
const CODES_UEMOA = new Set<string>(['XOF']);

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('T')[0]!.split('-');
  return `${d}/${m}/${y}`;
}

export function DevisesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actifsUniquement, setActifsUniquement] = useState(true);
  const [data, setData] = useState<Devise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    // L'API n'expose qu'un filtre `codeIso` — pour la recherche
    // élargie (libellé + code + symbole) on filtre côté client
    // sur les data chargées. Le filtre `estActive` reste serveur
    // (cohérent avec le test régression du mount).
    listDevises({
      page: 1,
      limit: 100,
      estActive: actifsUniquement || undefined,
    })
      .then((res) => {
        setData(res.items);
      })
      .catch(() => {
        toast.error('Impossible de charger les devises');
      })
      .finally(() => setLoading(false));
  }, [actifsUniquement]);

  // Filtre client : recherche élargie sur libellé + code + symbole.
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const q = debouncedSearch.trim().toLowerCase();
    return data.filter((d) => {
      if (d.codeIso.toLowerCase().includes(q)) return true;
      if (d.libelle.toLowerCase().includes(q)) return true;
      if (d.symbole && d.symbole.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [data, debouncedSearch]);

  // KPI calculés sur les data SERVEUR (pas filtered) pour donner
  // une vue d'ensemble, pas affectée par la recherche utilisateur.
  const kpi = useMemo(() => {
    const actives = data.filter((d) => d.estActive);
    return {
      pivot: data.find((d) => d.estDevisePivot) ?? null,
      totalActives: actives.length,
      uemoa: actives.filter((d) => CODES_UEMOA.has(d.codeIso)).length,
      convertibles: actives.filter((d) => !CODES_UEMOA.has(d.codeIso))
        .length,
    };
  }, [data]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          style={{ backgroundColor: '#5F6B7A1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center"
          aria-hidden="true"
        >
          <Coins className="w-5 h-5" style={{ color: '#5F6B7A' }} />
        </div>
        <div>
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Devises
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Référentiel BCEAO/UEMOA et devises convertibles
          </p>
        </div>
      </div>

      {/* ─── 4 KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div
          className="bg-white border border-(--border) rounded-md p-3.5"
          data-testid="kpi-devise-pivot"
        >
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
            Devise pivot
          </div>
          <div className="text-lg font-semibold text-(--miznas-ambre)">
            {kpi.pivot?.codeIso ?? '—'}
          </div>
        </div>
        <KpiNumberCard
          label="Total actives"
          value={kpi.totalActives}
          color="#0F6E56"
          testId="kpi-devises-total-actives"
        />
        <KpiNumberCard
          label="UEMOA"
          value={kpi.uemoa}
          color="#0C447C"
          testId="kpi-devises-uemoa"
        />
        <KpiNumberCard
          label="Convertibles"
          value={kpi.convertibles}
          color="#5B4E91"
          testId="kpi-devises-convertibles"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-sm">
            <Label htmlFor="search-devises" className="text-xs mb-1 block">
              Recherche
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="search-devises"
                placeholder="ex. XOF, Euro, $"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 bg-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-sm cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={actifsUniquement}
              onChange={(e) => setActifsUniquement(e.target.checked)}
              className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
            />
            Actives uniquement
          </label>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────────── */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="devises-table"
      >
        <div className="grid grid-cols-[120px_1fr_90px_90px_100px_120px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Code ISO
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Libellé
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Symbole
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Décimales
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Statut
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            Créé le
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Aucune devise ne correspond à la recherche.
          </div>
        )}
        {!loading &&
          filtered.map((devise) => (
            <div
              key={devise.id}
              data-testid={`devise-row-${devise.id}`}
              className={cn(
                'grid grid-cols-[120px_1fr_90px_90px_100px_120px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 transition-colors',
                devise.estDevisePivot
                  ? 'bg-(--miznas-ambre)/[0.04]'
                  : 'hover:bg-(--muted)/30',
              )}
            >
              {/* Code ISO + badge PIVOT */}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'font-mono text-[13px] font-bold',
                    devise.estDevisePivot
                      ? 'text-(--miznas-ambre)'
                      : 'text-(--miznas-bleu-nuit)',
                  )}
                >
                  {devise.codeIso}
                </span>
                {devise.estDevisePivot && (
                  <span
                    className="inline-flex items-center px-1.5 py-[1px] bg-(--miznas-ambre) text-white rounded-sm text-[9px] font-bold tracking-wider"
                    data-testid="devise-badge-pivot"
                  >
                    PIVOT
                  </span>
                )}
              </div>

              {/* Libellé */}
              <div
                className={cn(
                  'text-[13px]',
                  devise.estDevisePivot && 'font-medium',
                )}
              >
                {devise.libelle}
              </div>

              {/* Symbole */}
              <div
                className={cn(
                  'font-medium',
                  devise.codeIso === 'XOF'
                    ? 'text-[14px] font-mono'
                    : 'text-base',
                )}
              >
                {devise.symbole ?? '—'}
              </div>

              {/* Décimales */}
              <div className="text-[13px] tabular-nums text-(--muted-foreground)">
                {devise.nbDecimales}
              </div>

              {/* Statut */}
              <div>
                <StatutDeviseBadge actif={devise.estActive} />
              </div>

              {/* Créé le */}
              <div className="text-xs text-(--muted-foreground)/70 tabular-nums">
                {formatDateFr(devise.dateCreation)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface KpiNumberCardProps {
  label: string;
  value: number;
  color: string;
  testId: string;
}

function KpiNumberCard({
  label,
  value,
  color,
  testId,
}: KpiNumberCardProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="text-2xl font-medium tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function StatutDeviseBadge({ actif }: { actif: boolean }): JSX.Element {
  if (actif) {
    return (
      <span
        data-testid="statut-devise-actif"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
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
      data-testid="statut-devise-inactif"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)"
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
        aria-hidden="true"
      />
      Inactif
    </span>
  );
}
