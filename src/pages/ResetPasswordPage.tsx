/**
 * ResetPasswordPage (Lot 6.5.A) — page accédée via le lien email
 * `/reset-password?token=XYZ`.
 *
 * Pas de pre-check du token au chargement (décision Lot 6.5) : on
 * affiche le formulaire d'emblée, l'erreur (token invalide / expiré)
 * remonte au submit. Si le token n'est pas dans la query string, on
 * affiche un message d'erreur sans permettre la soumission.
 *
 * Sur succès → toast + redirection vers /login (le user doit se
 * reconnecter normalement, pas d'auto-login après reset).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { resetPassword } from '@/lib/api/auth';
import type { ApiError } from '@/lib/api/types';

const REGEX_MAJUSCULE = /[A-Z]/;
const REGEX_MINUSCULE = /[a-z]/;
const REGEX_CHIFFRE = /[0-9]/;
const REGEX_SPECIAL = /[^A-Za-z0-9]/;

const schema = z
  .object({
    nouveauMdp: z
      .string()
      .min(12, 'Au moins 12 caractères')
      .refine((v) => REGEX_MAJUSCULE.test(v), 'Au moins 1 majuscule')
      .refine((v) => REGEX_MINUSCULE.test(v), 'Au moins 1 minuscule')
      .refine((v) => REGEX_CHIFFRE.test(v), 'Au moins 1 chiffre')
      .refine(
        (v) => REGEX_SPECIAL.test(v),
        'Au moins 1 caractère spécial (ex: !@#$%)',
      ),
    confirmation: z.string(),
  })
  .refine((data) => data.nouveauMdp === data.confirmation, {
    message: 'La confirmation ne correspond pas au nouveau mot de passe',
    path: ['confirmation'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nouveauMdp: '', confirmation: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await resetPassword(token, values.nouveauMdp);
      toast.success(
        'Mot de passe changé avec succès. Vous pouvez maintenant vous connecter.',
      );
      navigate('/login', { replace: true });
    } catch (e) {
      const apiErr =
        axios.isAxiosError<ApiError>(e) && e.response?.data
          ? e.response.data
          : null;
      const message =
        apiErr?.errorCode === 'EXPIRED_TOKEN'
          ? "Le lien a expiré. Refaites une demande de réinitialisation."
          : apiErr?.errorCode === 'INVALID_TOKEN'
            ? 'Lien invalide ou déjà utilisé. Refaites une demande de réinitialisation.'
            : (apiErr?.message ??
              'Erreur lors de la réinitialisation. Réessayez plus tard.');
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--secondary)/30 p-4">
      <div className="w-full max-w-md">
        <Card data-testid="page-reset-password">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ShieldCheck className="h-10 w-10 text-(--primary)" />
            </div>
            <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
            <CardDescription className="text-sm text-(--muted-foreground)">
              Choisissez un nouveau mot de passe pour votre compte MIZNAS.
            </CardDescription>
          </CardHeader>
          {!token ? (
            <CardContent>
              <div
                data-testid="rp-token-manquant"
                className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <p className="font-medium">Lien invalide.</p>
                <p className="mt-1 text-xs">
                  Le lien de réinitialisation est incomplet. Refaites une
                  demande depuis la page&nbsp;
                  <Link to="/forgot-password" className="underline">
                    « Mot de passe oublié »
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nouveauMdp">Nouveau mot de passe</Label>
                  <Input
                    id="nouveauMdp"
                    type="password"
                    autoComplete="new-password"
                    data-testid="rp-nouveau"
                    {...register('nouveauMdp')}
                  />
                  {errors.nouveauMdp && (
                    <p className="text-xs text-(--destructive)">
                      {errors.nouveauMdp.message}
                    </p>
                  )}
                  <p className="text-xs text-(--muted-foreground)">
                    ≥ 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1
                    caractère spécial.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmation">Confirmation</Label>
                  <Input
                    id="confirmation"
                    type="password"
                    autoComplete="new-password"
                    data-testid="rp-confirmation"
                    {...register('confirmation')}
                  />
                  {errors.confirmation && (
                    <p className="text-xs text-(--destructive)">
                      {errors.confirmation.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="rp-submit"
                >
                  {isSubmitting ? 'Modification…' : 'Réinitialiser mon mot de passe'}
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
