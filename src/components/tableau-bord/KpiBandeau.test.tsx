/**
 * Tests régression KpiBandeau (Lot 7.2 commit 4).
 *
 * Couvre :
 *  - 5 personas × visibilité conditionnelle des 3 cartes selon
 *    permissions (BUDGET.LIRE pour PNB/Coef, BUDGET.VALIDER OR
 *    BUDGET.PUBLIER pour Versions à valider).
 *  - État vide quand l'endpoint /home renvoie defauts:null +
 *    indicateurs:null (cas "aucune version éligible" : la bande
 *    doit afficher proprement sans crash).
 *
 * `getIndicateursHome` et `listVersions` sont mockés via `vi.mock` ;
 * le store d'auth est manipulé directement via `setState`.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/indicateurs', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/indicateurs')>(
      '@/lib/api/indicateurs',
    );
  return {
    ...actual,
    getIndicateursHome: vi.fn(),
  };
});

vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn(),
}));

import {
  getIndicateursHome,
  type IndicateursHome,
} from '@/lib/api/indicateurs';
import type { EffectivePermission } from '@/lib/api/types';
import { listVersions } from '@/lib/api/versions';
import { useAuthStore } from '@/lib/auth/auth-store';

import { KpiBandeau } from './KpiBandeau';

const mockGetHome = vi.mocked(getIndicateursHome);
const mockListVersions = vi.mocked(listVersions);

const HOME_OK: IndicateursHome = {
  defauts: {
    versionId: '101',
    codeVersion: 'BI_2027',
    libelleVersion: 'Budget initial 2027',
    scenarioId: '7',
    codeScenario: 'MEDIAN_2027',
    libelleScenario: 'Médian 2027',
    exerciceFiscal: 2027,
  },
  indicateurs: {
    pnb: 1234567890,
    mni: 567890123,
    coefExploitation: 65.3,
    chargesHorsInterets: 800000000,
    totalProduits: 2000000000,
    totalCharges: 1432110000,
    nbCrInclus: 12,
    derniereMaj: '2026-05-13T08:00:00.000Z',
  },
};

const HOME_EMPTY: IndicateursHome = { defauts: null, indicateurs: null };

function buildPermissions(codes: string[]): EffectivePermission[] {
  return codes.map((c) => ({
    code_permission: c,
    module: c.split('.')[0] ?? 'UNKNOWN',
    perimetre_type: 'global',
    perimetre_id: null,
  }));
}

function setPermissions(codes: string[]): void {
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

function renderBandeau() {
  return render(
    <MemoryRouter>
      <KpiBandeau />
    </MemoryRouter>,
  );
}

describe('KpiBandeau (Lot 7.2)', () => {
  beforeEach(() => {
    mockGetHome.mockResolvedValue(HOME_OK);
    mockListVersions.mockResolvedValue({
      total: 3,
      items: [],
      page: 1,
      limit: 1,
    });
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
  });

  // ─── PNB + Coefficient (BUDGET.LIRE requis pour la bande) ─────────
  describe('PNB + Coefficient (BUDGET.LIRE)', () => {
    it('ADMIN (toutes permissions) voit PNB et Coef avec valeurs réelles', async () => {
      setPermissions([
        'BUDGET.LIRE',
        'BUDGET.SAISIR',
        'BUDGET.VALIDER',
        'BUDGET.PUBLIER',
        'AUDIT.LIRE',
      ]);
      renderBandeau();

      const pnb = await screen.findByTestId('kpi-pnb-valeur');
      // Le séparateur de milliers fr-FR peut varier selon le runtime
      // (espace fine vs espace normal) — on vérifie la séquence de chiffres
      // et le suffixe FCFA plutôt qu'un format strict.
      expect(pnb.textContent).toMatch(/1.*234.*567.*890/);
      expect(pnb.textContent).toContain('FCFA');

      expect(screen.getByTestId('kpi-coef-valeur').textContent).toBe(
        '65,3 %',
      );
    });

    it('SAISISSEUR (BUDGET.SAISIR + BUDGET.LIRE) voit PNB et Coef', async () => {
      setPermissions(['BUDGET.SAISIR', 'BUDGET.LIRE']);
      renderBandeau();

      await screen.findByTestId('kpi-pnb');
      expect(screen.getByTestId('kpi-coef')).toBeInTheDocument();
    });

    it('AUDITEUR (BUDGET.LIRE + AUDIT.LIRE) voit PNB et Coef', async () => {
      setPermissions(['BUDGET.LIRE', 'AUDIT.LIRE']);
      renderBandeau();

      await screen.findByTestId('kpi-pnb');
      expect(screen.getByTestId('kpi-coef')).toBeInTheDocument();
    });

    it('Sans BUDGET.LIRE → toute la bande est masquée (Can racine)', async () => {
      setPermissions(['AUDIT.LIRE']);
      renderBandeau();

      // La bande ne se monte pas — l'appel API ne doit jamais avoir
      // lieu (vérification déterministe au lieu de waitFor).
      expect(screen.queryByTestId('kpi-bandeau')).not.toBeInTheDocument();
      expect(mockGetHome).not.toHaveBeenCalled();
    });
  });

  // ─── Versions à valider (BUDGET.VALIDER OR BUDGET.PUBLIER) ────────
  describe('Versions à valider (BUDGET.VALIDER OR BUDGET.PUBLIER, any)', () => {
    it('VALIDATEUR (BUDGET.LIRE + BUDGET.VALIDER) voit la card', async () => {
      setPermissions(['BUDGET.LIRE', 'BUDGET.VALIDER']);
      renderBandeau();

      await screen.findByTestId('kpi-versions-a-valider');
      // Compteur = total renvoyé par listVersions ({statut: 'soumis', limit: 1})
      await waitFor(() => {
        expect(
          screen.getByTestId('kpi-versions-valeur').textContent,
        ).toBe('3');
      });
      expect(mockListVersions).toHaveBeenCalledWith({
        statut: 'soumis',
        limit: 1,
      });
    });

    it('PUBLICATEUR (BUDGET.LIRE + BUDGET.PUBLIER) voit la card', async () => {
      setPermissions(['BUDGET.LIRE', 'BUDGET.PUBLIER']);
      renderBandeau();

      await screen.findByTestId('kpi-versions-a-valider');
    });

    it('SAISISSEUR NE voit PAS la card Versions à valider', async () => {
      setPermissions(['BUDGET.SAISIR', 'BUDGET.LIRE']);
      renderBandeau();

      await screen.findByTestId('kpi-pnb');
      expect(
        screen.queryByTestId('kpi-versions-a-valider'),
      ).not.toBeInTheDocument();
      // listVersions ne doit JAMAIS être appelé (composant non monté).
      expect(mockListVersions).not.toHaveBeenCalled();
    });

    it('AUDITEUR NE voit PAS la card Versions à valider', async () => {
      setPermissions(['BUDGET.LIRE', 'AUDIT.LIRE']);
      renderBandeau();

      await screen.findByTestId('kpi-pnb');
      expect(
        screen.queryByTestId('kpi-versions-a-valider'),
      ).not.toBeInTheDocument();
    });

    it('LECTEUR (BUDGET.LIRE seul) NE voit PAS la card Versions à valider', async () => {
      setPermissions(['BUDGET.LIRE']);
      renderBandeau();

      await screen.findByTestId('kpi-pnb');
      expect(
        screen.queryByTestId('kpi-versions-a-valider'),
      ).not.toBeInTheDocument();
    });
  });

  // ─── État vide (cascade gele/valide/soumis vide côté backend) ─────
  describe('État vide (endpoint /home retourne defauts:null)', () => {
    it("PNB et Coef affichent '—' + sous-libellé 'Aucune version éligible' sans crash", async () => {
      mockGetHome.mockResolvedValue(HOME_EMPTY);
      setPermissions(['BUDGET.LIRE']);
      renderBandeau();

      const pnb = await screen.findByTestId('kpi-pnb-valeur');
      expect(pnb.textContent).toContain('—');
      // Pas de suffixe "FCFA" quand la valeur est "—" (cf. KpiPnb).
      expect(pnb.textContent).not.toContain('FCFA');

      expect(screen.getByTestId('kpi-coef-valeur').textContent).toBe('—');

      // Sous-libellé "Aucune version éligible" affiché sous PNB et Coef.
      expect(
        screen.getAllByText(/Aucune version éligible/i).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });
});
