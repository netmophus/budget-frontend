# MIZNAS — Frontend

> La documentation projet (architecture, modèle de données,
> conventions, etc.) est versionnée dans le dépôt
> [budget-backend](https://github.com/netmophus/budget-backend)
> sous `docs/`. Ce projet n'embarque que sa propre documentation
> technique React/Vite ci-dessous.

Application web du **Module Budgétaire Bancaire UEMOA** (MIZNAS).

## Stack

- React 19 + Vite 7 + TypeScript 5 (strict)
- Tailwind CSS v4 + shadcn-style UI primitives + Radix UI
- Zustand (store auth) + axios (client HTTP avec refresh token rotation)
- React Router v7 (routes protégées + permissions)
- TanStack Table v8 (DataTable serveur-paginée)
- React Hook Form + Zod (validation des formulaires)
- Vitest + Testing Library (tests unitaires)
- Sonner (toasts)

## Installation et lancement

```bash
npm install
cp .env.example .env       # rien à modifier en dev local
npm run dev                # http://localhost:5173
```

Le backend doit tourner sur `http://localhost:3001/api/v1` (cf. dossier
`budjet-backend/`).

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3001/api/v1` | URL de base du backend NestJS |

## Comptes de test (créés par le seed backend)

| Email | Mot de passe | Rôle | Permissions |
|---|---|---|---|
| `admin@miznas.local` | `ChangeMe!2026` | ADMIN | Toutes (6) |
| `lecteur@miznas.local` | `Lecteur!2026` | LECTEUR | `USER.LIRE`, `ROLE.LIRE`, `AUDIT.LIRE` |

> Mots de passe à changer impérativement avant tout usage non-test
> (cf. `SEED_ADMIN_PASSWORD`, `SEED_LECTEUR_PASSWORD` côté backend).

## Scripts npm

| Script | Action |
|---|---|
| `npm run dev` | Serveur dev Vite (HMR, port 5173) |
| `npm run build` | Build production (TypeScript + Vite) |
| `npm run preview` | Servir le build local |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run lint` | Lint ESLint |

## Routes

| Chemin | Auth | Permission | Page |
|---|---|---|---|
| `/login` | publique | — | LoginPage |
| `/dashboard` | requise | — | DashboardPage |
| `/profile` | requise | — | ProfilePage |
| `/users` | requise | `USER.LIRE` | UsersPage |
| `/audit-logs` | requise | `AUDIT.LIRE` | AuditLogsPage |
| `/` | redirect | — | `/dashboard` ou `/login` |
| `*` | — | — | NotFoundPage (404) |
| Permission refusée | — | — | ForbiddenPage (403) |

## Notes de sécurité

- Le refresh token est actuellement persisté en `localStorage`
  (`miznas-auth`). **TODO Lot 6** : passage en cookie `httpOnly + Secure`
  côté backend, suppression de la persistance.
- Aucun affichage de `mot_de_passe_hash` (le backend ne le renvoie pas,
  les types TypeScript de réponse ne l'exposent pas).
- L'access token expire en 15 min (configurable). Le refresh est
  rotaté à chaque utilisation ; la réutilisation déclenche une
  révocation forcée de tous les refresh actifs (cf. backend).

## Structure

```
src/
├── components/
│   ├── ui/              ← primitives shadcn-style (button, card, table, …)
│   ├── common/          ← Can, DataTable, PageHeader, EmptyState
│   └── layout/          ← AuthLayout (header + sidebar)
├── lib/
│   ├── api/             ← client axios + modules typés (auth, users, …)
│   ├── auth/            ← store Zustand + helpers permissions
│   └── utils.ts         ← cn (clsx + tailwind-merge)
├── pages/               ← LoginPage, DashboardPage, ProfilePage, …
├── routes/              ← AppRoutes, ProtectedRoute, PermissionRoute
└── test/                ← setup Vitest
```

## Périmètre Lot 1

Couvre l'authentification, la navigation, et la consultation des
référentiels Lot 1 (utilisateurs, rôles, audit). Les **modules métier
budgétaires** (saisie, exécution, restitutions) arriveront aux
**Lots 2 → 5** (cf. `docs/roadmap-mvp.md`).
