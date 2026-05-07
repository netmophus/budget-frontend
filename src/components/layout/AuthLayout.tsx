import {
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coins,
  Grid2x2,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Package,
  PieChart,
  ClipboardCheck,
  Mail,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Target,
  User as UserIcon,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';
import { BadgePerimetresHeader } from './BadgePerimetresHeader';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useHasPermission } from '@/lib/auth/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const NAV_TOP: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  // Lot 4.2 — accessible à tout user authentifié
  { to: '/mes-delegations', label: 'Mes délégations', icon: Send },
];

// Tri alphabétique (cohérence Lot 2.4C).
const NAV_REFERENTIELS: NavItem[] = [
  {
    to: '/referentiels/temps',
    label: 'Calendrier',
    icon: Calendar,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/centres-responsabilite',
    label: 'Centres de responsabilité',
    icon: Briefcase,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/comptes',
    label: 'Comptes',
    icon: Calculator,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/devises',
    label: 'Devises',
    icon: Coins,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/lignes-metier',
    label: 'Lignes de métier',
    icon: BookOpen,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/produits',
    label: 'Produits',
    icon: Package,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/segments',
    label: 'Segments',
    icon: Target,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/structures',
    label: 'Structures',
    icon: Building2,
    permission: 'REFERENTIEL.LIRE',
  },
];

const NAV_BUDGET: NavItem[] = [
  {
    to: '/budget/scenarios',
    label: 'Scénarios',
    icon: PieChart,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/budget/versions',
    label: 'Versions',
    icon: Layers,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/budget/saisie',
    label: 'Saisie budgétaire',
    icon: Grid2x2,
    permission: 'BUDGET.LIRE',
  },
  // Lot 3.5 — file de validation pour les contrôleurs.
  {
    to: '/budget/a-valider',
    label: 'À valider',
    icon: CheckSquare,
    permission: 'BUDGET.VALIDER',
  },
  // Lot 3.6 — tableau de bord indicateurs consolidés.
  {
    to: '/budget/tableau-de-bord',
    label: 'Tableau de bord',
    icon: BarChart3,
    permission: 'BUDGET.LIRE',
  },
];

// Lot 5.1 — module Réalisé (saisie + import)
const NAV_EXECUTION: NavItem[] = [
  {
    to: '/realise/saisie',
    label: 'Saisie réalisé',
    icon: ClipboardCheck,
    permission: 'REALISE.LIRE',
  },
];

const NAV_CONFIGURATION: NavItem[] = [
  {
    to: '/configuration',
    label: 'Configuration',
    icon: Sliders,
    permission: 'CONFIGURATION.LIRE',
  },
];

const NAV_ADMIN: NavItem[] = [
  { to: '/users', label: 'Utilisateurs', icon: Users, permission: 'USER.LIRE' },
  // Lot 4.1 — gestion des affectations multi-périmètres
  {
    to: '/admin/affectations',
    label: 'Affectations',
    icon: Layers,
    permission: 'USER.GERER',
  },
  // Lot 4.2 — supervision globale des délégations
  {
    to: '/admin/delegations',
    label: 'Délégations',
    icon: Send,
    permission: 'DELEGATION.GERER',
  },
  // Lot 4.3 — journal des notifications email
  {
    to: '/admin/email-log',
    label: 'Journal des emails',
    icon: Mail,
    permission: 'USER.GERER',
  },
  { to: '/audit-logs', label: "Journal d'audit", icon: ScrollText, permission: 'AUDIT.LIRE' },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const visible = useHasPermission(item.permission ? [item.permission] : []);
  if (!visible) return null;

  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.to)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-(--accent) text-(--accent-foreground) font-medium'
          : 'hover:bg-(--accent)/50',
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

// UX A.4 — clé localStorage : map { groupKey → bool ouvert }.
const SIDEBAR_STATE_KEY = 'sidebar-group-states-v1';

function loadSidebarState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveSidebarState(state: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage indisponible (mode privé) — comportement gracieux */
  }
}

interface NavGroupProps {
  groupKey: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  items: NavItem[];
  collapsed: boolean;
  state: Record<string, boolean>;
  onToggle: (key: string) => void;
}

