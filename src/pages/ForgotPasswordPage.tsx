/**
 * ForgotPasswordPage (Lot 7.3 V8 — refonte selon PublicLayout
 * et Charte v1, à l'identique de LoginPage V5).
 *
 * Formulaire 1 champ email pour demander un lien de
 * réinitialisation de mot de passe (Lot 6.5.A). La promesse
 * anti-énumération du backend est respectée côté UI : message de
 * succès identique quelle que soit la réalité côté backend (email
 * connu / inconnu / inactif).
 *
 * Migré du Card centré générique vers PublicLayout split 50/50.
 * Pattern visuel : icône Key dans cercle ambre, titre + sous-titre
 * centrés, séparateurs fins encadrant le form, bouton "Envoyer le
 * lien" avec icône Send, lien retour avec flèche.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { ArrowLeft, Key, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { forgotPassword } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email invalide'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [envoye, setEnvoye] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      const r = await forgotPassword(values.email);
      setEnvoye(true);
      toast.success(r.message);
    } catch (e) {
      const message =
        axios.isAxiosError<ApiError>(e) && e.response?.data?.message
          ? e.response.data.message
          : 'Erreur lors de la demande. Réessayez plus tard.';
      toast.error(message);
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto w-full" data-testid="page-forgot-password">
        {/* Icône clé dans cercle ambre clair — signature visuelle de
            la page "mot de passe oublié", parallèle au cadenas Lock
            de la page de connexion. */}
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-full bg-(--miznas-ambre)/10 flex items-center justify-center"
            data-testid="forgot-key-circle"
            aria-hidden="true"
          >
            <Key className="w-6 h-6 text-(--miznas-bleu-nuit-dark)" />
          </div>
        </div>

        <h3 className="text-center text-xl font-semibold tracking-tight text-(--foreground) mb-1.5">
          Mot de passe oublié
        </h3>
        <p className="text-[13px] text-(--muted-foreground) text-center mb-7 max-w-sm mx-auto">
          Saisissez votre adresse email professionnelle.
          <br />
          <span className="text-(--muted-foreground)/70">
            Vous recevrez un lien valable 30 minutes.
          </span>
        </p>

        {envoye ? (
          // Bandeau de confirmation — anti-énumération : message
          // identique quelle que soit la réalité côté backend.
          <>
            <div className="h-px bg-(--border) mb-6" aria-hidden="true" />
            <div
              data-testid="forgot-confirmation"
              className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
              role="status"
            >
              <p className="font-medium">Demande enregistrée.</p>
              <p className="mt-1 text-xs text-emerald-800">
                Si l&apos;email existe, un lien de réinitialisation a été
                envoyé. Vérifiez votre boîte mail (et les spams) puis
                cliquez sur le lien dans les 30 minutes.
              </p>
            </div>
            <div className="h-px bg-(--border) my-5" aria-hidden="true" />
            <div className="text-center">
              <Link
                to="/login"
                className="text-[13px] text-(--miznas-ambre) font-medium hover:underline underline-offset-[3px] inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Retour à la connexion
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="h-px bg-(--border) mb-6" aria-hidden="true" />

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3.5"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <div className="relative">
                  <Mail
                    className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
                      errors.email
                        ? 'text-(--destructive)'
                        : 'text-(--muted-foreground)',
                    )}
                    aria-hidden="true"
                    data-testid="forgot-icon-email"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre.email@bsic.com"
                    data-testid="fp-email"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={
                      errors.email ? 'email-error' : undefined
                    }
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

              <Button
                type="submit"
                className={cn(
                  'w-full h-10 font-semibold gap-2',
                  'bg-(--miznas-bleu-nuit-dark) text-white',
                  'hover:bg-(--miznas-bleu-nuit-dark)/90',
                  'transition-colors duration-200',
                  'disabled:opacity-70 disabled:cursor-not-allowed',
                )}
                disabled={isSubmitting}
                data-testid="fp-submit"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </form>

            <div className="h-px bg-(--border) my-5" aria-hidden="true" />

            <div className="text-center">
              <Link
                to="/login"
                className="text-[13px] text-(--miznas-ambre) font-medium hover:underline underline-offset-[3px] inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}

        <Toaster />
      </div>
    </PublicLayout>
  );
}
