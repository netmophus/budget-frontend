# Changelog — MIZNAS frontend

Au format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

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
