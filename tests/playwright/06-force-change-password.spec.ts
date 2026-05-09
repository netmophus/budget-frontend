/**
 * SMOKE.6 — Force change password (Lot 6.4.C.2).
 *
 * Couvre :
 *  - admin force `doit_changer_mdp=true` sur un user via
 *    POST /admin/users/:id/forcer-changement-mdp ;
 *  - le user se connecte → est redirigé vers /change-mdp
 *    (PasswordExpiredGuard backend + ProtectedRoute frontend) ;
 *  - le user soumet le formulaire avec un nouveau mdp conforme à la
 *    policy (≥ 12 + complexité) ;
 *  - le user atterrit sur /dashboard, navigation débloquée.
 *
 * Cleanup : le mdp d'auditeur est restauré à sa valeur originale
 * via PATCH /me/password en API pour ne pas casser de futurs runs
 * (auditeur n'est PAS utilisé par les autres smokes 01..05).
 */
import { expect, request as playwrightRequest, test } from '@playwright/test';
import { PERSONAS } from './helpers/login.helper';

const ANCIEN_MDP_ORIGINAL = PERSONAS.auditeur.motDePasse; // 'MiznasTest!2026'
const NOUVEAU_MDP_TEMP = 'AuditeurChange!2026';

async function loginApi(
  ctx: import('@playwright/test').APIRequestContext,
  email: string,
  motDePasse: string,
): Promise<string> {
  const r = await ctx.post('/api/v1/auth/login', {
    data: { email, motDePasse },
  });
  expect(r.ok(), `login API ${email} doit réussir`).toBeTruthy();
  return (await r.json()).accessToken as string;
}

test.describe('SMOKE.6 — Force change password', () => {
  let adminToken: string;
  let auditeurId: string;

  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: 'http://localhost:5173',
    });
    adminToken = await loginApi(
      ctx,
      PERSONAS.admin.email,
      PERSONAS.admin.motDePasse,
    );
    // GET /users?email=... (USER.LIRE) — filtre LIKE %email%, retourne
    // PaginatedUsersDto { items, total, page, limit }. Pas d'endpoint
    // de listing sur /admin/users (qui n'expose que CRUD per-id).
    const r = await ctx.get(
      `/api/v1/users?email=${encodeURIComponent(PERSONAS.auditeur.email)}&limit=10`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(r.ok(), `GET /users?email= doit réussir (status=${r.status()})`).toBeTruthy();
    const body = (await r.json()) as { items: Array<{ id: string; email: string }> };
    const auditeur = body.items.find(
      (u) => u.email === PERSONAS.auditeur.email,
    );
    expect(auditeur, 'auditeur introuvable via /users?email=').toBeDefined();
    auditeurId = auditeur!.id;
    await ctx.dispose();
  });

  test('user avec doit_changer_mdp est redirigé vers /change-mdp puis débloqué après changement', async ({
    page,
    request,
  }) => {
    // 1) Force le flag côté backend (admin → POST forcer-changement-mdp).
    const forcer = await request.post(
      `/api/v1/admin/users/${auditeurId}/forcer-changement-mdp`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(forcer.ok(), 'forcer-changement-mdp doit retourner 200').toBeTruthy();

    // 2) Login UI auditeur avec mdp original — expect redirection vers
    // /change-mdp (et pas /dashboard, car PasswordExpiredGuard renvoie
    // 403 sur /me et le ProtectedRoute force /change-mdp).
    await page.goto('/login');
    await page.locator('#email').fill(PERSONAS.auditeur.email);
    await page.locator('#motDePasse').fill(ANCIEN_MDP_ORIGINAL);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await page.waitForURL(/\/change-mdp$/, { timeout: 10_000 });
    await expect(page.getByTestId('page-change-mdp')).toBeVisible();

    // 3) Remplir le formulaire avec un nouveau mdp policy-conforme.
    await page.getByTestId('cm-ancien').fill(ANCIEN_MDP_ORIGINAL);
    await page.getByTestId('cm-nouveau').fill(NOUVEAU_MDP_TEMP);
    await page.getByTestId('cm-confirmation').fill(NOUVEAU_MDP_TEMP);
    await page.getByTestId('cm-submit').click();

    // 4) Le user atterrit sur /dashboard, navigation débloquée.
    await page.waitForURL(/\/dashboard$/, { timeout: 10_000 });
  });

  test.afterAll(async () => {
    // Cleanup : restaurer le mdp original pour ne pas casser les runs
    // suivants. Si la restauration échoue (ex: le test a planté avant
    // le changement effectif), on ne fail PAS le suite — on log
    // simplement, le diagnostic reste sur le test principal.
    const ctx = await playwrightRequest.newContext({
      baseURL: 'http://localhost:5173',
    });
    try {
      const token = await loginApi(
        ctx,
        PERSONAS.auditeur.email,
        NOUVEAU_MDP_TEMP,
      );
      const restore = await ctx.patch('/api/v1/me/password', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          ancienMdp: NOUVEAU_MDP_TEMP,
          nouveauMdp: ANCIEN_MDP_ORIGINAL,
        },
      });
      if (!restore.ok()) {
        console.warn(
          `SMOKE.6 cleanup : restore PATCH /me/password = ${restore.status()}`,
        );
      }
    } catch (err) {
      console.warn(`SMOKE.6 cleanup : skip (login failed) — ${String(err)}`);
    } finally {
      await ctx.dispose();
    }
  });
});
