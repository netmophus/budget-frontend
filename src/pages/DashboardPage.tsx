import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/auth-store';

export function DashboardPage() {
  const { user, roles } = useAuthStore();
  const roleLabel = roles.length > 0 ? roles.join(', ') : 'utilisateur sans rôle';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Bienvenue, {user?.prenom} {user?.nom}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-(--muted-foreground)">
            Module Budgétaire Bancaire UEMOA — vous êtes connecté en tant que{' '}
            <span className="font-medium text-(--foreground)">{roleLabel}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
