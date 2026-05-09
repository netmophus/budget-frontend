/**
 * SMOKE.3 — Tableau de bord budget vs réalisé (régression Lot 5.2-fix2).
 *
 * Le bug 5.2-fix2 affichait des "0" trompeurs dans les KPI cards en
 * mode erreur. La régression à éviter : KPI cards qui restent à "0"
 * silencieusement même quand le calcul d'écart a échoué.
 *
 * Ce smoke vérifie le flux nominal :
 *  - login controleur.gestion (BUDGET.LIRE + REALISE.LIRE = OK)
 *  - navigation /tableau-de-bord/budget-vs-realise
 *  - filtres présents (version, scenario, période, CRs)
 *  - clic "Analyser" → kpi-cards apparaissent (pas de spinner indéfini
 *    après 5s)
 *  - aucun crash console
 *
 * Note fragilité : si la base BSIC n'a pas de fait_budget+fait_realise
 * pour la version BUDGET_INITIAL_2026 sur la période sélectionnée,
 * les chiffres sont à 0 (légitimement). On vérifie donc juste la
 * présence des cards et l'absence d'erreur, pas les valeurs.
 */
import { expect, test } from '@playwright/test';
import { loginPersona } from './helpers/login.helper';

test.describe('SMOKE.3 — Tableau de bord budget vs réalisé', () => {
  test('controleur.gestion charge le tableau de bord et lance l\'analyse', async ({
    page,
  }) => {
    // Capture des erreurs console pour détecter les crashs JS silencieux.
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await loginPersona(page, 'controleur.gestion');

    await page.goto('/tableau-de-bord/budget-vs-realise');
    await expect(
      page.getByRole('heading', { name: /Tableau de bord/ }),
    ).toBeVisible();

    // Le formulaire de filtres est présent.
    await expect(page.getByTestId('filtres-form')).toBeVisible();

    // Sélection version (Radix Select).
    await page.getByTestId('tb-version').click();
    await page.getByRole('option').first().click();

    // Sélection scénario.
    await page.getByTestId('tb-scenario').click();
    await page.getByRole('option').first().click();

    // Saisie période 2026-01 → 2026-12 (BUDGET_INITIAL_2026 seedé).
    await page.getByTestId('tb-mois-debut').fill('2026-01');
    await page.getByTestId('tb-mois-fin').fill('2026-12');

    // Lancer l'analyse.
    const btnAnalyser = page.getByTestId('btn-analyser');
    await expect(btnAnalyser).toBeEnabled();
    await btnAnalyser.click();

    // Les KPI cards apparaissent (data ou pas, le composant doit
    // s'afficher — pas de spinner indéfini, pas de crash).
    await expect(page.getByTestId('kpi-cards')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('kpi-total')).toBeVisible();
    await expect(page.getByTestId('kpi-critique')).toBeVisible();
    await expect(page.getByTestId('kpi-attention')).toBeVisible();

    // Aucune erreur JS non interceptée (régression silencieuse).
    expect(consoleErrors).toEqual([]);
  });
});
