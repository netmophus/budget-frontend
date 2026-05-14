/**
 * Tests DashboardCard (Lot 7.3 V6 — coloration par catégorie).
 *
 * Couvre :
 *  - Rendu basique : titre + description + lien correctement câblé
 *    + navigation cliquable
 *  - Mapping color → border-l-(--miznas-cat-X) + text-(--miznas-cat-X)
 *    (3 catégories suffisent pour valider le pattern, le reste suit
 *    la même mécanique mappée 1-pour-1 dans `COLOR_CLASSES`)
 *  - Bordure 3 px gauche permanente + fond blanc
 *  - Propagation de `className` additionnelle (delays d'animation)
 *  - Icône Lucide aria-hidden (purement décorative)
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Coins, FileEdit, Settings } from 'lucide-react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DashboardCard,
  type DashboardCardColor,
} from './DashboardCard';

describe('DashboardCard', () => {
  afterEach(() => cleanup());

  it('rend le titre, la description et l\'icône', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/cible"
          icon={FileEdit}
          title="Mon titre"
          description="Ma description"
          color="budget"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Mon titre' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ma description')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cible');
  });

  it('navigue vers le chemin to au clic', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardCard
                to="/cible"
                icon={FileEdit}
                title="Carte"
                description="Description"
                color="budget"
              />
            }
          />
          <Route path="/cible" element={<div>Page cible</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /Carte/i }));
    expect(screen.getByText('Page cible')).toBeInTheDocument();
  });

  it.each([
    ['budget', '--miznas-cat-budget'],
    ['validation', '--miznas-cat-validation'],
    ['config', '--miznas-cat-config'],
  ] as const)(
    'color=%s → border-l et icône portent le token catégorie',
    (color: DashboardCardColor, token: string) => {
      render(
        <MemoryRouter>
          <DashboardCard
            to="/x"
            icon={FileEdit}
            title="t"
            description="d"
            color={color}
          />
        </MemoryRouter>,
      );
      const link = screen.getByRole('link');
      expect(link.className).toContain(`border-l-(${token})`);
      const svg = link.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('class')).toContain(`text-(${token})`);
    },
  );

  it('rend toujours une bordure gauche 3 px et un fond blanc', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/x"
          icon={FileEdit}
          title="t"
          description="d"
          color="reporting"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('border-l-[3px]');
    expect(link.className).toContain('bg-white');
  });

  it('propage la className additionnelle (delays d\'animation par exemple)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/test"
          icon={Coins}
          title="Test"
          description="desc"
          color="reporting"
          className="animate-in fade-in delay-200"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('animate-in');
    expect(link.className).toContain('fade-in');
    expect(link.className).toContain('delay-200');
    // Les classes par défaut restent (cn ne les écrase pas).
    expect(link.className).toContain('rounded-md');
  });

  it('rend l\'icône Lucide avec aria-hidden (purement décorative)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/admin"
          icon={Settings}
          title="Admin"
          description="desc"
          color="config"
        />
      </MemoryRouter>,
    );
    const svg = screen.getByRole('link').querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
