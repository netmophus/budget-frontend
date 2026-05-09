# Smoke tests Playwright — MIZNAS frontend

Couche de tests end-to-end navigateur (Chromium) pour valider les
parcours critiques utilisateur. Lot 6.2.B.

## Pré-requis (lancement local)

1. **Backend NestJS** démarré sur `:3001` :
   ```bash
   cd ../budjet-backend
   npm run start:dev
   ```
2. **Base PostgreSQL** seedée :
   ```bash
   # depuis le repo backend
   npm run migration:run
   npm run seed:auth        # admin + lecteur
   npm run seed:temps       # calendrier
   npm run seed:devises
   npm run seed:structures
   npm run seed:cr
   npm run seed:comptes
   npm run seed:lignes-metier
   npm run seed:produits
   npm run seed:segments
   npm run seed:versions
   npm run seed:scenarios
   ```
   Les 6 personas BSIC (`adj.retail`, `dir.retail`, `dir.corporate`,
   `controleur.gestion`, `auditeur`, `dga.exploitation`) sont créés
   automatiquement par les migrations TypeORM (mot de passe commun :
   `MiznasTest!2026`).

3. **Chromium Playwright** installé une fois :
   ```bash
   npx playwright install chromium
   ```

4. Le **frontend Vite** est lancé automatiquement par Playwright via
   `webServer` (configuré dans `playwright.config.ts`). Si tu as déjà
   `npm run dev` en cours, Playwright le réutilise.

## Lancer les tests

```bash
# Headless (par défaut)
npm run test:e2e:playwright

# Avec UI Playwright pour debug
npx playwright test --ui

# Un seul fichier
npx playwright test tests/playwright/01-login-navigation.spec.ts
```

## Comptes de test

| Alias              | Email                              | Mot de passe        |
| ------------------ | ---------------------------------- | ------------------- |
| admin              | admin@miznas.local                 | `ChangeMe!2026`     |
| lecteur            | lecteur@miznas.local               | `Lecteur!2026`      |
| adj.retail         | adj.retail@miznas.local            | `MiznasTest!2026`   |
| dir.retail         | dir.retail@miznas.local            | `MiznasTest!2026`   |
| controleur.gestion | controleur.gestion@miznas.local    | `MiznasTest!2026`   |
| dga.exploitation   | dga.exploitation@miznas.local      | `MiznasTest!2026`   |
| auditeur           | auditeur@miznas.local              | `MiznasTest!2026`   |

Ces alias sont exposés via le helper `loginPersona(page, alias)` dans
`helpers/login.helper.ts`.

## Couverture (5 smoke tests)

- **01-login-navigation** — login admin / lecteur + erreur mdp + RBAC
  sidebar
- **02-saisie-realise** — adj.retail saisit une ligne réalisé (Mars
  2026 ; CR_AG_ABJ_PLATEAU au lieu de Bandabari : décalage seed)
- **03-tableau-bord** — controleur.gestion charge le tableau de bord
  (régression Lot 5.2-fix2 : KPI cards remplies, pas de "—" trompeur)
- **04-lancement-reforecast** — controleur.gestion lance un reforecast
  via le dialogue
- **05-workflow-budget** — dir.retail vérifie qu'aucune page validation
  ne crashe (smoke léger)

## Configuration

- `workers: 1` (sérialisé) — anti-flake car certains tests partagent la
  base et créent des données (SMOKE.4 reforecast).
- `retries: 2` en CI / `0` en local.
- `screenshot: only-on-failure`, `video: retain-on-failure`,
  `trace: on-first-retry` — facilite le debug des flakes éventuels.

## Décisions Lot 6.2.B

- **CI** : reportée au Lot 6.8. Orchestrer testcontainer Postgres +
  backend NestJS + Vite preview + Playwright dans un même job CI = ~1
  jour de tuning anti-flake pour une valeur faible en V1. Les smoke
  tests restent jouables localement.
- **Bandabari → CR_AG_ABJ_PLATEAU** : le seed BSIC ne contient pas
  Bandabari, on utilise le 1er CR retail (Plateau).
- **Versions/scénarios 2027** : les seeds créent BUDGET_INITIAL_2026
  + scenarios CENTRAL/ALTERNATIF_HAUT/ALTERNATIF_BAS. Les tests ciblent
  ces valeurs (pas BUDGET_INITIAL_2027 du mandat).
