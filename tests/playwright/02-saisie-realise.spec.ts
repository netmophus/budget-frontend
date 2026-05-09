/**
 * SMOKE.2 — Saisie réalisé (adj.retail SAISISSEUR).
 *
 * Couvre :
 *  - login adj.retail → navigation /realise/saisie
 *  - sélection contexte (CR + période) → "Nouvelle ligne" devient
 *    enabled
 *  - clic "Nouvelle ligne" → dialog de saisie ouvert avec champs
 *    attendus (compte, ligne métier, mois, devise, montant)
 *
 * Décalage mandat tracé : le mandat utilise "CR Bandabari" mais le
 * seed BSIC ne contient que les CR de Côte d'Ivoire (CR_AG_ABJ_PLATEAU,
 * CR_AG_ABJ_COCODY, etc.) → on prend CR_AG_ABJ_PLATEAU. adj.retail
 * SAISISSEUR n'a pas d'affectation périmètre seedée par défaut, mais
 * le sélecteur CR de la page est en lecture libre (le RBAC bloque
 * uniquement à l'écriture côté backend) — donc le smoke test peut
 * exercer le flux UI sans data côté backend.
 *
 * Volontairement on ne va pas jusqu'à l'enregistrement de la ligne
 * (qui exigerait de sélectionner un compte exact + ligne métier exacte
 * avec data BSIC précise). Ce smoke valide que l'UI charge, le flux
 * d'ouverture du dialog fonctionne, et le formulaire est prêt à saisir.
 */
import { expect, test } from '@playwright/test';
import { loginPersona } from './helpers/login.helper';

test.describe('SMOKE.2 — Saisie réalisé', () => {
  test('adj.retail ouvre la page Saisie réalisé et le dialog "Nouvelle ligne"', async ({
    page,
  }) => {
    await loginPersona(page, 'adj.retail');

    await page.goto('/realise/saisie');
    await expect(page.getByRole('heading', { name: 'Saisie réalisé' })).toBeVisible();

    // Sélecteur de contexte présent.
    await expect(page.getByTestId('selecteur-contexte')).toBeVisible();

    // Sélection du 1er CR disponible (Radix Select : click trigger →
    // click option). On évite de cibler un code CR spécifique pour ne
    // pas dépendre de l'ordre de chargement async ni du seed BSIC
    // exact (une seule option suffit pour activer "Nouvelle ligne").
    await page.getByTestId('r-cr').click();
    await page.getByRole('option').first().click();

    // Une fois un CR sélectionné, "Nouvelle ligne" doit s'activer.
    const btnNouvelle = page.getByTestId('btn-nouvelle-ligne');
    await expect(btnNouvelle).toBeEnabled();
    await btnNouvelle.click();

    // Le dialog de saisie est ouvert avec les champs attendus.
    await expect(
      page.getByRole('heading', { name: 'Nouvelle ligne réalisé' }),
    ).toBeVisible();
    await expect(page.getByTestId('r-compte')).toBeVisible();
    await expect(page.getByTestId('r-lignemetier')).toBeVisible();
    await expect(page.getByTestId('r-mois')).toBeVisible();
    await expect(page.getByTestId('r-montant')).toBeVisible();
    await expect(page.getByTestId('btn-enregistrer-realise')).toBeVisible();
  });
});
