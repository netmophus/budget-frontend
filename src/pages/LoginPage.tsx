import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore, useIsAuthenticated } from '@/lib/auth/auth-store';
import type { ApiError } from '@/lib/api/types';

const schema = z.object({
  email: z.string().email("Email invalide"),
  motDePasse: z.string().min(8, '8 caractères minimum'),
});

type LoginFormValues = z.infer<typeof schema>;

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = useIsAuthenticated();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', motDePasse: '' },
  });

  if (isAuth) {
    const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
    navigate(from, { replace: true });
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values.email, values.motDePasse);
      const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (e) {
      const message =
        axios.isAxiosError<ApiError>(e) && e.response?.data?.message
          ? e.response.data.message
          : 'Erreur de connexion';
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--secondary)/30 p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">MIZNAS</CardTitle>
            <CardDescription>
              Module Budgétaire Bancaire UEMOA
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@miznas.local"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-(--destructive)">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <Input
                  id="motDePasse"
                  type="password"
                  autoComplete="current-password"
                  {...register('motDePasse')}
                />
                {errors.motDePasse && (
                  <p className="text-xs text-(--destructive)">
                    {errors.motDePasse.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
              <p className="text-xs text-(--muted-foreground)">
                MIZNAS — Module Budgétaire Bancaire UEMOA — v0.1
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}
