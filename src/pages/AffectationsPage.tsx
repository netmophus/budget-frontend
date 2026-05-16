/**
 * AffectationsPage (Lot 4.1.C + Lot 4.1-fix.A + refonte Lot 7.3 V27
 * Charte v1).
 *
 * Page admin pour gérer les affectations multi-périmètres.
 *
 * Lot 4.1-fix.A : la page liste désormais TOUS les utilisateurs
 * actifs (même ceux à 0 périmètre — on doit pouvoir leur en créer).
 * Pour les users à 0 → badge gris « 0 périmètre » + bouton dédié
 * « Ajouter une affectation ». Pour les users avec ≥ 1 → badge
 * coloré + bouton « Gérer ». 1 seul fetch grâce au flag
 * `withPerimetresCount=true` exposé par l'endpoint /users (évite le
 * N+1 du Lot 4.1).
 *
 * Refonte V27 (pattern unifié V11→V26) :
 *  - Header custom : cercle UsersRound catégorie COLLABORATION
 *    (terracotta --miznas-cat-collaboration #B05D3F, cohérent /users)
 *    + titre + sous-titre
 *  - 3 KPI cards (Utilisateurs / Avec affectation vert / Sans
 *    affectation ambre) avec pastille colorée
 *  - Barre de filtres dans cadre gris (Search email + Affichage
 *    Tous/Sans/Avec)
 *  - Tableau grid CSS modernisé : UserAvatar (initiales déterministes
 *    par hash email) + nom complet + email mono + pastille périmètre
 *    contextuelle vert/ambre + bouton action contextuel (Ajouter bleu
 *    nuit dark si n=0, Gérer outline si n>0)
 *  - Libellés textuels "0 périmètre" / "X périmètres" / "Ajouter une
 *    affectation" PRÉSERVÉS strictement (les tests les vérifient
 *    via getByText et toMatch).
 *
 * Logique métier 100 % préservée : listUsers avec
 * withPerimetresCount/estActif, debounce email 300ms, AffectationsDialog
 * intact (mocké en stub dans le test). data-testid critiques préservés
 * (badge-zero-${id} / badge-count-${id} / btn-ajouter-${id} /
 * btn-gerer-${id} / input-email-filter / dialog-stub via composant).
 */
import {
  Plus,
  Search,
  Settings,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AffectationsDialog } from '@/components/admin/AffectationsDialog';
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
import { listUsers } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

type UserListItem = UserResponse;

const ALL = '__all__';
const FILTER_SANS = 'sans';
const FILTER_AVEC = 'avec';

const AVATAR_PALETTE = [
  { bg: 'rgba(60, 52, 137, 0.12)', text: '#3C3489' },
  { bg: 'rgba(15, 110, 86, 0.12)', text: '#085041' },
  { bg: 'rgba(186, 117, 23, 0.12)', text: '#854F0B' },
  { bg: 'rgba(91, 78, 145, 0.12)', text: '#26215C' },
  { bg: 'rgba(95, 94, 90, 0.12)', text: '#444441' },
  { bg: 'rgba(176, 93, 63, 0.12)', text: '#712B13' },
];

