/**
 * ForgotPasswordPage (Lot 6.5.A) — formulaire 1 champ email pour
 * demander un lien de réinitialisation de mot de passe.
 *
 * Après soumission, message de succès **identique** quelle que soit
 * la réalité côté backend (email connu / inconnu / inactif) — c'est
 * la promesse anti-énumération du backend qu'on respecte côté UI.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { forgotPassword } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/types';

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
    <div className="flex min-h-screen items-center justify-center bg-(--secondary)/30 p-4">
      <div className="w-full max-w-md">
        <Card data-testid="page-forgot-password">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Mail className="h-10 w-10 text-(--primary)" />
            </div>
            <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
            <CardDescription className="text-sm text-(--muted-foreground)">
              Saisissez votre email. Si un compte est associé, vous recevrez
              un lien de réinitialisation valable 30 minutes.
            </CardDescription>
          </CardHeader>
          {envoye ? (
            <>
              <CardContent>
                <div
                  data-testid="forgot-confirmation"
                  className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
                >
                  <p className="font-medium">Demande enregistrée.</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Si l'email existe, un lien de réinitialisation a été
                    envoyé. Vérifiez votre boîte mail (et les spams) puis
                    cliquez sur le lien dans les 30 minutes.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/login" className="text-sm text-(--primary) hover:underline">
                  Retour à la connexion
                </Link>
              </CardFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@bsic.ne"
                    data-testid="fp-email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-(--destructive)">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="fp-submit"
                >
                  {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
                </Button>
                <Link
                  to="/login"
                  className="text-sm text-(--muted-foreground) hover:underline"
                >
                  Retour à la connexion
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
      <Toaster />
    </div>
  );
}
