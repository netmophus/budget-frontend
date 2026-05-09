# CI/CD Frontend MIZNAS — Lot 6.1

> Statut : **livré** (mai 2026, branche `lot-6/6.1-ci`).
>
> La doc CI/CD complète (architecture, conventions, dette,
> branch protection rules) vit côté backend :
> [`budget-backend/docs/ci-cd.md`](https://github.com/netmophus/budget-backend/blob/main/docs/ci-cd.md).
> Ce fichier ne reprend que les spécificités frontend.

## 1. Workflow

`.github/workflows/ci.yml` exécute en parallèle :

```
setup (npm ci)
  ├── lint       (npm run lint  → eslint .)
  ├── typecheck  (npx tsc -b --noEmit)
  ├── build      (npx vite build)
  └── test       (npm test = vitest run)
```

Triggers : `pull_request` ciblant `main`, `push` sur `main`.

## 2. Lancer les checks en local

```bash
cd budjet-frontend
npx tsc -b --noEmit   # typecheck strict
npx vite build        # build production
npm run lint          # ESLint
npm test              # Vitest
```

## 3. Dette typecheck héritée (Lot 6.6)

Au premier run, `typecheck` échoue avec **~67 erreurs sur ~49
fichiers**, principalement :

1. **`Cannot find namespace 'JSX'`** (TS2503, ~57 fichiers).
   Cause : depuis React 19 + `@types/react@^19`, le namespace
   global `JSX` est masqué. Fix prévu Lot 6.6 : codemod global
   `JSX.Element → React.JSX.Element`.

2. **Mocks de tests obsolètes** (TS2740 + TS6133, 2 fichiers).
   - `src/pages/VersionsPage.test.tsx` : mocks `Version`
     incomplets depuis l'extension workflow Lot 3.5.
   - `src/pages/SaisieBudgetairePage.test.tsx` :
     `mockSaveGrille` déclaré mais inutilisé.

Tant que cette dette n'est pas apurée, **NE PAS activer
`typecheck` comme statut bloquant** dans les branch protection
rules — toute PR serait bloquée.

## 4. Spécificités vs backend

- Pas de job `audit-codes-coherence` (les codes audit sont
  côté backend uniquement).
- Le script `npm run build` du `package.json` contient déjà
  `tsc -b && vite build`. Le job `build` du workflow appelle
  `vite build` directement pour avoir un signal séparé du job
  `typecheck`.

Tout le reste (concurrency, branch protection, lancement
local) suit la doc backend.

## 5. Tests E2E Playwright (Lot 6.2.B)

Couche supplémentaire de smoke tests dans Chromium réel pour
détecter les régressions de parcours utilisateur (ex: bug
Lot 5.2-fix2 — "0" trompeur à la place de "—" dans les KPI
cards) que Vitest en jsdom ne peut pas attraper.

### Lancer en local

Pré-requis :

1. Backend NestJS démarré sur `:3001` avec base BSIC seedée
   (admin + lecteur + 6 personas BSIC).
2. Chromium installé une fois : `npx playwright install chromium`.

```bash
npm run test:e2e:playwright
```

Vite est démarré automatiquement par Playwright via
`webServer` (cf. `playwright.config.ts`). Si `npm run dev` est
déjà en cours, Playwright le réutilise.

Voir `tests/playwright/README.md` pour le détail des comptes
de test, la couverture et les décisions de design.

### CI (reportée au Lot 6.8)

Le job CI Playwright est **volontairement reporté au Lot 6.8**.
Raison : orchestrer testcontainer Postgres + backend NestJS +
Vite preview + Chromium dans un même job CI = ~1 jour de tuning
anti-flake pour une valeur faible en V1. Les smoke tests
restent jouables localement, et le filet de sécurité backend
(29 e2e SuperTest) est lui actif en CI depuis le Lot 6.2.A.

### Couverture (5 smoke tests)

| Fichier                              | Persona              | Couverture                               |
| ------------------------------------ | -------------------- | ---------------------------------------- |
| `01-login-navigation.spec.ts`        | admin / lecteur      | Login + sidebar + RBAC                   |
| `02-saisie-realise.spec.ts`          | adj.retail           | Page Saisie + dialog "Nouvelle ligne"    |
| `03-tableau-bord.spec.ts`            | controleur.gestion   | Filtres + KPI cards (régression 5.2-fix2) |
| `04-lancement-reforecast.spec.ts`    | controleur.gestion   | Bouton Lancer + dialog ouvert            |
| `05-workflow-budget.spec.ts`         | dir.retail           | Pages /budget/* sans crash               |

Total : 7 tests Playwright concrets (SMOKE.1 contient 3 cas).
Temps d'exécution local : ~10s (après ~1s de démarrage Vite).

