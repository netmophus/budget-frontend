import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileEdit,
  Handshake,
  History,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { Can } from '@/components/common/Can';
import { DashboardCard } from '@/components/common/DashboardCard';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiBandeau } from '@/components/tableau-bord/KpiBandeau';
import { useAuthStore } from '@/lib/auth/auth-store';
import { type PermissionMode } from '@/lib/auth/permissions';

/**
 * Animation staggered (Lot 7.2 commit 3) appliquée à chaque carte
 * via tw-animate-css. Valeurs choisies pour un effet fluide (~40 ms
 * entre chaque carte) sans excéder ~500 ms total — la dernière carte
 * apparaît avant que l'utilisateur n'ait eu le temps de scroller.
 *
 * Les classes `delay-*` doivent être statiques pour que Tailwind les
 * purge correctement — chaque valeur ci-dessous existe en source.
 */
const BASE_ANIM =
  'animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both';

interface CardSpec {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * Permission unique OU liste + mode pour le wrapper `<Can>`.
   * On reste fidèle à la signature de Can pour ne pas perdre la
   * modulation any/all (`Analyser les écarts` exige BUDGET.LIRE ET
   * REALISE.LIRE — `mode='all'`).
   */
  permission?: string;
  permissions?: string[];
  permissionMode?: PermissionMode;
}

const CARDS: CardSpec[] = [
  {
    to: '/budget/saisie',
    icon: FileEdit,
    title: 'Élaborer un budget',
    description:
      'Saisir et soumettre vos prévisions budgétaires sur votre périmètre.',
    permission: 'BUDGET.SAISIR',
  },
  {
    to: '/budget/versions',
    icon: CheckCircle2,
    title: 'Valider / Publier',
    description:
      'Valider les versions soumises ou publier les versions validées.',
    permissions: ['BUDGET.VALIDER', 'BUDGET.PUBLIER'],
    permissionMode: 'any',
  },
  {
    to: '/realise/saisie',
    icon: ClipboardCheck,
    title: 'Suivre le réalisé',
    description:
      'Saisir ou importer le réalisé comptable mensuel et le valider.',
    permission: 'REALISE.LIRE',
  },
  {
    to: '/tableau-de-bord/budget-vs-realise',
    icon: BarChart3,
    title: 'Analyser les écarts',
    description:
      "Visualiser les écarts budget vs réalisé avec 4 niveaux d'alerte.",
    permissions: ['BUDGET.LIRE', 'REALISE.LIRE'],
    permissionMode: 'all',
  },
  {
    to: '/reforecast',
    icon: TrendingUp,
    title: 'Reprévoir (reforecast)',
    description:
      'Lancer un atterrissage trimestriel à partir du réalisé consolidé.',
    permission: 'BUDGET.LIRE',
  },
  {
    to: '/mes-delegations',
    icon: Handshake,
    title: 'Mes délégations',
    description:
      'Recevoir ou émettre une délégation temporaire (anti-chaînage BCEAO).',
    permission: 'DELEGATION.LIRE',
  },
  {
    to: '/configuration',
    icon: Database,
    title: 'Référentiels',
    description:
      'Consulter et configurer les dimensions et référentiels secondaires.',
    permission: 'CONFIGURATION.LIRE',
  },
  {
    to: '/users',
    icon: Settings,
    title: 'Administration',
    description:
      'Gérer les utilisateurs, rôles, périmètres et notifications.',
    permission: 'USER.GERER',
  },
  {
    to: '/audit-logs',
    icon: History,
    title: 'Audit',
    description:
      "Consulter l'historique horodaté des actions sensibles (10 ans BCEAO).",
    permission: 'AUDIT.LIRE',
  },
];

/**
 * Delays staggered en ms par index de carte (0..8). Le bandeau KPI
 * occupe les 3 premiers slots d'animation (delay-0, delay-50, delay-100,
 * appliqués dans `KpiBandeau`), donc les cartes pédagogiques
 * commencent à delay-180. Liste statique pour rester purge-safe.
 */
const CARD_DELAYS = [
  'delay-180',
  'delay-220',
  'delay-260',
  'delay-300',
  'delay-340',
  'delay-380',
  'delay-420',
  'delay-460',
  'delay-500',
] as const;

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const title = fullName ? `Bienvenue, ${fullName}` : 'Bienvenue';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Module Budgétaire Bancaire UEMOA — accédez à vos modules selon vos permissions."
      />

      <KpiBandeau />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map((spec, idx) => {
          const card = (
            <DashboardCard
              to={spec.to}
              icon={spec.icon}
              title={spec.title}
              description={spec.description}
              className={`${BASE_ANIM} ${CARD_DELAYS[idx]}`}
            />
          );
          // `Can` exige soit `permission` soit `permissions` (pas les
          // deux), on dispatch sur la forme déclarée par la spec.
          if (spec.permissions) {
            return (
              <Can
                key={spec.to}
                permissions={spec.permissions}
                mode={spec.permissionMode ?? 'any'}
              >
                {card}
              </Can>
            );
          }
          return (
            <Can key={spec.to} permission={spec.permission!}>
              {card}
            </Can>
          );
        })}
      </div>
    </div>
  );
}
