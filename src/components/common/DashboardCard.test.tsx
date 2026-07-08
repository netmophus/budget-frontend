/**
 * Tests DashboardCard (Lot 7.3 V7 — variante C : fond pastel).
 *
 * Couvre :
 *  - Rendu basique : titre + description + lien correctement câblé
 *    + navigation cliquable
 *  - Mapping color → fond pastel (background-color avec ~6 % alpha)
 *    + icône colorée (svg style.color) + titre coloré (h3 style.color)
 *  - Cercle blanc 36 px autour de l'icône
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

  // V8 : chaque catégorie applique un DÉGRADÉ vibrant (inline style
  // backgroundImage: linear-gradient) débutant par une couleur hex
  // spécifique ; icône + titre en blanc.
  // JSDom sérialise les hex en rgb(...) dans le style inline.
  it.each([
    ['budget', /rgb\(59,\s*130,\s*246\)/],
    ['validation', /rgb\(16,\s*185,\s*129\)/],
    ['config', /rgb\(6,\s*182,\s*212\)/],
  ] as const)(
    'color=%s → dégradé vibrant (inline style) + texte blanc',
    (color: DashboardCardColor, rgbDebut: RegExp) => {
      render(
        <MemoryRouter>
          <DashboardCard
            to="/x"
            icon={FileEdit}
            title="Mon titre"
            description="d"
            color={color}
          />
        </MemoryRouter>,
      );
      const link = screen.getByRole('link');
      const style = (link.getAttribute('style') ?? '').toLowerCase();

      // Dégradé via style inline + couleur de départ de la catégorie.
      expect(style).toMatch(/linear-gradient/);
      expect(style).toMatch(rgbDebut);

      // data-color = valeur logique.
      expect(link.getAttribute('data-color')).toBe(color);

      // Icône + titre en blanc.
      const svg = link.querySelector('svg');
      expect(svg?.getAttribute('class')).toContain('text-white');
      const heading = screen.getByRole('heading', { name: 'Mon titre' });
      expect(heading.className).toContain('text-white');
    },
  );

  it('rend une pastille translucide autour de l\'icône (rounded-lg bg-white/20)', () => {
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
    const svg = link.querySelector('svg');
    const circle = svg?.parentElement;
    expect(circle).not.toBeNull();
    expect(circle?.className).toContain('rounded-lg');
    expect(circle?.className).toContain('bg-white/20');
    expect(circle?.className).toContain('w-9');
    expect(circle?.className).toContain('h-9');
  });

  it('rend les classes structurelles permanentes (rounded-xl, p-4, texte blanc)', () => {
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
    expect(link.className).toContain('rounded-xl');
    expect(link.className).toContain('p-4');
    expect(link.className).toContain('text-white');
    expect(link.className).not.toContain('border-l-[3px]');
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
    expect(link.className).toContain('rounded-xl');
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
