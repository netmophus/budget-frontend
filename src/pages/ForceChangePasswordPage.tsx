/**
 * ForceChangePasswordPage (Lot 6.4.C.2) — page accessible uniquement
 * lorsqu'un user a `mdpExpire` ou `doitChangerMdp` posé sur sa session.
 *
 * Tant que le mdp n'a pas été changé :
 *  - le PasswordExpiredGuard côté backend renvoie 403 sur toutes les
 *    routes API sauf `/me/password`, `/auth/me`, `/auth/logout` ;
 *  - le `ProtectedRoute` côté frontend redirige toute navigation
 *    React vers `/change-mdp`.
 *
 * Politique mdp répliquée côté front (≥12 + 1 maj + 1 min + 1 chiffre
 * + 1 spécial) — défense en profondeur, l'API valide aussi.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { useAuthStore } from '@/lib/auth/auth-store';
import type { ApiError } from '@/lib/api/types';

const REGEX_MAJUSCULE = /[A-Z]/;
const REGEX_MINUSCULE = /[a-z]/;
const REGEX_CHIFFRE = /[0-9]/;
const REGEX_SPECIAL = /[^A-Za-z0-9]/;

const schema = z
  .object({
    ancienMdp: z.string().min(1, 'Mot de passe actuel requis'),
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
  })
  .refine((data) => data.ancienMdp !== data.nouveauMdp, {
    message: 'Le nouveau mot de passe doit être différent de l\'ancien',
    path: ['nouveauMdp'],
  });

type FormValues = z.infer<typeof schema>;

export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const mdpExpire = useAuthStore((s) => s.mdpExpire);
  const doitChangerMdp = useAuthStore((s) => s.doitChangerMdp);
  const changerMdp = useAuthStore((s) => s.changerMdp);
  const userEmail = useAuthStore((s) => s.user?.email ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ancienMdp: '', nouveauMdp: '', confirmation: '' },
  });

  // Si le user n'a pas besoin de changer (ex: arrivé ici par
  // erreur), on le renvoie au dashboard. Pattern <Navigate />
  // déclaratif — appeler navigate() dans le render produit un
  // warning React "Cannot update a component while rendering"
  // qui interrompt la transition /login → /dashboard → /change-mdp
  // pour le user avec doitChangerMdp=true.
  if (!mdpExpire && !doitChangerMdp) {
    return <Navigate to="/dashboard" replace />;
  }

  const raison = doitChangerMdp
    ? 'Mot de passe temporaire — vous devez le remplacer pour accéder à MIZNAS.'
    : 'Votre mot de passe a expiré — vous devez le renouveler pour continuer.';

  async function onSubmit(values: FormValues) {
    try {
      await changerMdp(values.ancienMdp, values.nouveauMdp);
      toast.success('Mot de passe modifié.');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      const message =
        axios.isAxiosError<ApiError>(e) && e.response?.data?.message
          ? e.response.data.message
          : 'Erreur lors du changement de mot de passe.';
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--secondary)/30 p-4">
      <div className="w-full max-w-md">
        <Card data-testid="page-change-mdp">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ShieldCheck className="h-10 w-10 text-(--primary)" />
            </div>
            <CardTitle className="text-2xl">Changement obligatoire</CardTitle>
            <CardDescription className="text-sm text-(--muted-foreground)">
              {raison}
              {userEmail && (
                <span className="block mt-1">
                  Compte : <strong>{userEmail}</strong>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ancienMdp">Mot de passe actuel</Label>
                <Input
                  id="ancienMdp"
                  type="password"
                  autoComplete="current-password"
                  data-testid="cm-ancien"
                  {...register('ancienMdp')}
                />
                {errors.ancienMdp && (
                  <p className="text-xs text-(--destructive)">
                    {errors.ancienMdp.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nouveauMdp">Nouveau mot de passe</Label>
                <Input
                  id="nouveauMdp"
                  type="password"
                  autoComplete="new-password"
                  data-testid="cm-nouveau"
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
                  data-testid="cm-confirmation"
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
                data-testid="cm-submit"
              >
                {isSubmitting ? 'Modification…' : 'Changer mon mot de passe'}
              </Button>
              <p className="text-xs text-(--muted-foreground) text-center">
                Cette page est obligatoire — toute autre action sera refusée
                tant que votre mot de passe n'est pas renouvelé.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}
