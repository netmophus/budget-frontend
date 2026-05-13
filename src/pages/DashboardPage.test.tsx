import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EffectivePermission } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/auth-store';
import { DashboardPage } from './DashboardPage';

function buildPermissions(codes: string[]): EffectivePermission[] {
  return codes.map((c) => ({
    code_permission: c,
    module: c.split('.')[0] ?? 'UNKNOWN',
    perimetre_type: 'global',
    perimetre_id: null,
  }));
}

function setPermissions(codes: string[]) {
  useAuthStore.setState({
    user: {
      id: '1',
      email: 'test@miznas.local',
      prenom: 'Test',
      nom: 'User',
    },
    permissions: buildPermissions(codes),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });
  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('utilisateur avec toutes les permissions voit les 9 cartes', () => {
    setPermissions([
      'BUDGET.SAISIR',
      'BUDGET.VALIDER',
      'BUDGET.PUBLIER',
      'BUDGET.LIRE',
      'REALISE.LIRE',
      'DELEGATION.LIRE',
      'CONFIGURATION.LIRE',
      'USER.GERER',
      'AUDIT.LIRE',
    ]);
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Élaborer un budget' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Valider / Publier' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Suivre le réalisé' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Analyser les écarts' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Reprévoir (reforecast)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Mes délégations' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Référentiels' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Administration' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
  });

  it('SAISISSEUR ne voit ni Valider/Publier, ni Administration, ni Audit', () => {
    setPermissions([
      'BUDGET.SAISIR',
      'BUDGET.LIRE',
      'REALISE.LIRE',
      'DELEGATION.LIRE',
      'CONFIGURATION.LIRE',
    ]);
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Élaborer un budget' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Valider / Publier' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Administration' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Audit' }),
    ).not.toBeInTheDocument();
  });

  it('AUDITEUR (lecture seule) voit Analyser, Référentiels et Audit mais pas Élaborer', () => {
    setPermissions([
      'BUDGET.LIRE',
      'REALISE.LIRE',
      'DELEGATION.LIRE',
      'CONFIGURATION.LIRE',
      'AUDIT.LIRE',
    ]);
    renderPage();

    expect(
      screen.queryByRole('heading', { name: 'Élaborer un budget' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Analyser les écarts' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Référentiels' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audit' })).toBeInTheDocument();
  });

  it("affiche le nom de l'utilisateur dans l'en-tête", () => {
    setPermissions(['AUDIT.LIRE']);
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Bienvenue, Test User/,
    );
  });
});
