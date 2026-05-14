import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

  const [loginError, setLoginError] = useState<LoginInlineError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', motDePasse: '' },
  });

  // Lot 6.4.C.2 — pattern <Navigate /> déclaratif.
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
        setLoginError({
          title: 'Compte verrouillé',
          message: errMsg,
        });
      } else {
        toast.error(errMsg);
      }
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto w-full">
        {/* Icône cadenas dans cercle ambre clair — signature visuelle
            de la page d'auth, sans ombre ni gradient. */}
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-full bg-(--miznas-ambre)/10 flex items-center justify-center"
            data-testid="login-lock-circle"
            aria-hidden="true"
          >
            <Lock className="w-6 h-6 text-(--miznas-bleu-nuit-dark)" />
          </div>
        </div>

        <h3 className="text-center text-xl font-semibold tracking-tight text-(--foreground) mb-1.5">
          Connexion
        </h3>
        <p className="text-[13px] text-(--muted-foreground) text-center mb-7">
          Accédez à votre espace de pilotage budgétaire.
        </p>

        {loginError && (
          <div
            data-testid="login-error-bandeau"
            role="alert"
            className="flex items-start gap-2.5 bg-(--destructive)/10 border-l-[3px] border-(--destructive) px-3.5 py-2.5 mb-5 animate-in fade-in slide-in-from-top-1 duration-300"
          >
            <AlertCircle
              className="h-4 w-4 mt-0.5 shrink-0 text-(--destructive)"
              aria-hidden="true"
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-(--destructive)">
                {loginError.title}
              </div>
              <div className="text-xs text-(--destructive) mt-0.5 opacity-80">
                {loginError.message}
              </div>
            </div>
          </div>
        )}

        <div className="h-px bg-(--border) mb-6" aria-hidden="true" />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3.5"
          noValidate
        >
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
                  errors.email
                    ? 'text-(--destructive)'
                    : 'text-(--muted-foreground)',
                )}
                aria-hidden="true"
                data-testid="login-icon-email"
              />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="votre.email@domaine.com"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={cn(
                  'pl-10 h-10',
                  errors.email &&
                    'border-(--destructive) focus-visible:ring-(--destructive)',
                )}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-xs text-(--destructive)"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Mot de passe + bouton œil show/hide */}
          <div className="space-y-2">
            <Label htmlFor="motDePasse">Mot de passe</Label>
            <div className="relative">
              <Lock
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
                  errors.motDePasse
                    ? 'text-(--destructive)'
                    : 'text-(--muted-foreground)',
                )}
                aria-hidden="true"
                data-testid="login-icon-password"
              />
              <Input
                id="motDePasse"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={errors.motDePasse ? true : undefined}
                aria-describedby={
                  errors.motDePasse ? 'motDePasse-error' : undefined
                }
                className={cn(
                  'pl-10 pr-10 h-10',
                  errors.motDePasse &&
                    'border-(--destructive) focus-visible:ring-(--destructive)',
                )}
                {...register('motDePasse')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted-foreground) hover:text-(--foreground) transition-colors"
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
                data-testid="login-toggle-password-visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.motDePasse && (
              <p
                id="motDePasse-error"
                role="alert"
                className="text-xs text-(--destructive)"
              >
                {errors.motDePasse.message}
              </p>
            )}
          </div>

          {/* Bouton submit — bleu nuit dark, h-10 (40 px) */}
          <Button
            type="submit"
            className={cn(
              'w-full h-10 font-semibold',
              'bg-(--miznas-bleu-nuit-dark) text-white',
              'hover:bg-(--miznas-bleu-nuit-dark)/90',
              'transition-colors duration-200',
              'disabled:opacity-70 disabled:cursor-not-allowed',
            )}
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="h-px bg-(--border) my-5" aria-hidden="true" />

        <div className="text-center">
          <Link
            to="/forgot-password"
            data-testid="login-lien-forgot-password"
            className="text-[13px] text-(--miznas-ambre) font-medium hover:underline underline-offset-[3px] transition-colors"
          >
            Mot de passe oublié&nbsp;?
          </Link>
        </div>

        <Toaster />
      </div>
    </PublicLayout>
  );
}
