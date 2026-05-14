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

/**
 * Animation staggered au mount (cohérente avec la zone identité du
 * PublicLayout — total ≈ 600 ms). Les classes `delay-*` sont
 * statiques pour rester purge-safe Tailwind.
 */
const ANIM_BASE =
  'animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both';

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

  // Lot 6.4.C.2 — pattern <Navigate /> déclaratif (vs `navigate()`
  // impératif dans le render).
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
      <div className="max-w-sm mx-auto w-full">
        <h1
          className={`text-3xl font-semibold tracking-tight text-(--foreground) mb-1.5 ${ANIM_BASE} delay-200`}
        >
          Connexion
        </h1>
        <p
          className={`text-[13px] text-(--muted-foreground) mb-7 ${ANIM_BASE} delay-300`}
        >
          Identifiez-vous avec vos identifiants BSIC pour accéder à votre périmètre.
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
          className="space-y-5"
          noValidate
        >
          <UnderlineInput
            id="email"
            type="email"
            label="Email"
            icon={Mail}
            autoComplete="username"
            placeholder="admin@miznas.local"
            errorMessage={errors.email?.message}
            register={register('email')}
            animationDelay="delay-400"
          />

          <UnderlineInput
            id="motDePasse"
            type="password"
            label="Mot de passe"
            icon={Lock}
            autoComplete="current-password"
            errorMessage={errors.motDePasse?.message}
            register={register('motDePasse')}
            animationDelay="delay-500"
          />

          <div className={`pt-2 ${ANIM_BASE} delay-600`}>
            <Button
              type="submit"
              className={cn(
                'w-full h-11 tracking-wide font-medium',
                'bg-(--miznas-bleu-nuit) text-white',
                'hover:bg-(--miznas-bleu-nuit)/90 hover:-translate-y-px',
                'active:translate-y-0',
                'transition-all duration-200',
                'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0',
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
          </div>

          <div className={`text-center pt-1 ${ANIM_BASE} delay-700`}>
            <Link
              to="/forgot-password"
              data-testid="login-lien-forgot-password"
              className="text-[13px] text-(--miznas-ambre) hover:underline underline-offset-[3px] transition-colors"
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

// ─── UnderlineInput — input premium border-bottom-only (Lot 7.3 V2) ─

interface UnderlineInputProps {
  id: string;
  type: 'email' | 'password';
  label: string;
  icon: typeof Mail;
  autoComplete: string;
  placeholder?: string;
  errorMessage?: string;
  register: UseFormRegisterReturn;
  animationDelay: string;
}

/**
 * Input premium charte v1 V2 : border-bottom only qui s'épaissit et
 * passe au bleu nuit au focus, icône à gauche qui passe du gris au
 * bleu nuit. Plus moderne et plus léger visuellement que la border
 * complète shadcn standard.
 *
 * Conservation stricte des points d'a11y : <label> avec htmlFor,
 * aria-invalid + aria-describedby sur erreur, role="alert" sur le
 * message d'erreur (immédiatement annoncé aux lecteurs d'écran).
 */
function UnderlineInput({
  id,
  type,
  label,
  icon: Icon,
  autoComplete,
  placeholder,
  errorMessage,
  register,
  animationDelay,
}: UnderlineInputProps) {
  const hasError = Boolean(errorMessage);
  return (
    <div className={`${ANIM_BASE} ${animationDelay}`}>
      <Label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.08em] text-(--muted-foreground) mb-2"
      >
        {label}
      </Label>
      <div className="relative group">
        <Icon
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors duration-200',
            hasError
              ? 'text-(--destructive)'
              : 'text-(--muted-foreground) group-focus-within:text-(--miznas-bleu-nuit)',
          )}
          aria-hidden="true"
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          {...register}
          className={cn(
            'w-full bg-transparent pl-7 pr-1 pb-2 pt-1 text-sm text-(--foreground)',
            'border-0 border-b border-(--border) rounded-none',
            'placeholder:text-(--muted-foreground)/60',
            'focus:outline-none focus:border-b-2 focus:border-(--miznas-bleu-nuit) focus:pb-[7px]',
            'transition-[border-color,padding] duration-200',
            hasError &&
              'border-(--destructive) focus:border-(--destructive)',
          )}
        />
      </div>
      {errorMessage && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-(--destructive) mt-1.5"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
