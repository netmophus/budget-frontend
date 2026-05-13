/**
 * Tests Vitest AuthLayout — UX A.4 sidebar scrollable + groupes
 * collapsibles persistantes + filtrage permission par persona
 * (Lot 7.1).
 *
 * Le mock global `vi.mock('@/lib/auth/permissions')` qui rendait
 * tout visible a été retiré (anomalie 4 diagnostic Lot 7.1) :
 * on injecte désormais les permissions du persona directement
 * dans le store Zustand via `useAuthStore.setState`, et on laisse
 * `useHasPermission` lire la vraie valeur — discipline
 * feedback_vitest_mocks_cachent_bugs_runtime.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { EffectivePermission } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/auth-store';
import { AuthLayout } from './AuthLayout';

const SIDEBAR_KEY = 'sidebar-group-states-v1';

function buildPermissions(codes: string[]): EffectivePermission[] {
  return codes.map((c) => ({
    code_permission: c,
    module: c.split('.')[0] ?? 'UNKNOWN',
    perimetre_type: 'global',
    perimetre_id: null,
  }));
}

function setupPersona(codes: string[], persona = 'Test User') {
  const [prenom, ...rest] = persona.split(' ');
  useAuthStore.setState({
    user: {
      id: '1',
      email: 'test@miznas.local',
      prenom: prenom ?? 'Test',
      nom: rest.join(' ') || 'User',
    },
    permissions: buildPermissions(codes),
    roles: ['TEST'],
    accessToken: 'tok',
    refreshToken: 'ref',
  });
}

function renderLayout() {
  return render(
    <MemoryRouter>
      <AuthLayout />
    </MemoryRouter>,
  );
}

// Permissions de référence vérifiées contre les migrations source
// (1779200000110-CreerRolesMetier + 1779200000150-CreerFaitRealise
// + 1779200000120-CreerTableDelegations + src/seeds/auth-seed.ts).
const PERMS_ADMIN = [
  'USER.LIRE',
  'USER.GERER',
  'ROLE.LIRE',
  'AUDIT.LIRE',
  'REFERENTIEL.LIRE',
  'REFERENTIEL.GERER',
  'BUDGET.LIRE',
  'BUDGET.SAISIR',
  'BUDGET.SOUMETTRE',
  'BUDGET.VALIDER',
  'BUDGET.PUBLIER',
  'CONFIGURATION.LIRE',
  'CONFIGURATION.GERER',
  'REALISE.LIRE',
  'REALISE.SAISIR',
  'REALISE.IMPORTER',
  'REALISE.VALIDER',
  'REALISE.SUPPRIMER',
  'DELEGATION.LIRE',
  'DELEGATION.GERER',
];

const PERMS_SAISISSEUR = [
  'BUDGET.LIRE',
  'BUDGET.SAISIR',
  'BUDGET.SOUMETTRE',
  'REFERENTIEL.LIRE',
  'CONFIGURATION.LIRE',
  'REALISE.LIRE',
  'REALISE.SAISIR',
  'REALISE.IMPORTER',
];

const PERMS_VALIDATEUR = [
  'BUDGET.LIRE',
  'BUDGET.VALIDER',
  'REFERENTIEL.LIRE',
  'CONFIGURATION.LIRE',
  'USER.LIRE',
  'AUDIT.LIRE',
  'REALISE.LIRE',
  'REALISE.VALIDER',
  'REALISE.SUPPRIMER',
];

const PERMS_AUDITEUR = [
  'AUDIT.LIRE',
  'BUDGET.LIRE',
  'REFERENTIEL.LIRE',
  'CONFIGURATION.LIRE',
  'USER.LIRE',
  'ROLE.LIRE',
  'REALISE.LIRE',
];

const PERMS_LECTEUR = [
  // Toutes les permissions *.LIRE (cf. auth-seed.ts:217 — ROLES.LECTEUR
  // = PERMISSIONS.filter(p => p.code.endsWith('.LIRE')))
  'USER.LIRE',
  'ROLE.LIRE',
  'AUDIT.LIRE',
  'REFERENTIEL.LIRE',
  'BUDGET.LIRE',
  'CONFIGURATION.LIRE',
  'DELEGATION.LIRE',
  'REALISE.LIRE',
];

describe('AuthLayout — UX A.4 sidebar collapsible', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.getState().clearSession();
    setupPersona(PERMS_ADMIN, 'Admin Test');
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  it('affiche les 5 groupes (Référentiels / Budget / Exécution / Configuration / Administration)', () => {
    renderLayout();
    expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
  });

  it('par défaut tous les groupes sont déployés (aria-expanded=true)', () => {
    renderLayout();
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it("clic sur le titre d'un groupe → toggle aria-expanded + persiste localStorage", () => {
    renderLayout();
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const raw = window.localStorage.getItem(SIDEBAR_KEY);
    expect(raw).not.toBeNull();
    const state = JSON.parse(raw!) as Record<string, boolean>;
    expect(state.budget).toBe(false);
  });

  it("hydrate l'état initial depuis localStorage (budget fermé)", () => {
    window.localStorage.setItem(
      SIDEBAR_KEY,
      JSON.stringify({ budget: false }),
    );
    renderLayout();
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it("aside a la classe 'overflow-y-auto' (scroll vertical)", () => {
    const { container } = renderLayout();
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside!.className).toMatch(/overflow-y-auto/);
  });
});

describe('AuthLayout — filtrage permission par persona (Lot 7.1)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.getState().clearSession();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  describe('ADMIN (toutes permissions)', () => {
    beforeEach(() => setupPersona(PERMS_ADMIN, 'Admin Test'));

    it('voit les 5 groupes', () => {
      renderLayout();
      expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
    });

    it('voit les items workflow et admin sensibles', () => {
      renderLayout();
      expect(screen.getByText('À valider')).toBeInTheDocument();
      expect(screen.getByText('Saisie budgétaire')).toBeInTheDocument();
      expect(screen.getByText('Saisie réalisé')).toBeInTheDocument();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText('Affectations')).toBeInTheDocument();
      expect(screen.getByText("Journal d'audit")).toBeInTheDocument();
      // Note : on ne teste pas getByText('Configuration') ici car
      // ce texte apparaît 2 fois (label du groupe + item) — la
      // visibilité du groupe est déjà couverte par le test précédent
      // via nav-group-configuration.
    });
  });

  describe('SAISISSEUR (BUDGET.SAISIR + REALISE.SAISIR, pas de VALIDER ni admin)', () => {
    beforeEach(() => setupPersona(PERMS_SAISISSEUR, 'Fatima Saisisseur'));

    it('voit Référentiels + Budget + Exécution + Configuration', () => {
      renderLayout();
      expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
    });

    it("ne voit PAS le groupe Administration (anomalie 1 corrigée commit 1)", () => {
      renderLayout();
      expect(
        screen.queryByTestId('nav-group-administration'),
      ).not.toBeInTheDocument();
    });

    it("ne voit PAS l'item À valider (BUDGET.VALIDER absent)", () => {
      renderLayout();
      expect(screen.queryByText('À valider')).not.toBeInTheDocument();
    });

    it('voit Saisie budgétaire et Saisie réalisé', () => {
      renderLayout();
      expect(screen.getByText('Saisie budgétaire')).toBeInTheDocument();
      expect(screen.getByText('Saisie réalisé')).toBeInTheDocument();
    });
  });

  describe('VALIDATEUR (BUDGET.VALIDER + REALISE.VALIDER + USER.LIRE + AUDIT.LIRE)', () => {
    beforeEach(() => setupPersona(PERMS_VALIDATEUR, 'Aicha Validateur'));

    it('voit les 5 groupes (Administration partiel)', () => {
      renderLayout();
      expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
    });

    it("voit l'item À valider (BUDGET.VALIDER présent)", () => {
      renderLayout();
      expect(screen.getByText('À valider')).toBeInTheDocument();
    });

    it("dans Administration : Utilisateurs + Journal d'audit visibles, autres cachés", () => {
      renderLayout();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText("Journal d'audit")).toBeInTheDocument();
      expect(screen.queryByText('Affectations')).not.toBeInTheDocument();
      expect(screen.queryByText('Délégations')).not.toBeInTheDocument();
      expect(screen.queryByText('Journal des emails')).not.toBeInTheDocument();
    });
  });

  describe('AUDITEUR (lecture seule transverse, sans VALIDER ni GERER)', () => {
    beforeEach(() => setupPersona(PERMS_AUDITEUR, 'Moussa Auditeur'));

    it('voit les 5 groupes (Administration partiel)', () => {
      renderLayout();
      expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
    });

    it("ne voit PAS l'item À valider (BUDGET.VALIDER absent)", () => {
      renderLayout();
      expect(screen.queryByText('À valider')).not.toBeInTheDocument();
    });

    it("dans Administration : Utilisateurs + Journal d'audit uniquement", () => {
      renderLayout();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText("Journal d'audit")).toBeInTheDocument();
      expect(screen.queryByText('Affectations')).not.toBeInTheDocument();
      expect(screen.queryByText('Délégations')).not.toBeInTheDocument();
    });
  });

  describe('LECTEUR (toutes permissions *.LIRE)', () => {
    beforeEach(() => setupPersona(PERMS_LECTEUR, 'Lecteur Test'));

    it('voit Référentiels + Budget + Exécution + Configuration + Administration partiel', () => {
      renderLayout();
      expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-execution')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
    });

    it("ne voit PAS l'item À valider (BUDGET.VALIDER absent)", () => {
      renderLayout();
      expect(screen.queryByText('À valider')).not.toBeInTheDocument();
    });

    it("dans Administration : Utilisateurs + Journal d'audit uniquement", () => {
      renderLayout();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText("Journal d'audit")).toBeInTheDocument();
      expect(screen.queryByText('Affectations')).not.toBeInTheDocument();
      expect(screen.queryByText('Délégations')).not.toBeInTheDocument();
      expect(screen.queryByText('Journal des emails')).not.toBeInTheDocument();
    });
  });
});
