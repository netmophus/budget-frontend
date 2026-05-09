/**
 * SMOKE.4 — Lancement reforecast (controleur.gestion BUDGET.REFORECAST_LANCER).
 *
 * Ce smoke valide :
 *  - login controleur.gestion
 *  - navigation /reforecast
 *  - bouton "Lancer un reforecast" visible (= permission présente)
 *  - clic → dialog ouvert avec le formulaire de lancement et les
 *    4 sélecteurs de trimestre (T1..T4)
 *  - structure du formulaire OK (version source, scénario, trimestre,
 *    libellé)
 *
 * DÈTTE TRACÉE (à isoler en Lot 6.8) : ce smoke se limite
 * volontairement à l'ouverture du dialog. Aller jusqu'à la création
 * effective d'un reforecast créerait un nouvel enregistrement
 * dim_version à chaque run, et basculerait les reforecasts
 * pré-existants en OBSOLETE — ce qui pollue la base BSIC
 * incrémentalement. Le mandat 6.2.B accepte explicitement cette
 * limitation tant que le test reste léger.
 *
 * Pré-requis pour aller plus loin (à terme) :
 *   - 1 version source statut=gele en base
 *   - 1 ligne fait_realise validée sur le trimestre cible
 *   - teardown SQL après chaque run pour purger les reforecasts
 *     créés par le test
 */
import { expect, test } from '@playwright/test';
import { loginPersona } from './helpers/login.helper';

test.describe('SMOKE.4 — Lancement reforecast', () => {
  test('controleur.gestion ouvre le dialog "Lancer un reforecast"', async ({
    page,
  }) => {
    await loginPersona(page, 'controleur.gestion');

    await page.goto('/reforecast');
    await expect(
      page.getByRole('heading', { name: 'Reforecasts trimestriels' }),
    ).toBeVisible();

    // Le bouton n'est visible que si BUDGET.REFORECAST_LANCER est
    // accordé (controleur.gestion = VALIDATEUR + permission ad-hoc).
    const btnLancer = page.getByTestId('rf-btn-lancer');
    await expect(btnLancer).toBeVisible();
    await btnLancer.click();

    // Dialog ouvert avec son formulaire.
    await expect(
      page.getByRole('heading', { name: /Lancer un reforecast/ }),
    ).toBeVisible();
    await expect(page.getByTestId('rf-lancer-form')).toBeVisible();

    // Sélecteurs principaux présents.
    await expect(page.getByTestId('rf-l-version')).toBeVisible();
    await expect(page.getByTestId('rf-l-scenario')).toBeVisible();
    await expect(page.getByTestId('rf-l-trimestre')).toBeVisible();

    // Les 4 boutons trimestre T1..T4 doivent être présents.
    for (const t of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`rf-l-trim-${t}`)).toBeVisible();
    }
  });
});
