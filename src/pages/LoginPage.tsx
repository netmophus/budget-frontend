import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
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
      {/* Card encadrée centrée — Lot 7.3 V3 : remplace la version
          underline-only V2 par un cadre visible plus structurant.
          Bordure 1 px gris pâle + rounded-lg + padding 32 px (p-8),
          fond blanc explicite. Animation fade-in au mount. */}
      <div className="max-w-sm mx-auto w-full animate-in fade-in duration-500 fill-mode-both delay-200">
        <div className="rounded-lg border border-(--border) bg-(--background) p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-(--foreground) mb-1.5">
            Connexion
          </h1>
          <p className="text-[13px] text-(--muted-foreground) mb-6">
            Identifiez-vous avec vos identifiants BSIC.
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

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FieldWithIcon
              id="email"
              type="email"
              label="Email"
              icon={Mail}
              autoComplete="username"
              placeholder="admin@miznas.local"
              errorMessage={errors.email?.message}
              register={register('email')}
            />

            <FieldWithIcon
              id="motDePasse"
              type="password"
              label="Mot de passe"
              icon={Lock}
              autoComplete="current-password"
              errorMessage={errors.motDePasse?.message}
              register={register('motDePasse')}
            />

            <Button
              type="submit"
              className={cn(
                'w-full h-11 mt-2',
                'bg-(--miznas-bleu-nuit) text-white',
                'hover:bg-(--miznas-bleu-nuit)/90',
                'transition-colors duration-200',
                'disabled:opacity-70 disabled:cursor-not-allowed',
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </Button>

            <div className="text-center pt-1">
              <Link
                to="/forgot-password"
                data-testid="login-lien-forgot-password"
                className="text-[13px] text-(--miznas-ambre) hover:underline underline-offset-[3px] transition-colors"
              >
                Mot de passe oublié&nbsp;?
              </Link>
            </div>
          </form>
        </div>

        <Toaster />
      </div>
    </PublicLayout>
  );
}

// ─── FieldWithIcon — input shadcn standard + icône Lucide à gauche

interface FieldWithIconProps {
  id: string;
  type: 'email' | 'password';
  label: string;
  icon: typeof Mail;
  autoComplete: string;
  placeholder?: string;
  errorMessage?: string;
  register: UseFormRegisterReturn;
}

/**
 * Field standard charte v1 V3 : <Label> shadcn classique au-dessus,
 * <Input> shadcn bordure complète (h-11 pour confort), icône Lucide
 * positionnée en absolu à gauche de l'input avec `pl-10` côté input
 * pour laisser la place. Plus structurant et lisible que la version
 * underline-only V2.
 *
 * A11y stricte : <Label htmlFor>, aria-invalid + aria-describedby
 * conditionnels, <p role="alert"> pour annonce immédiate aux
 * lecteurs d'écran.
 */
function FieldWithIcon({
  id,
  type,
  label,
  icon: Icon,
  autoComplete,
  placeholder,
  errorMessage,
  register,
}: FieldWithIconProps) {
  const hasError = Boolean(errorMessage);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors duration-200',
            hasError ? 'text-(--destructive)' : 'text-(--muted-foreground)',
          )}
          aria-hidden="true"
        />
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={cn(
            'h-11 pl-10',
            hasError &&
              'border-(--destructive) focus-visible:ring-(--destructive)',
          )}
          {...register}
        />
      </div>
      {errorMessage && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-(--destructive)"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
