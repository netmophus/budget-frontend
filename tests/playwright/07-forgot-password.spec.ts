/**
 * SMOKE.7 — Forgot password flow self-service (Lot 6.5.A).
 *
 * Couvre le parcours user complet jusqu'à la confirmation côté UI :
 *  - depuis /login, clique sur le lien "Mot de passe oublié ?" ;
 *  - atterrit sur /forgot-password ;
 *  - remplit le champ email + submit ;
 *  - voit le bandeau de confirmation (message anti-énumération
 *    identique pour email connu/inconnu).
 *
 * On utilise un email aléatoire (PAS un persona seedé) pour ne pas
 * polluer l'état mdp d'un user réel — la sortie côté UI est la même
 * dans les 2 cas (anti-énumération), donc le smoke est valide.
 */
import { expect, test } from '@playwright/test';

test.describe('SMOKE.7 — Forgot password', () => {
  test("login → lien 'Mot de passe oublié' → /forgot-password → submit → confirmation", async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(
      page.getByTestId('login-lien-forgot-password'),
    ).toBeVisible();
    await page.getByTestId('login-lien-forgot-password').click();

    await page.waitForURL(/\/forgot-password$/, { timeout: 10_000 });
    await expect(page.getByTestId('page-forgot-password')).toBeVisible();

    // Email aléatoire — la réponse est identique pour connu/inconnu.
    const email = `e2e-fp-${Date.now()}@miznas.local`;
    await page.getByTestId('fp-email').fill(email);
    await page.getByTestId('fp-submit').click();

    await expect(page.getByTestId('forgot-confirmation')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('forgot-confirmation')).toContainText(
      /Si l'email existe/i,
    );
  });
});
