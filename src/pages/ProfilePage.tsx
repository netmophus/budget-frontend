import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { getMe } from '@/lib/api/auth';
import type { CurrentUserView, EffectivePermission } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/auth-store';

function groupByModule(permissions: EffectivePermission[]): Record<string, EffectivePermission[]> {
  const out: Record<string, EffectivePermission[]> = {};
  for (const p of permissions) {
    if (!out[p.module]) out[p.module] = [];
    out[p.module]!.push(p);
  }
  return out;
}

export function ProfilePage() {
  const { permissions } = useAuthStore();
  const [me, setMe] = useState<CurrentUserView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((data) => {
      setMe(data);
      setLoading(false);
    });
  }, []);

  const grouped = groupByModule(permissions);

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Informations, rôles et permissions effectives." />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading || !me ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div>
                  <span className="text-(--muted-foreground)">Nom :</span>{' '}
                  <span className="font-medium">{me.nom}</span>
                </div>
                <div>
                  <span className="text-(--muted-foreground)">Prénom :</span>{' '}
                  <span className="font-medium">{me.prenom}</span>
                </div>
                <div>
                  <span className="text-(--muted-foreground)">Email :</span>{' '}
                  <span className="font-medium">{me.email}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rôles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading || !me ? (
              <Skeleton className="h-20 w-full" />
            ) : me.roles.length === 0 ? (
              <p className="text-sm text-(--muted-foreground)">Aucun rôle attribué.</p>
            ) : (
              me.roles.map((role) => (
                <div key={role.code} className="flex flex-col gap-1">
                  <Badge>{role.code}</Badge>
                  <span className="text-xs text-(--muted-foreground)">
                    {role.libelle} — périmètre : {role.perimetreType ?? 'global'}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Permissions effectives ({permissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-4">
                {Object.keys(grouped)
                  .sort()
                  .map((module) => (
                    <div key={module}>
                      <p className="text-xs uppercase tracking-wide text-(--muted-foreground) mb-2">
                        {module}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {grouped[module]!.map((p) => (
                          <Badge key={p.code_permission} variant="secondary">
                            {p.code_permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                {Object.keys(grouped).length === 0 && (
                  <p className="text-sm text-(--muted-foreground)">
                    Aucune permission attribuée.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!loading && me && (
        <p className="text-xs text-(--muted-foreground)">
          Profil chargé à {format(new Date(), 'HH:mm:ss')}.
        </p>
      )}
    </div>
  );
}
