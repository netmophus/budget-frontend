import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>403 — Accès refusé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-(--muted-foreground)">
            Vous n'avez pas les permissions nécessaires pour consulter cette page.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
