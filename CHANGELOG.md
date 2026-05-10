# Changelog — MIZNAS frontend

Au format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### Lot 6.5 — Notifications résiduelles — frontend (mai 2026)

#### Ajouté

**Forgot password self-service (Lot 6.5.A)**
- Page `/forgot-password` (`ForgotPasswordPage`) : form 1 champ email
  + bandeau confirmation anti-énumération (message identique
  qu'email connu ou inconnu côté backend).
- Page `/reset-password?token=XYZ` (`ResetPasswordPage`) : form
  2 champs (nouveau + confirmation) avec validation zod policy
  (≥ 12 + 1 maj + 1 min + 1 chiffre + 1 spécial), lit token via
  `useSearchParams`, redirige `/login` au succès, toast spécifique
  sur EXPIRED_TOKEN ("Le lien a expiré") vs INVALID_TOKEN ("Lien
  invalide ou déjà utilisé").
- Lien "Mot de passe oublié ?" sur `LoginPage`
  (`testid="login-lien-forgot-password"`).
- Routes `/forgot-password` et `/reset-password` (publiques, hors
  `ProtectedRoute` — l'utilisateur n'est pas authentifié quand il
  lance le flow).
- API client : `forgotPassword(email)` + `resetPassword(token,
  nouveauMdp)` dans `lib/api/auth.ts` ; types
  `ForgotPasswordResponse` + `ResetPasswordResponse` dans
  `lib/api/types.ts`.

#### Tests Vitest

- `ForgotPasswordPage.test.tsx` : 4 tests (rendu, validation API
  non appelée pour email invalide, succès avec confirmation, erreur
  API).
- `ResetPasswordPage.test.tsx` : 8 tests (sans token / avec token,
  validation policy ≥ 12 + complexité, confirmation, succès +
  navigate /login, erreur EXPIRED_TOKEN avec toast spécifique,
  erreur INVALID_TOKEN avec toast spécifique).

#### Tests Playwright

- `07-forgot-password.spec.ts` (SMOKE.7) : login → click "Mot de
  passe oublié ?" → /forgot-password → fill email aléatoire →
  submit → bandeau de confirmation visible. Email aléatoire (pas
  un persona) car la sortie est identique pour connu/inconnu.

#### Décisions

- **Pas de pre-check du token** au chargement de
  `/reset-password?token=XYZ` (cohérence backend) — l'erreur
  remonte au submit. Pattern UX standard (Google, GitHub).
- **Pas d'auto-login après reset** — redirige vers `/login` avec
  toast d'invitation à se reconnecter.
- **`BandeauNotificationJ3` non livré** (notif J-3 délégation est
  un email, pas une notif in-app). Reporté Lot 6.7 (UX résiduel).

---

### Lot 6.4 — Sécurisation des mots de passe (mai 2026)

#### Ajouté

- Page `/change-mdp` (route `ForceChangePasswordPage`, hors
  `AuthLayout` — plein écran bloquant) : formulaire 3 champs
  (ancien/nouveau/confirmation) avec validation zod policy-conforme
  (≥ 12 + 1 maj + 1 min + 1 chiffre + 1 spécial + ancien ≠ nouveau
  + confirmation match). Raison contextuelle ("temporaire" si
  doitChangerMdp ou "expiré" si mdpExpire).
- `ProtectedRoute` étendu : redirige vers `/change-mdp` si
  `doitChangerMdp || mdpExpire` ET pathname ≠ `/change-mdp`.
- `auth-store.ts` (Zustand persist) : flags `mdpExpire` +
  `doitChangerMdp` hydratés depuis le login (partialize), méthode
  `changerMdp(ancien, nouveau)` qui appelle `PATCH /me/password` et
  remplace les tokens sans flags. `useDoitChangerMdp()` hook.
- `src/lib/api/auth.ts` : `changerMdp()` ajouté.
- `src/lib/api/types.ts` : `LoginResponse` étendu avec `mdpExpire`
  + `doitChangerMdp`. `ChangerMdpResponse` + `ResetPasswordAdminResponse`.
- Smoke Playwright `06-force-change-password.spec.ts` (SMOKE.6) :
  admin force le flag via `POST /admin/users/:id/forcer-changement-mdp`
  → user redirigé `/change-mdp` au login → submit form → `/dashboard`,
  cleanup `PATCH /me/password` en `afterAll` pour restaurer le mdp
  original d'`auditeur`.
- Test Vitest régression `redirect-pattern.test.tsx` : rend
  `LoginPage` et `ForceChangePasswordPage` dans un `MemoryRouter`
  RÉEL (sans mock react-router-dom) + spy `console.error` →
  assert qu'aucun warning React `Cannot update a component while
  rendering` n'est émis. Empêche tout futur palier de réintroduire
  `navigate()` dans le render.

#### Modifié

- `ResetPasswordDialog` (Lot Administration) : suppression de
  l'affichage du mdp en clair + bouton « Copier ». Remplacés par
  un toast + Card de confirmation « Email envoyé à `<email>` »
  (cohérent breaking change DTO backend `ResetPasswordResponseDto =
  { success, message }`).
- `LoginPage` : pattern `<Navigate to=... replace />` déclaratif
  au lieu de `navigate()` impératif dans le render. Fix d'une dette
  latente préexistante (warning React `setState during render`)
  rendue critique par la double-redirection
  `/login → /dashboard → /change-mdp` du palier C.2.
- `ForceChangePasswordPage` : pattern `<Navigate />` déclaratif
  pour la garde anti-arrivée intempestive (idem fix).

#### Tests Vitest

- `ForceChangePasswordPage.test.tsx` : 10 tests (rendu, motifs
  contextuels mdpExpire vs doitChangerMdp, validation policy
  ≥ 12 / complexité / confirmation / ancien ≠ nouveau, succès,
  erreur API, garde anti-arrivée intempestive avec assertion
  déclarative sur le DOM).
- `ResetPasswordDialog.test.tsx` adapté : 3 tests (rendu sans mdp
  visible, succès avec toast Email envoyé, erreur API).

#### Décisions

- **Pattern `<Navigate />` plutôt que `useEffect + navigate()`** :
  navigate impératif dans le render produit le warning React
  `Cannot update a component while rendering` qui peut interrompre
  le mount du composant cible en concurrent rendering. `useEffect`
  masque le warning mais reste post-render et peut lui aussi être
  reverted. `<Navigate />` est déclaratif, géré par BrowserRouter
  dans la commit phase — pattern canonique React Router v7.
- **`BandeauMdpExpire` reporté Lot 6.7** (UX résiduel) — alerte UI
  proactive quand le mdp expire dans X jours, non critique pour MVP.

---

### Lot 6.2.B — Smoke tests Playwright (mai 2026)

#### Ajouté
- `@playwright/test` en devDep + Chromium installé une fois
  via `npx playwright install chromium`.
- `playwright.config.ts` à la racine : Chromium uniquement,
  workers=1 (anti-flake), retries=2 en CI / 0 local, screenshots
  only-on-failure, video retain-on-failure, trace on-first-retry,
  webServer auto-lance `npm run dev`.
- `tests/playwright/helpers/login.helper.ts` : helper `login()`
  exerçant le formulaire UI réel + `loginPersona()` avec map
  des 8 personas seedés (admin, lecteur, 6 personas BSIC).
- 5 smoke tests dans `tests/playwright/` :
  - `01-login-navigation.spec.ts` — login admin/lecteur, mauvais
    mdp, RBAC sidebar (3 cas).
  - `02-saisie-realise.spec.ts` — adj.retail ouvre dialog
    Nouvelle ligne réalisé.
  - `03-tableau-bord.spec.ts` — controleur.gestion lance
    l'analyse écarts (régression Lot 5.2-fix2).
  - `04-lancement-reforecast.spec.ts` — controleur.gestion ouvre
    le dialog Lancer un reforecast.
  - `05-workflow-budget.spec.ts` — dir.retail navigue sans crash
    sur /budget/saisie + /budget/a-valider.
- Script `npm run test:e2e:playwright`.
- Documentation : `tests/playwright/README.md` (pré-requis,
  comptes, décisions) + section §5 dans `docs/ci-cd.md`.
- `.gitignore` : `playwright-report/` et `test-results/`.

#### Décisions
- **CI reportée au Lot 6.8** (recette finale). Orchestration
  testcontainer + backend + Vite + Chromium = ~1 j de tuning
  pour V1, valeur faible. Les smoke restent jouables en local.
- **Bandabari → CR_AG_ABJ_PLATEAU** (1er CR disponible) :
  pas de Bandabari dans le seed BSIC.
- **SMOKE.4** s'arrête à l'ouverture du dialog (pas de création
  effective de reforecast) pour ne pas polluer la base BSIC à
  chaque run.
- **SMOKE.5** smoke léger (no-crash) — un test workflow complet
  exigerait pré-création d'une version à valider.
- **Sélecteurs `data-testid`** privilégiés (vs sélecteurs par
  texte) pour résistance aux remaniements UI.

#### Tests
- 7 tests Playwright en local Chromium headless : 7/7 verts en
  ~10s (après ~1s setup Vite).
- Aucune régression sur les tests Vitest existants.

---

## Lots antérieurs

Voir l'historique git (`git log --oneline`) pour les Lots 1-5
(MVP) et le Lot 6.1 (CI/CD GitHub Actions).
