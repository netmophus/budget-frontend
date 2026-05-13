# Changelog — MIZNAS frontend

Au format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [v1.0.0-mvp] - 2026-05-13

### MVP MIZNAS — Frontend React 19

Tag de release MVP frontend, synchronisé avec backend
v1.0.0-mvp. Le périmètre MVP du module Budgétaire Bancaire
UEMOA est intégralement livré côté frontend (toutes pages
Lots 1 → 6.7 fonctionnelles), prêt pour la recette manuelle en
pré-prod chez la banque pilote BSIC.

**Documentation complète centralisée backend** :

- [Doc release v1.0.0-mvp](https://github.com/netmophus/budget-backend/blob/main/docs/RELEASE-v1.0.0-mvp.md)
  — 8 sections, ~950 lignes : features, stack, déploiement,
  comptes seed BSIC, endpoints, dette tracée, procédure de tag
- [Recette MVP R1-R15](https://github.com/netmophus/budget-backend/blob/main/docs/RECETTE-MVP.md)
  — 15 scénarios bout-en-bout à exécuter par BSIC en pré-prod

#### Récap frontend au tag v1.0.0-mvp

- **579 tests Vitest verts** (Testing Library + jsdom)
- **9 tests Playwright** smoke locaux (Chromium headless,
  ~10s — CI orchestrée reportée Lot 7+ avec pattern documenté
  doc release §7.3)
- ESLint **0 problems** + `tsc -b` strict **0 erreurs** +
  `vite build` VERT (Required CI bloquant)
- Branch protection active sur `main` du repo
  `netmophus/budget-frontend` (Required checks ESLint, tsc -b
  strict, Vitest, vite build, install + cache)

#### Stack technique

- **React 19.2** + **Vite 8** + **TypeScript 5** strict
- **Tailwind CSS 4** + shadcn-style UI primitives + Radix UI
  (Tooltip, Dialog, Dropdown, Select, Toast, etc.)
- **Zustand 5** (auth store persist) + **axios** avec refresh
  token rotation
- **React Router v7** (routes protégées + permissions)
- **TanStack Table v8** (DataTable serveur-paginée)
- **React Hook Form** + **Zod** (validation formulaires)
- **Sonner** (toasts) + **Lucide React** (icônes)
- **Vitest** + **Testing Library** + **Playwright Chromium**

#### Pages livrées au MVP

Toutes les pages des Lots 1 → 6.7 sont opérationnelles
(authentification, dashboard, profile, users / audit-logs /
admin/users, configuration, saisie budgétaire, à valider,
versions, scénarios, multi-périmètres, délégations, email-log,
préférences notifications, saisie réalisé, tableau de bord
budget vs réalisé, reforecast, forgot/reset/change password).

> **Note** : `README.md` frontend documente uniquement les
> pages Lot 1 (LoginPage / DashboardPage / Users / AuditLogs).
> Une mise à jour exhaustive est tracée en dette mineure Lot 7+
> (cf. doc release backend §7.2).

#### Dette tracée frontend Lot 7+

Cf. [doc release backend §7.2](https://github.com/netmophus/budget-backend/blob/main/docs/RELEASE-v1.0.0-mvp.md#72-dette-frontend).
Principaux items :

- Pattern 1 hydratation (~30 cas) : `useEffect(() => setX(props.X), [props])`
  → `<Component key={props.id} />` + `useState(() => initFromProps)`
- Pattern 2 fetch+loading (~35 cas) :
  `useEffect(() => { setLoading(true); fetch(...) }, [])`
  → Suspense + `use(promise)` ou react-query
- Migration `JSX.Element` → `React.ReactElement` (59
  occurrences, shim global `src/types/jsx.d.ts` à retirer)
- Optimisation chunks > 500 kB (code-splitting + lazy routes)
- DataTable `@tanstack/react-table v8` non React Compiler
  compatible (`DataTable.tsx`)
- Refresh token en `localStorage` → migration vers cookie
  `httpOnly + Secure` côté backend (**sécurité**)
- README frontend à actualiser (mention Lot 1 only)

#### CI Playwright (orchestration)

Reportée Lot 7+. Pattern préféré documenté dans
[doc release backend §7.3](https://github.com/netmophus/budget-backend/blob/main/docs/RELEASE-v1.0.0-mvp.md#73-ci-playwright-non-orchestrée) :
job `playwright-e2e` skipped en PR, lancé sur push `main`,
avec services GitHub Actions Postgres + Redis + démarrage
backend NestJS + `vite build && vite preview` + `npx
playwright test`. Effort estimé 1-2j.

---

### Lot 6.8 — Recette finale + doc release MVP (mai 2026)

Côté frontend : entrée CHANGELOG synchronisée avec le tag
backend `v1.0.0-mvp`. Aucune modification de code applicatif.

Le travail Lot 6.8 (recette transverse `docs/RECETTE-MVP.md`
+ doc release `docs/RELEASE-v1.0.0-mvp.md`) est centralisé
côté backend (cf. CHANGELOG backend Lot 6.8).

---

### Lot 6.7 — UX résiduel — frontend (mai 2026)

Objectif : 3 améliorations UX avant recette finale Lot 6.8.
Diagnostic préalable systématique (discipline acquise au Lot 6.6)
a écarté une tâche basée sur hypothèse fausse (`structure_id`
n'existe pas dans les entités) et a ramené une autre de 3-4h
à 15 min (édition reforecast existe déjà via redirect).

Documentation complète : voir `docs/lot-6/6.7-ux-residuel.md`
côté backend (le Lot 6.7 est traité cross-repo).

#### Métriques

- ESLint frontend : **0 problems** (préservé)
- tsc strict frontend : **0 erreurs** (préservé)
- `npm run build` (`tsc -b && vite build`) : **VERT**
- Vitest : **561 → 579 verts** (+18 tests cumulés sur 3 sous-lots)

#### Ajouté

- **Lot 6.7.1 — BandeauMdpExpire** : composant `<BandeauMdpExpire />`
  affiché globalement dans `AuthLayout` quand
  `mdpExpireProchainement === true` (calcul backend Lot 6.7.1).
  Style orange (alerte modérée), lien « Changer maintenant » vers
  `/change-mdp`. Persistance Zustand `mdpExpireProchainement` (résiste
  au refresh). Hook `useMdpExpireProchainement()` exposé.
- **Lot 6.7.1 — Extension `ForceChangePasswordPage` (Lot 6.4.C.2)** :
  accepte le cas J-7 (`mdpExpireProchainement`) en plus de
  `mdpExpire` / `doitChangerMdp`. Texte `raison` à 3 cas, bouton
  **« Plus tard » VISIBLE uniquement en cas J-7 pur** (caché si
  `mdpExpire` ou `doitChangerMdp` — sécurité : pas de
  contournement du `PasswordExpiredGuard` backend), footer texte
  adapté (« recommandé » vs « obligatoire »).
- **Lot 6.7.2 — Tooltips délégation (Z1 + Z2)** :
  - Install `shadcn/ui Tooltip` (`src/components/ui/tooltip.tsx`)
    + dépendance `@radix-ui/react-tooltip`
  - `<TooltipProvider delayDuration={200}>` racine dans `App.tsx`
  - Helper test `src/test/test-utils.tsx` avec `delayDuration={0}`
    pour tests déterministes
  - Constante `PERMISSION_DELEGABLE_DESCRIPTIONS` (Z1) — 4
    descriptions FR avec « Action irréversible » sur PUBLICATION,
    consommée par `AdminDelegationsPage`, `MesDelegationsPage`,
    `CreerDelegationDialog`
  - `GererRolesSection` (Z2) enrichi par mapping `fkRole →
    description` depuis `listRoles()`. Wrapping conditionnel : pas
    de Tooltip si description null/vide (fallback rôle legacy).
- **Lot 6.7.3 — Découvrabilité édition reforecast** :
  - Bouton renommé `"Éditer ce reforecast"` (au lieu de « Éditer
    dans la saisie budgétaire ») dans `ReforecastGrille`
  - `<Tooltip>` explicatif au survol du bouton
  - Bandeau bleu informatif sur `SaisieBudgetairePage` quand
    `versionComplete?.typeVersion === 'reforecast'` : « Vous
    éditez un reforecast T{trim} {annee}. Les modifications sont
    sauvegardées en place. » (caché pour versions budget classiques)

#### Refactor

- **Mini-fix drift `TypeVersion`** (Lot 6.7.3) : étendu côté
  frontend avec `'reforecast'` (le backend `DimVersion` l'a depuis
  Lot 5.3 mais le frontend ne l'avait jamais aligné — bug
  silencieux probable dans `VersionsPage` et `VersionFormDrawer`,
  tracé pour Lot 7+). Interface `Version` enrichie de
  `trimestreConsolide?`, `anneeConsolide?`,
  `methodeExtrapolation?`, `statutPublication?`.
- 3 mocks `vi.mock('@/lib/api/delegations')` (AdminDelegationsPage,
  MesDelegationsPage, CreerDelegationDialog) synchronisés avec
  `PERMISSION_DELEGABLE_DESCRIPTIONS`.
- 1 mock `vi.mock('@/lib/auth/auth-store')` synchronisé avec
  `useMdpExpireProchainement` (dans `AuthLayout.test.tsx`).

#### Dépendances

- **Production** : `@radix-ui/react-tooltip` (primitive Tooltip)
- **Dev** : `@testing-library/user-event` (hover déclenche
  correctement Radix Tooltip en JSDOM, `fireEvent.pointerEnter`
  insuffisant)

#### Tests

- 18 tests Vitest régression cumulés :
  - 9 sous Lot 6.7.1 (3 BandeauMdpExpire + 6 ForceChangePasswordPage)
  - 7 sous Lot 6.7.2 (3 GererRolesSection Z2 + 4 Z1 répartis sur
    AdminDelegationsPage / MesDelegationsPage / CreerDelegationDialog)
  - 2 sous Lot 6.7.3 (bandeau reforecast visible / caché) + 1
    test enrichi sur le renommage bouton

#### Cleanup annexe

- Lot 6.7.1 a retiré 1 `eslint-disable` inutile dans
  `src/types/jsx.d.ts:17` (la règle `@typescript-eslint/no-namespace`
  ne s'applique pas dans les fichiers `.d.ts` avec `declare global`).

#### Dette tracée pour Lot 7+

- Refactor `SaisiePanel` factorisé budget + reforecast (~3-4h) :
  permet la vraie édition inline reforecast sans duplication.
- Bug latent Origine REALISE/MANUEL mensongère après édition
  manuelle dans reforecast (badge persiste à tort).
- Investigation badges/libellés génériques pour les reforecasts
  dans `VersionsPage` et `VersionFormDrawer` (potentiel bug drift
  `TypeVersion`, corrigé en passant en Lot 6.7.3).

### Lot 6.6 — Nettoyage codebase — frontend (mai 2026)

Objectif : atteindre 0 problems ESLint + 0 erreurs tsc strict
frontend pour activer ces checks en Required CI.

Documentation complète : voir `docs/lot-6/6.6-nettoyage-codebase.md`
côté backend (le Lot 6.6 est traité de manière cross-repo).

#### Métriques

- ESLint frontend : **96 → 0 problems** (−100 %)
- tsc strict frontend : **63 → 0 erreurs**
- `npm run build` (`tsc -b && vite build`) : VERT (cassé sur main
  avant le lot, 5 TS préexistantes)
- Vitest : **561 verts** (inchangé)

#### Ajouté

- Shim JSX global `src/types/jsx.d.ts` qui ré-expose `JSX` comme
  alias de `React.JSX`. React 19 a déprécié le namespace global
  JSX ; le code existant utilise extensively `JSX.Element` comme
  type de retour des composants (pattern React 18) dans 59
  occurrences. Solution non invasive : 1 fichier ajouté, 0 modif
  du code existant.
- Configuration ESLint `no-unused-vars` avec `argsIgnorePattern: '^_'` /
  `varsIgnorePattern: '^_'` (convention `_var`, cohérent backend).

#### Refactor

- Sync mock `Version` dans `VersionsPage.test.tsx` avec les 10
  champs workflow Lot 3.5 (`commentaireSoumission`,
  `commentaireValidation`, `commentaireRejet`,
  `commentairePublication`, `dateSoumission`, etc.).
- Types explicites `args: unknown[]` + `m: string` sur callbacks
  dans `redirect-pattern.test.tsx`.
- Retrait de variables/imports inutilisés (`ClipboardList`,
  `mockAttribuer`, `mockSaveGrille`, `attribuerRoleUser`,
  `saveGrilleSaisie`, `selectionnerCr`, paramètre `size` dans
  `makeFile`).
- 2 regex `irregular whitespace` simplifiés en `/\s/g` (la classe
  ECMAScript `\s` inclut déjà U+00A0 nbsp).
- `let cmp = 0` remplacé par `let cmp: number` dans `EcartsTable.tsx`
  (les 2 branches if/else affectent immédiatement,
  initialisation à 0 inutile).

#### Désactivations globales avec rationale

- `react-hooks/set-state-in-effect` désactivée projet-wide. Règle
  React 19 v5+ qui détecte les cascading renders (performance
  suboptimale, pas bug fonctionnel). 68 occurrences sur Dialog,
  Combobox, Drawer idiomatiques React 18. Refactor data-layer
  (Suspense + `use()` ou react-query) tracé pour Lot 7+
  modernisation UI. `react-hooks/exhaustive-deps` reste actif
  (vrais bugs deps React).

#### Désactivations locales avec rationale

- Pattern shadcn/ui : variants + composants forwardRef
  co-exportés dans `components/ui/{button,dialog,dropdown-menu,select}.tsx`.
  Disable `react-refresh/only-export-components` file-level.
- 6 `useEffect` avec patterns intentionnels (mount-only fetch,
  refresh closure, caches refetch ciblé) : disable
  `react-hooks/exhaustive-deps` ligne par ligne avec rationale.
- `@tanstack/react-table` non React Compiler compatible
  (`DataTable.tsx`) : disable `react-hooks/incompatible-library`
  avec dette tracée Lot 7+.

#### Dette tracée pour Lot 7+

- Refactor Pattern 1 hydratation (~30 cas) : `useEffect(() => setX(props.X), [props])`
  → `<Component key={props.id} />` + `useState(() => initFromProps)`
- Refactor Pattern 2 fetch+loading (~35 cas) :
  `useEffect(() => { setLoading(true); fetch(...) }, [])` →
  Suspense + `use(promise)` ou react-query
- Migration `JSX.Element` → `React.ReactElement` (59 occurrences,
  shim global à retirer)
- Optimisation chunks > 500 kB (warning vite build,
  code-splitting + lazy routes)

#### Action post-merge

Activer en branch protection main frontend :
- Required check : `ESLint frontend`
- Required check : `tsc strict frontend`

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
