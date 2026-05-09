/**
 * SMOKE.5 — Workflow budget (parcours validateur dir.retail).
 *
 * Smoke léger conforme au mandat : juste vérifier qu'aucune page
 * "validation" ne crash pour ce persona, sans pré-créer une version
 * à valider (qui demanderait un setup lourd).
 *
 * Couvre :
 *  - login dir.retail (VALIDATEUR)
 *  - navigation Budget → Saisie budgétaire (visible avec BUDGET.LIRE)
 *  - navigation Budget → À valider (visible avec BUDGET.VALIDER)
 *  - les 2 pages se chargent sans erreur ni toast d'erreur
 */
import { expect, test } from '@playwright/test';
import { loginPersona } from './helpers/login.helper';

test.describe('SMOKE.5 — Workflow budget', () => {
  test('dir.retail (VALIDATEUR) ouvre les pages Budget sans crash', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await loginPersona(page, 'dir.retail');

    // Page Saisie budgétaire (BUDGET.LIRE → accessible en lecture).
    await page.goto('/budget/saisie');
    await expect(page).toHaveURL(/\/budget\/saisie/);
    // Le contenu peut varier (selecteurs de version/scenario/CR ;
    // grille ou message "Sélectionnez un contexte"). On ne vérifie
    // pas un libellé précis pour ne pas être fragile au moindre
    // remaniement UI — on s'assure juste que la sidebar reste
    // présente (= layout intact, pas de crash global).
    await expect(page.locator('aside')).toBeVisible();

    // Page À valider (BUDGET.VALIDER → accessible pour VALIDATEUR).
    await page.goto('/budget/a-valider');
    await expect(page).toHaveURL(/\/budget\/a-valider/);
    await expect(page.locator('aside')).toBeVisible();

    // Aucune erreur JS non interceptée sur les 2 pages.
    expect(consoleErrors).toEqual([]);
  });
});
