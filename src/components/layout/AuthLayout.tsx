import {
  Calendar,
  Coins,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  ScrollText,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useState } from 'react';
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
import { Can } from '@/components/common/Can';
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
];

const NAV_REFERENTIELS: NavItem[] = [
  {
    to: '/referentiels/temps',
    label: 'Calendrier',
    icon: Calendar,
    permission: 'REFERENTIEL.LIRE',
  },
  {
    to: '/referentiels/devises',
    label: 'Devises',
    icon: Coins,
    permission: 'REFERENTIEL.LIRE',
  },
];

const NAV_ADMIN: NavItem[] = [
  { to: '/users', label: 'Utilisateurs', icon: Users, permission: 'USER.LIRE' },
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

export function AuthLayout() {
  const navigate = useNavigate();
  const { user, roles, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

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
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'border-r border-(--border) bg-(--background) p-3 space-y-1 transition-all',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          {NAV_TOP.map((item) => (
            <NavLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          <Can permission="REFERENTIEL.LIRE">
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 pt-4 pb-1 text-xs font-semibold uppercase text-(--muted-foreground)">
                <Library className="h-3.5 w-3.5" />
                Référentiels
              </div>
            )}
            {NAV_REFERENTIELS.map((item) => (
              <NavLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </Can>

          {NAV_ADMIN.map((item) => (
            <NavLink key={item.to} item={item} collapsed={collapsed} />
          ))}
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
