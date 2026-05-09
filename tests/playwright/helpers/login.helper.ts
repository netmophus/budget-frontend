/**
 * Helpers d'authentification pour les smoke tests Playwright.
 *
 * Le helper `login()` exerce le formulaire `LoginPage` (champs id="email"
 * + id="motDePasse", bouton "Se connecter") et attend la redirection
 * vers `/dashboard`. Conforme au flux UI réel — aucun raccourci par
 * cookie ou storage state pour cette V1.
 *
 * `PERSONAS` mappe les alias aux comptes seedés :
 *   - admin / lecteur : créés par `auth-seed.ts`
 *   - 6 personas BSIC : créés par migration 1779200000090 (mot de
 *     passe commun MiznasTest!2026)
 */
import type { Page } from '@playwright/test';

export interface PersonaAccount {
  email: string;
  motDePasse: string;
}

export const PERSONAS = {
  admin: { email: 'admin@miznas.local', motDePasse: 'ChangeMe!2026' },
  lecteur: { email: 'lecteur@miznas.local', motDePasse: 'Lecteur!2026' },
  'adj.retail': {
    email: 'adj.retail@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
  'dir.retail': {
    email: 'dir.retail@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
  'dir.corporate': {
    email: 'dir.corporate@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
  'controleur.gestion': {
    email: 'controleur.gestion@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
  auditeur: {
    email: 'auditeur@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
  'dga.exploitation': {
    email: 'dga.exploitation@miznas.local',
    motDePasse: 'MiznasTest!2026',
  },
} as const satisfies Record<string, PersonaAccount>;

export type PersonaAlias = keyof typeof PERSONAS;

export async function login(
  page: Page,
  email: string,
  motDePasse: string,
): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#motDePasse').fill(motDePasse);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 10_000,
  });
}

export async function loginPersona(
  page: Page,
  alias: PersonaAlias,
): Promise<void> {
  const persona = PERSONAS[alias];
  await login(page, persona.email, persona.motDePasse);
}
