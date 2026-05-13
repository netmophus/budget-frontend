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
} from 'lucide-react';
import { Can } from '@/components/common/Can';
import { DashboardCard } from '@/components/common/DashboardCard';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuthStore } from '@/lib/auth/auth-store';

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Can permission="BUDGET.SAISIR">
          <DashboardCard
            to="/budget/saisie"
            icon={FileEdit}
            title="Élaborer un budget"
            description="Saisir et soumettre vos prévisions budgétaires sur votre périmètre."
          />
        </Can>

        <Can permissions={['BUDGET.VALIDER', 'BUDGET.PUBLIER']} mode="any">
          <DashboardCard
            to="/budget/versions"
            icon={CheckCircle2}
            title="Valider / Publier"
            description="Valider les versions soumises ou publier les versions validées."
          />
        </Can>

        <Can permission="REALISE.LIRE">
          <DashboardCard
            to="/realise/saisie"
            icon={ClipboardCheck}
            title="Suivre le réalisé"
            description="Saisir ou importer le réalisé comptable mensuel et le valider."
          />
        </Can>

        <Can permissions={['BUDGET.LIRE', 'REALISE.LIRE']} mode="all">
          <DashboardCard
            to="/tableau-de-bord/budget-vs-realise"
            icon={BarChart3}
            title="Analyser les écarts"
            description="Visualiser les écarts budget vs réalisé avec 4 niveaux d'alerte."
          />
        </Can>

        <Can permission="BUDGET.LIRE">
          <DashboardCard
            to="/reforecast"
            icon={TrendingUp}
            title="Reprévoir (reforecast)"
            description="Lancer un atterrissage trimestriel à partir du réalisé consolidé."
          />
        </Can>

        <Can permission="DELEGATION.LIRE">
          <DashboardCard
            to="/mes-delegations"
            icon={Handshake}
            title="Mes délégations"
            description="Recevoir ou émettre une délégation temporaire (anti-chaînage BCEAO)."
          />
        </Can>

        <Can permission="CONFIGURATION.LIRE">
          <DashboardCard
            to="/configuration"
            icon={Database}
            title="Référentiels"
            description="Consulter et configurer les dimensions et référentiels secondaires."
          />
        </Can>

        <Can permission="USER.GERER">
          <DashboardCard
            to="/users"
            icon={Settings}
            title="Administration"
            description="Gérer les utilisateurs, rôles, périmètres et notifications."
          />
        </Can>

        <Can permission="AUDIT.LIRE">
          <DashboardCard
            to="/audit-logs"
            icon={History}
            title="Audit"
            description="Consulter l'historique horodaté des actions sensibles (10 ans BCEAO)."
          />
        </Can>
      </div>
    </div>
  );
}