export function AffectationsPage(): JSX.Element {
  const [rows, setRows] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [filterMode, setFilterMode] = useState<string>(ALL);
  const [dialogTarget, setDialogTarget] = useState<UserListItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(emailFilter), 300);
    return () => clearTimeout(t);
  }, [emailFilter]);

  useEffect(() => {
    setLoading(true);
    listUsers({
      limit: 100,
      page: 1,
      estActif: true,
      withPerimetresCount: true,
      ...(debouncedEmail ? { email: debouncedEmail } : {}),
    })
      .then((res) => setRows(res.items))
      .catch(() => toast.error('Impossible de charger les utilisateurs'))
      .finally(() => setLoading(false));
  }, [refreshKey, debouncedEmail]);

  // 3 KPI cards.
  const kpi = useMemo(() => {
    const totalCount = rows.length;
    const avec = rows.filter(
      (u) => (u.nombrePerimetresActifs ?? 0) > 0,
    ).length;
    const sans = totalCount - avec;
    return { totalCount, avec, sans };
  }, [rows]);

  const filteredUsers = useMemo(() => {
    return rows.filter((u) => {
      const n = u.nombrePerimetresActifs ?? 0;
      if (filterMode === FILTER_SANS && n > 0) return false;
      if (filterMode === FILTER_AVEC && n === 0) return false;
      return true;
    });
  }, [rows, filterMode]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{ backgroundColor: '#B05D3F1A' }}
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <UsersRound className="w-5 h-5" style={{ color: '#B05D3F' }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold tracking-tight m-0">
            Affectations multi-périmètres
          </h3>
          <p className="text-xs text-(--muted-foreground) mt-0.5">
            Périmètres budgétaires (Structure, CR, ensemble) attribués à
            chaque utilisateur — les users à 0 périmètre restent listés
            pour permettre une première affectation
          </p>
        </div>
      </div>

      {/* ─── 3 KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        <KpiNumberCard
          label="Utilisateurs actifs"
          value={kpi.totalCount}
          colorHex="#0C447C"
          testId="kpi-aff-total"
        />
        <KpiWithDotCard
          label="Avec affectation"
          value={kpi.avec}
          colorHex="#0F6E56"
          testId="kpi-aff-avec"
        />
        <KpiWithDotCard
          label="Sans affectation"
          value={kpi.sans}
          colorHex="#BA7517"
          testId="kpi-aff-sans"
        />
      </div>

      {/* ─── Barre de filtres ──────────────────────────────── */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2.5">
          <div>
            <Label htmlFor="email-filter" className="text-xs mb-1 block">
              Recherche email
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="email-filter"
                placeholder="ex. dir.retail"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="h-9 pl-9 bg-white"
                data-testid="input-email-filter"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filter-mode" className="text-xs mb-1 block">
              Affichage
            </Label>
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger id="filter-mode" className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les utilisateurs</SelectItem>
                <SelectItem value={FILTER_SANS}>Sans affectation</SelectItem>
                <SelectItem value={FILTER_AVEC}>Avec affectation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Tableau grid CSS modernisé ────────────────────── */}
      <div className="bg-white border border-(--border) rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_220px] bg-(--secondary) px-3.5 py-2.5 border-b border-(--border) gap-2.5 items-center">
          <ColumnHeader>Utilisateur</ColumnHeader>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider text-right">
            Périmètres actifs
          </div>
          <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider text-right">
            Action
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="px-7 py-12 text-center">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ backgroundColor: '#B05D3F14' }}
              aria-hidden="true"
            >
              <UsersRound
                className="w-6 h-6"
                style={{ color: '#B05D3F' }}
              />
            </div>
            <div className="text-sm font-semibold mb-1">
              {rows.length === 0
                ? 'Aucun utilisateur actif'
                : 'Aucun utilisateur ne correspond aux filtres'}
            </div>
            <p className="text-xs text-(--muted-foreground)">
              {rows.length === 0
                ? 'Activez ou créez un utilisateur depuis /users.'
                : 'Ajustez votre recherche ou réinitialisez les filtres.'}
            </p>
          </div>
        )}
        {!loading &&
          filteredUsers.map((u) => {
            const n = u.nombrePerimetresActifs ?? 0;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_160px_220px] px-3.5 py-2.5 border-b border-(--border) last:border-b-0 gap-2.5 items-center hover:bg-(--muted)/30 transition-colors"
                data-testid={`aff-row-${u.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar email={u.email} prenom={u.prenom} nom={u.nom} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">
                      {u.prenom} {u.nom}
                    </div>
                    <div
                      className="text-[11px] text-(--muted-foreground) truncate font-mono"
                      title={u.email}
                    >
                      {u.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {n === 0 ? (
                    <span
                      data-testid={`badge-zero-${u.id}`}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--miznas-ambre)/10 text-(--miznas-ambre)"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-(--miznas-ambre)"
                        aria-hidden="true"
                      />
                      0 périmètre
                    </span>
                  ) : (
                    <span
                      data-testid={`badge-count-${u.id}`}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
                        aria-hidden="true"
                      />
                      {n} périmètre{n > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  {n === 0 ? (
                    <Button
                      size="sm"
                      onClick={() => setDialogTarget(u)}
                      data-testid={`btn-ajouter-${u.id}`}
                      className="h-7 px-3 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Ajouter une affectation
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialogTarget(u)}
                      data-testid={`btn-gerer-${u.id}`}
                      className="h-7 px-3 gap-1.5 text-xs"
                    >
                      <Settings className="w-3 h-3" />
                      Gérer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <AffectationsDialog
        isOpen={dialogTarget !== null}
        onClose={() => {
          setDialogTarget(null);
          setRefreshKey((k) => k + 1);
        }}
        userId={dialogTarget?.id ?? null}
        userLibelle={
          dialogTarget ? `${dialogTarget.prenom} ${dialogTarget.nom}` : ''
        }
      />
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

function KpiNumberCard({
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
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
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

function UserAvatar({
  email,
  prenom,
  nom,
}: {
  email: string;
  prenom?: string | null;
  nom?: string | null;
}): JSX.Element {
  const initials = useMemo(() => {
    const p = prenom?.charAt(0) ?? '';
    const n = nom?.charAt(0) ?? '';
    const computed = (p + n).toUpperCase();
    return computed || email.charAt(0).toUpperCase();
  }, [prenom, nom, email]);

  const palette = useMemo(() => {
    const hash = email
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
  }, [email]);

  return (
    <div
      className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
      style={{ background: palette.bg, color: palette.text }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
