/**
 * SMOKE.1 — Login + navigation principale.
 *
 * Couvre :
 *  - login admin réussi → redirection /dashboard + sidebar avec
 *    les 5 groupes (Référentiels, Budget, Exécution, Configuration,
 *    Administration)
 *  - login mauvais mot de passe → toast d'erreur visible
 *  - login lecteur → "Affectations" (item Admin réservé USER.GERER)
 *    n'apparaît PAS dans la sidebar
 *
 * Note décalage mandat : le test 3 du mandat ("sidebar n'a PAS
 * Administration") est inadapté car le LECTEUR a USER.LIRE +
 * AUDIT.LIRE → le groupe Administration reste visible avec
 * `/users` et `/audit-logs`. Test recadré sur l'item "Affectations"
 * (USER.GERER manquant) — ce qui valide quand même le filtrage RBAC.
 */
import { expect, test } from '@playwright/test';
import { login, PERSONAS } from './helpers/login.helper';

test.describe('SMOKE.1 — Login + navigation principale', () => {
  test('login admin → /dashboard + sidebar avec les 5 groupes', async ({ page }) => {
    await login(page, PERSONAS.admin.email, PERSONAS.admin.motDePasse);

    await expect(page).toHaveURL(/\/dashboard$/);

    // Utilise les data-testid du composant NavGroup pour cibler les
    // groupes (et pas les items qui peuvent partager le même libellé,
    // ex: "Configuration" est à la fois un groupe et un item).
    for (const groupKey of [
      'referentiels',
      'budget',
      'execution',
      'configuration',
      'administration',
    ]) {
      await expect(page.getByTestId(`nav-group-${groupKey}`)).toBeVisible();
    }
  });

  test('login mauvais mot de passe → message d\'erreur visible', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(PERSONAS.admin.email);
    await page.locator('#motDePasse').fill('mauvais-mdp-' + Date.now());
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // Le toast sonner affiche le message d'erreur. On reste sur /login.
    await expect(page.getByText(/erreur|incorrect|invalide/i).first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login lecteur → sidebar n\'a pas "Affectations" (USER.GERER manquant)', async ({ page }) => {
    await login(page, PERSONAS.lecteur.email, PERSONAS.lecteur.motDePasse);

    const sidebar = page.locator('aside');
    // Le groupe Administration reste visible (lecteur a USER.LIRE +
    // AUDIT.LIRE), mais l'item "Affectations" (USER.GERER) doit être
    // filtré.
    await expect(sidebar.getByText('Affectations', { exact: true })).toHaveCount(0);
    // En revanche "Utilisateurs" (USER.LIRE) reste visible.
    await expect(sidebar.getByText('Utilisateurs', { exact: true })).toBeVisible();
  });
});
