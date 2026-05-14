import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import type { ApiError } from '@/lib/api/types';
import { useAuthStore, useIsAuthenticated } from '@/lib/auth/auth-store';

const schema = z.object({
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(8, '8 caractères minimum'),
});

type LoginFormValues = z.infer<typeof schema>;

interface LocationState {
  from?: { pathname: string };
}

interface LoginInlineError {
  title: string;
  message: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = useIsAuthenticated();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Bandeau d'erreur inline persistant (Lot 7.3). Affiché pour les
  // erreurs auth critiques (401 / INVALID_CREDENTIALS / ACCOUNT_LOCKED)
  // qui ne doivent pas disparaître au bout de 5 s comme un toast.
  // Les erreurs réseau/serveur inattendues continuent à passer par
  // toast.error (volatile, suffisant pour ces cas non auth).
  const [loginError, setLoginError] = useState<LoginInlineError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', motDePasse: '' },
  });

  // Lot 6.4.C.2 — pattern <Navigate /> déclaratif (vs `navigate()`
  // impératif dans le render). Évite le warning React "Cannot
  // update a component while rendering".
  if (isAuth) {
    const from =
      (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setLoginError(null);
    try {
      await login(values.email, values.motDePasse);
      const from =
        (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (e) {
      const apiErr =
        axios.isAxiosError<ApiError>(e) && e.response?.data
          ? e.response.data
          : null;
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      const errMsg =
        apiErr?.message ??
        (e instanceof Error ? e.message : 'Erreur de connexion');

      if (apiErr?.errorCode === 'INVALID_CREDENTIALS' || status === 401) {
        setLoginError({
          title: 'Identifiants invalides',
          message:
            'Vérifiez votre adresse email et votre mot de passe, puis réessayez.',
        });
      } else if (apiErr?.errorCode === 'ACCOUNT_LOCKED') {
        // Compte verrouillé — affichage cohérent en bandeau inline.
        // Le compteur de tentatives UI et la logique métier complète
        // suivront en Lot 7.X-security (cf. CHANGELOG Lot 7.3).
        setLoginError({
          title: 'Compte verrouillé',
          message: errMsg,
        });
      } else {
        // Erreur réseau / serveur inattendue : toast volatile suffit.
        toast.error(errMsg);
      }
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5">
          Connexion
        </h1>
        <p className="text-[13px] text-(--muted-foreground) mb-6">
          Identifiez-vous pour accéder à votre périmètre.
        </p>

        {loginError && (
          <div
            data-testid="login-error-bandeau"
            role="alert"
            className="bg-(--destructive)/10 border-l-[3px] border-(--destructive) px-3.5 py-2.5 mb-4"
          >
            <div className="text-[13px] font-medium text-(--destructive)">
              {loginError.title}
            </div>
            <div className="text-xs text-(--destructive) mt-0.5 opacity-80">
              {loginError.message}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3.5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@miznas.local"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-xs text-(--destructive) mt-1.5"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motDePasse">Mot de passe</Label>
            <Input
              id="motDePasse"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.motDePasse ? true : undefined}
              aria-describedby={
                errors.motDePasse ? 'motDePasse-error' : undefined
              }
              {...register('motDePasse')}
            />
            {errors.motDePasse && (
              <p
                id="motDePasse-error"
                role="alert"
                className="text-xs text-(--destructive) mt-1.5"
              >
                {errors.motDePasse.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-(--miznas-bleu-nuit) hover:bg-(--miznas-bleu-nuit)/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>

          <div className="text-center pt-1">
            <Link
              to="/forgot-password"
              data-testid="login-lien-forgot-password"
              className="text-[13px] text-(--miznas-ambre) hover:underline underline-offset-[3px]"
            >
              Mot de passe oublié&nbsp;?
            </Link>
          </div>
        </form>

        <Toaster />
      </div>
    </PublicLayout>
  );
}