function NavGroup({
  groupKey,
  label,
  icon: Icon,
  permission,
  items,
  collapsed,
  state,
  onToggle,
}: NavGroupProps): JSX.Element | null {
  const visible = useHasPermission(permission ? [permission] : []);
  if (!visible) return null;

  // Par défaut tout déployé. localStorage peut explicitement fermer.
  const ouvert = state[groupKey] !== false;

  return (
    <div data-testid={`nav-group-${groupKey}`}>
      {!collapsed && (
        <button
          type="button"
          onClick={() => onToggle(groupKey)}
          className="flex w-full items-center gap-2 px-3 pt-4 pb-1 text-xs font-semibold uppercase text-(--muted-foreground) hover:text-(--foreground) transition-colors"
          aria-expanded={ouvert}
          data-testid={`nav-group-toggle-${groupKey}`}
        >
          {ouvert ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
        </button>
      )}
      {(collapsed || ouvert) &&
        items.map((item) => (
          <NavLink key={item.to} item={item} collapsed={collapsed} />
        ))}
    </div>
  );
}

export function AuthLayout() {
  const navigate = useNavigate();
  const { user, roles, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  // UX A.4 — état des groupes (ouvert/fermé) persisté en localStorage.
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>(
    () => loadSidebarState(),
  );
  useEffect(() => {
    saveSidebarState(groupStates);
  }, [groupStates]);
  function toggleGroup(key: string): void {
    setGroupStates((s) => ({ ...s, [key]: s[key] === false ? true : false }));
  }

  const initials = user
    ? `${user.prenom[0] ?? ''}${user.nom[0] ?? ''}`.toUpperCase()
    : '?';

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-(--border) bg-(--background) px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Basculer la barre latérale"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold tracking-tight">MIZNAS</span>
          <span className="text-xs text-(--muted-foreground) hidden md:inline">
            Module Budgétaire Bancaire UEMOA
          </span>
        </div>

        {/* Lot 4.1 — badge périmètres pour le user connecté */}
        <div className="flex items-center gap-3">
          <BadgePerimetresHeader />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm">
                {user?.prenom} {user?.nom}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">
                {user?.prenom} {user?.nom}
              </div>
              <div className="text-xs text-(--muted-foreground)">
                {user?.email}
              </div>
              {roles.length > 0 && (
                <div className="text-xs text-(--muted-foreground) mt-1">
                  {roles.join(', ')}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="h-4 w-4" /> Mon profil
            </DropdownMenuItem>
            {/* Lot 4.3 — préférences notifications */}
            <DropdownMenuItem onClick={() => navigate('/me/preferences')}>
              <Mail className="h-4 w-4" /> Mes préférences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — UX A.4 : overflow-y-auto + sections collapsibles */}
        <aside
          className={cn(
            'border-r border-(--border) bg-(--background) p-3 space-y-1 transition-all overflow-y-auto',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          {NAV_TOP.map((item) => (
            <NavLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          <NavGroup
            groupKey="referentiels"
            label="Référentiels"
            icon={Library}
            permission="REFERENTIEL.LIRE"
            items={NAV_REFERENTIELS}
            collapsed={collapsed}
            state={groupStates}
            onToggle={toggleGroup}
          />

          <NavGroup
            groupKey="budget"
            label="Budget"
            icon={Wallet}
            permission="BUDGET.LIRE"
            items={NAV_BUDGET}
            collapsed={collapsed}
            state={groupStates}
            onToggle={toggleGroup}
          />

          {/* Lot 5.1 — Exécution (réalisé) */}
          <NavGroup
            groupKey="execution"
            label="Exécution"
            icon={ClipboardCheck}
            permission="REALISE.LIRE"
            items={NAV_EXECUTION}
            collapsed={collapsed}
            state={groupStates}
            onToggle={toggleGroup}
          />

          <NavGroup
            groupKey="configuration"
            label="Configuration"
            icon={Settings}
            permission="CONFIGURATION.LIRE"
            items={NAV_CONFIGURATION}
            collapsed={collapsed}
            state={groupStates}
            onToggle={toggleGroup}
          />

          <NavGroup
            groupKey="administration"
            label="Administration"
            icon={ShieldCheck}
            items={NAV_ADMIN}
            collapsed={collapsed}
            state={groupStates}
            onToggle={toggleGroup}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-(--secondary)/20 p-6">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
