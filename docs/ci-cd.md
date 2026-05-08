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
